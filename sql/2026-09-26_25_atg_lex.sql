-- ATG Lex: base para expedientes, plazos, rutina, objetivos y métricas (2026-09-26). Se puede volver a correr sin problema.
--   1) expedientes: casos que no son de seguros (separados de pas_casos para que nunca aparezcan en el portal PAS).
--   2) plazos: plazos procesales y escritos pendientes, de un caso PAS o de un expediente.
--   3) dias_inhabiles: feria judicial y días inhábiles que no son feriado nacional (los feriados nacionales los trae la app).
--   4) pas_eventos (agenda): también puede ser de un expediente.
--   5) rutina: bloques/ítems, registro de lo tildado y días de escuela.
--   6) objetivos: del mes, trimestre, semestre y año; con métrica automática o para tildar a mano.
--   7) pas_casos.fecha_doc_completa: se completa sola cuando el caso sale de Documentación pendiente.
--      (Las fechas de Iniciado y Reclamado las completa la app al cambiar el estado, porque se editan a mano.)
--   8) pas_historial: canal, versión del mensaje y respuesta del PAS (embudo de prospección).
-- Todo lo nuevo es solo del administrador (política admin_todo con es_admin()).

-- 1) Expedientes ───────────────────────────────────────────────────────────
create table if not exists public.expedientes (
  id                     uuid primary key default gen_random_uuid(),
  caratula               text not null,
  fuero                  text,                  -- Civil y Comercial | Laboral | Familia | Penal | Contencioso Administrativo | Federal | Otro
  jurisdiccion           text,                  -- CABA | PBA | Federal
  juzgado                text,
  secretaria             text,
  numero                 text,                  -- número de expediente, ej. 12.345/2025
  estado                 text not null default 'activo'
                           check (estado in ('activo', 'paralizado', 'sentenciado', 'en_apelacion', 'finalizado', 'archivado')),
  fecha_inicio           date,
  cliente_nombre         text,
  cliente_dni            text,
  cliente_telefono       text,
  cliente_email          text,
  rol_cliente            text,                  -- actora | demandada | otro
  contraparte            text,
  letrado_contrario      text,
  honorarios_pactados    text,                  -- texto libre: "20% del resultado + consulta"
  honorarios_cobrados    numeric,
  proxima_accion         text,
  proxima_accion_vence   date,
  mensaje_cliente        text,
  mensaje_cliente_fecha  timestamptz,           -- la completa el trigger de abajo
  visible_cliente        boolean not null default false,
  codigo_cliente         text unique,           -- código para que el cliente entre con DNI + código (etapa 7)
  caso_pas_id            uuid references public.pas_casos(id) on delete set null,  -- si viene de un caso PAS que fue a juicio
  agenda_legal_id        text unique,           -- id en Agenda Legal, para la migración
  notas                  text,
  created_at             timestamptz not null default now()
);
create index if not exists expedientes_estado_idx on public.expedientes (estado);

create or replace function public.expedientes_fecha_mensaje()
returns trigger language plpgsql as $fn$
begin
  if coalesce(new.mensaje_cliente, '') != '' and
     ((tg_op = 'INSERT' and new.mensaje_cliente_fecha is null) or (tg_op = 'UPDATE' and new.mensaje_cliente is distinct from old.mensaje_cliente)) then
    new.mensaje_cliente_fecha := now();
  end if;
  return new;
end $fn$;
drop trigger if exists trg_expedientes_fecha_mensaje on public.expedientes;
create trigger trg_expedientes_fecha_mensaje
  before insert or update on public.expedientes
  for each row execute function public.expedientes_fecha_mensaje();

-- 2) Plazos y escritos ─────────────────────────────────────────────────────
create table if not exists public.plazos (
  id                  uuid primary key default gen_random_uuid(),
  caso_id             uuid references public.pas_casos(id) on delete cascade,
  expediente_id       uuid references public.expedientes(id) on delete cascade,
  tipo                text not null default 'plazo' check (tipo in ('plazo', 'escrito')),
  titulo              text not null,
  -- plazo procesal: desde la notificación, N días hábiles judiciales o corridos
  fecha_notificacion  date,
  dias                integer check (dias is null or dias > 0),
  computo             text not null default 'habiles' check (computo in ('habiles', 'corridos')),
  clase               text not null default 'fatal' check (clase in ('fatal', 'ordinatorio', 'propio')),
  vence               date,                     -- lo calcula la app (feriados + días inhábiles)
  -- escrito: fecha objetivo que elegís vos
  fecha_objetivo      date,
  estado              text not null default 'pendiente' check (estado in ('pendiente', 'cumplido')),
  cumplido_en         date,
  notas               text,
  created_at          timestamptz not null default now(),
  constraint plazos_de_un_caso check ((caso_id is null) <> (expediente_id is null))
);
create index if not exists plazos_pendientes_idx on public.plazos (estado, vence);

-- 3) Días inhábiles judiciales (feria y días declarados inhábiles) ─────────
create table if not exists public.dias_inhabiles (
  fecha         date not null,
  jurisdiccion  text not null default 'todas' check (jurisdiccion in ('todas', 'CABA', 'PBA', 'Federal')),
  motivo        text not null,                  -- "Feria judicial de enero", "Asueto", etc.
  primary key (fecha, jurisdiccion)
);
-- Feria de enero 2027 (todo el mes). La feria de invierno se carga cuando la fijen la Corte y la SCBA.
insert into public.dias_inhabiles (fecha, jurisdiccion, motivo)
select d::date, 'todas', 'Feria judicial de enero'
  from generate_series('2027-01-01'::date, '2027-01-31'::date, interval '1 day') d
on conflict do nothing;

-- 4) Agenda: un evento puede ser de un caso PAS o de un expediente ────────
alter table public.pas_eventos add column if not exists expediente_id uuid references public.expedientes(id) on delete cascade;
alter table public.pas_eventos alter column caso_id drop not null;
alter table public.pas_eventos drop constraint if exists pas_eventos_de_un_caso;
alter table public.pas_eventos add constraint pas_eventos_de_un_caso check ((caso_id is null) <> (expediente_id is null));

-- 5) Rutina ────────────────────────────────────────────────────────────────
create table if not exists public.rutina_items (
  id           uuid primary key default gen_random_uuid(),
  frecuencia   text not null check (frecuencia in ('diaria', 'semanal', 'mensual', 'evento')),
  bloque       text not null,                   -- "Arranque", "Siniestros con compañías", "Revisión semanal"...
  hora_inicio  time,
  hora_fin     time,
  dia          smallint,                        -- semanal: 1 = lunes … 7 = domingo · mensual: día del mes (0 = último día)
  titulo       text not null,                   -- el ítem que se tilda
  prioridad    text not null default 'importante' check (prioridad in ('imprescindible', 'importante', 'postergable')),
  acceso       text,                            -- acceso directo: 'pjn', 'mev', 'gmail', 'reclamos_quietos', 'dormidos'...
  orden        integer not null default 0,
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.rutina_registro (
  item_id   uuid not null references public.rutina_items(id) on delete cascade,
  fecha     date not null,                      -- día (o inicio de la semana / mes) en que se tildó
  hecho_en  timestamptz not null default now(),
  primary key (item_id, fecha)
);

create table if not exists public.dias_escuela (
  id            uuid primary key default gen_random_uuid(),
  desde         date not null,
  hasta         date not null,
  hora_entrada  time not null,
  hora_salida   time not null,
  incluye_fds   boolean not null default false,
  created_at    timestamptz not null default now(),
  check (hasta >= desde),
  check (hora_salida > hora_entrada)
);

-- 6) Objetivos ─────────────────────────────────────────────────────────────
create table if not exists public.objetivos (
  id          uuid primary key default gen_random_uuid(),
  periodo     text not null check (periodo in ('mes', 'trimestre', 'semestre', 'anio')),
  inicio      date not null,                    -- primer día del período
  titulo      text not null,
  metrica     text,                             -- vacío = se tilda a mano; si no: 'pas_contactados', 'pas_activos', 'honorarios_cobrados'...
  meta        numeric,
  sentido     text not null default 'subir' check (sentido in ('subir', 'bajar')),
  hecho       boolean not null default false,   -- solo para los que se tildan a mano
  orden       integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists objetivos_periodo_idx on public.objetivos (periodo, inicio);

-- 7) Casos PAS: fecha de documentación completa ───────────────────────────
alter table public.pas_casos add column if not exists fecha_doc_completa date;

create or replace function public.pas_casos_fechas_estado()
returns trigger language plpgsql as $fn$
declare hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  -- No se edita a mano: si un guardado viejo la manda vacía, se conserva la que había.
  if new.fecha_doc_completa is null and old.fecha_doc_completa is not null then
    new.fecha_doc_completa := old.fecha_doc_completa;
  end if;
  if new.fecha_doc_completa is null and old.estado = 'doc_pendiente'
     and new.estado is distinct from 'doc_pendiente' and new.estado is distinct from 'desistido' then
    new.fecha_doc_completa := hoy;
  end if;
  return new;
end $fn$;
drop trigger if exists trg_pas_casos_fechas_estado on public.pas_casos;
create trigger trg_pas_casos_fechas_estado
  before update on public.pas_casos
  for each row execute function public.pas_casos_fechas_estado();

-- 8) Prospección: canal, versión del mensaje y respuesta ───────────────────
alter table public.pas_historial add column if not exists canal text check (canal is null or canal in ('whatsapp', 'mail', 'otro'));
alter table public.pas_historial add column if not exists version_mensaje text;
alter table public.pas_historial add column if not exists respuesta text
  check (respuesta is null or respuesta in ('respondio', 'interesado', 'no_interesado'));
alter table public.pas_historial add column if not exists respuesta_fecha date;

-- Seguridad: todo lo nuevo, solo el administrador ──────────────────────────
do $$
declare t text;
begin
  foreach t in array array['expedientes', 'plazos', 'dias_inhabiles', 'rutina_items', 'rutina_registro', 'dias_escuela', 'objetivos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists admin_todo on public.%I', t);
    execute format('create policy admin_todo on public.%I for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()))', t);
  end loop;
end $$;

-- Control
select (select count(*) from information_schema.tables
         where table_schema = 'public'
           and table_name in ('expedientes', 'plazos', 'dias_inhabiles', 'rutina_items', 'rutina_registro', 'dias_escuela', 'objetivos')) as tablas_nuevas_7,
       (select count(*) from pg_policies
         where schemaname = 'public'
           and tablename in ('expedientes', 'plazos', 'dias_inhabiles', 'rutina_items', 'rutina_registro', 'dias_escuela', 'objetivos')) as politicas_7,
       (select count(*) from information_schema.columns
         where table_name = 'pas_historial' and column_name in ('canal', 'version_mensaje', 'respuesta', 'respuesta_fecha')) as columnas_prospeccion_4,
       (select count(*) from information_schema.columns
         where table_name = 'pas_casos' and column_name = 'fecha_doc_completa') as doc_completa_1,
       (select count(*) from public.dias_inhabiles) as dias_feria_31;

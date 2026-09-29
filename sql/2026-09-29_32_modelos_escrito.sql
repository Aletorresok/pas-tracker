-- SQL 32 · Modelos de escritos con variables (2026-09-29, fase 2 del plan de funciones).
-- Se puede volver a correr sin problema. Son TRES archivos, en orden: 32 (este: tablas), 32b y 32c (los 9 modelos base).
-- Están separados para que ninguno pase de 100 líneas.
--
-- 1) modelos_escrito: plantillas propias (reclamo, reiteración, aceptación, intimación, mediación, judiciales...).
--    Sintaxis del cuerpo (la interpreta src/utils/plantillas.js):
--      {{asegurado}}, {{compania.razon_social}}, {{hoy_largo}}...  → variable (ver docs/plan-funciones/PLAN.md, "Variables")
--      {{? monto_ofrecido | Monto ofrecido | monto}}                → pregunta al generar (clave | etiqueta | tipo texto|monto|fecha)
--      {{#si nro_siniestro}} ... {{/si}}                            → el bloque aparece solo si la variable tiene valor
--      # Título   /   **negrita**   /   1. ítem de lista            → formato mínimo para el PDF/Word
-- 2) escritos_generados: historial (qué modelo, para qué caso/expediente, texto final). Se ve en la Bitácora.
-- 3) pas_ajustes 'estudio': datos del abogado que hoy están fijos en generarEscrito.js.
-- Todo solo administrador (es_admin()).

create table if not exists public.modelos_escrito (
  id          uuid primary key default gen_random_uuid(),
  clave       text unique,                          -- id estable de los modelos base (para no duplicarlos al re-correr)
  titulo      text not null,
  categoria   text not null default 'otro'
                check (categoria in ('reclamo', 'seguimiento', 'acuerdo', 'intimacion', 'mediacion', 'judicial', 'cliente', 'otro')),
  ambito      text not null default 'caso' check (ambito in ('caso', 'expediente', 'ambos')),
  cuerpo      text not null default '',
  firma       text not null default 'estudio' check (firma in ('estudio', 'cliente', 'ambos', 'ninguna')),
  membrete    boolean not null default true,        -- pie con logo (pdfMembrete.js)
  orden       integer not null default 100,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists modelos_escrito_cat_idx on public.modelos_escrito (categoria, orden);

create or replace function public.tocar_updated_at() returns trigger language plpgsql as $fn$
begin new.updated_at := now(); return new; end $fn$;
drop trigger if exists trg_modelos_updated on public.modelos_escrito;
create trigger trg_modelos_updated before update on public.modelos_escrito
  for each row execute function public.tocar_updated_at();

create table if not exists public.escritos_generados (
  id             uuid primary key default gen_random_uuid(),
  modelo_id      uuid references public.modelos_escrito(id) on delete set null,
  caso_id        uuid references public.pas_casos(id) on delete cascade,
  expediente_id  uuid references public.expedientes(id) on delete cascade,
  titulo         text not null,
  cuerpo_final   text not null,                     -- texto ya completado (lo que salió en el PDF/Word)
  respuestas     jsonb not null default '{}'::jsonb, -- lo que se contestó en las preguntas {{? ...}}
  formato        text not null default 'pdf' check (formato in ('pdf', 'docx', 'texto')),
  archivo        text,                               -- nombre del archivo guardado en la carpeta
  created_at     timestamptz not null default now(),
  check (caso_id is null or expediente_id is null)
);
create index if not exists escritos_generados_caso_idx on public.escritos_generados (caso_id, created_at desc);
create index if not exists escritos_generados_exp_idx  on public.escritos_generados (expediente_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['modelos_escrito', 'escritos_generados'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists admin_todo on public.%I', t);
    execute format('create policy admin_todo on public.%I for all to authenticated
                      using ((select public.es_admin())) with check ((select public.es_admin()))', t);
  end loop;
end $$;

-- 3) Datos del estudio (hoy fijos en src/utils/generarEscrito.js)
insert into public.pas_ajustes (clave, valor) values ('estudio', jsonb_build_object(
  'abogado',     'Alexis Torres Gaveglio',
  'matriculas',  'T°142 F°636 C.P.A.C.F y al L° IV F° 20 del C.A.M.G.R',
  'condicion_fiscal', 'responsable monotributo',
  'cuit',        '20-39340318-8',
  'domicilio',   'Pte. Saenz Peña 943, Depto 76 piso 7, CABA',
  'mail',        '',
  'telefono',    ''
)) on conflict (clave) do nothing;

-- Control: tiene que dar tablas_2 = 2 y estudio_1 = 1
select (select count(*) from information_schema.tables where table_name in ('modelos_escrito', 'escritos_generados')) as tablas_2,
       (select count(*) from public.pas_ajustes where clave = 'estudio') as estudio_1;

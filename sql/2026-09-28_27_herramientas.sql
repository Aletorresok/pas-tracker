-- SQL 27 · Herramientas (2026-09-28). Se puede volver a correr sin problema.
--   1) indices: series para la calculadora de intereses (se cargan desde la app).
--   2) Domicilios de compañías y asegurados: la carta documento los completa sola la próxima vez.
--   3) modelos_carta: modelos de texto propios para la carta documento.
--   4) pas_ajustes: preferencias del estudio (por ahora, los datos de remitente para las cartas).
-- Todo es solo del administrador (política admin_todo con es_admin()).

-- 1) Índices ───────────────────────────────────────────────────────────────
--   ipc             → variación mensual en % (fecha = primer día del mes)
--   icl             → valor diario del Índice para Contratos de Locación (BCRA)
--   tasa_activa_bna → TNA en % vigente desde esa fecha (tasa activa cartera general del Banco Nación)
create table if not exists public.indices (
  serie        text not null check (serie in ('ipc', 'icl', 'tasa_activa_bna')),
  fecha        date not null,
  valor        numeric not null,
  actualizado  timestamptz not null default now(),
  primary key (serie, fecha)
);

-- 2) Domicilios ────────────────────────────────────────────────────────────
alter table public.pas_companias add column if not exists domicilio text;
alter table public.pas_companias add column if not exists cp text;
alter table public.pas_companias add column if not exists localidad text;
alter table public.pas_companias add column if not exists provincia text;

alter table public.pas_casos add column if not exists domicilio_asegurado text;
alter table public.pas_casos add column if not exists cp_asegurado text;
alter table public.pas_casos add column if not exists localidad_asegurado text;
alter table public.pas_casos add column if not exists provincia_asegurado text;

-- 3) Modelos de carta ──────────────────────────────────────────────────────
create table if not exists public.modelos_carta (
  id      uuid primary key default gen_random_uuid(),
  titulo  text not null,
  texto   text not null,
  creado  timestamptz not null default now()
);

-- 4) Ajustes del estudio ───────────────────────────────────────────────────
create table if not exists public.pas_ajustes (
  clave        text primary key,
  valor        jsonb not null,
  actualizado  timestamptz not null default now()
);

-- Seguridad ────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['indices', 'modelos_carta', 'pas_ajustes'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists admin_todo on public.%I', t);
    execute format('create policy admin_todo on public.%I for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()))', t);
  end loop;
end $$;

-- Control: 3 tablas, 3 políticas y 8 columnas de domicilio
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('indices', 'modelos_carta', 'pas_ajustes')) as tablas_3,
       (select count(*) from pg_policies where tablename in ('indices', 'modelos_carta', 'pas_ajustes')) as politicas_3,
       (select count(*) from information_schema.columns where table_schema = 'public'
         and ((table_name = 'pas_companias' and column_name in ('domicilio', 'cp', 'localidad', 'provincia'))
           or (table_name = 'pas_casos' and column_name in ('domicilio_asegurado', 'cp_asegurado', 'localidad_asegurado', 'provincia_asegurado')))) as columnas_8;

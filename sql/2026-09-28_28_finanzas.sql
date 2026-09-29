-- SQL 28 · Finanzas (2026-09-28). Se puede volver a correr sin problema.
--   1) gastos: gastos del estudio (matrícula, aportes, mediaciones, cartas documento...), opcionalmente de un caso
--      o de un expediente. "recurrente" = se repite todos los meses desde `fecha` hasta `hasta` (vacío = sin fin).
--   2) pas_casos.nro_factura: número de la factura de tus honorarios.
--   3) pas_casos.hilo_gmail: link a la conversación de Gmail con la compañía, para abrirla desde el caso.
-- Todo lo nuevo es solo del administrador (política admin_todo con es_admin()).

-- 1) Gastos ────────────────────────────────────────────────────────────────
create table if not exists public.gastos (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null,
  categoria      text not null default 'otros',   -- matricula | aportes | mediaciones | cartas | tasas | movilidad | software | otros
  descripcion    text,
  monto          numeric not null check (monto >= 0),
  recurrente     boolean not null default false,
  hasta          date,                            -- último mes de un gasto recurrente (vacío = sigue)
  caso_id        uuid references public.pas_casos(id) on delete set null,
  expediente_id  uuid references public.expedientes(id) on delete set null,
  created_at     timestamptz not null default now(),
  check (hasta is null or hasta >= fecha)
);
create index if not exists gastos_fecha_idx on public.gastos (fecha);
create index if not exists gastos_caso_idx on public.gastos (caso_id);

alter table public.gastos enable row level security;
drop policy if exists admin_todo on public.gastos;
create policy admin_todo on public.gastos for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- 2) y 3) Casos PAS ────────────────────────────────────────────────────────
alter table public.pas_casos add column if not exists nro_factura text;
alter table public.pas_casos add column if not exists hilo_gmail text;

-- Control
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'gastos') as tabla_gastos_1,
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'gastos') as politica_1,
       (select count(*) from information_schema.columns
         where table_name = 'pas_casos' and column_name in ('nro_factura', 'hilo_gmail')) as columnas_casos_2;

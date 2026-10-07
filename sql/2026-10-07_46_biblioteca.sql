-- SQL 46 · Biblioteca: jurisprudencia, doctrina y normas (2026-10-07).
-- Se puede volver a correr sin problema. Después, cargar los datos con datos_2026-10-07_biblioteca_*.sql (en orden).
--
-- Una sola tabla para los tres tipos: el buscador y los filtros son los mismos.
--   · fallo:    titulo = carátula; tribunal, sala, fecha, jurisdiccion, fuero, resultado
--   · doctrina: titulo = título del trabajo; autor, publicacion, anio, acceso
--   · norma:    titulo = norma; articulos
-- "clave" identifica cada registro del relevamiento (docs/biblioteca/) para no cargarlo dos veces.

create table if not exists public.biblioteca (
  id               uuid primary key default gen_random_uuid(),
  tipo             text not null check (tipo in ('fallo', 'doctrina', 'norma')),
  titulo           text not null,
  autor            text,
  tribunal         text,
  sala             text,
  fecha            date,
  anio             integer,
  jurisdiccion     text,                     -- Nacional | PBA | CSJN | CABA
  fuero            text,
  publicacion      text,
  articulos        text,
  temas            text[] not null default '{}',
  resultado        text check (resultado is null or resultado in ('a favor', 'en contra', 'mixto')),
  sumario          text,                     -- sumario del fallo, resumen de la doctrina o texto breve de la norma
  sumario_oficial  boolean not null default false,
  url              text,
  acceso           text check (acceso is null or acceso in ('abierto', 'pago')),
  verificado_el    date,
  origen           text not null default 'manual' check (origen in ('relevamiento', 'manual')),
  notas            text,                     -- notas propias (para qué lo usaste, en qué caso)
  favorito         boolean not null default false,
  clave            text unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists biblioteca_tipo_idx on public.biblioteca (tipo, fecha desc);
create index if not exists biblioteca_temas_idx on public.biblioteca using gin (temas);

drop trigger if exists trg_biblioteca_updated on public.biblioteca;
create trigger trg_biblioteca_updated before update on public.biblioteca
  for each row execute function public.tocar_updated_at();

alter table public.biblioteca enable row level security;
drop policy if exists admin_todo on public.biblioteca;
create policy admin_todo on public.biblioteca for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Control: tiene que dar 1 y true
select (select count(*) from information_schema.tables where table_name = 'biblioteca') as tabla_1,
       (select relrowsecurity from pg_class where relname = 'biblioteca') as rls_activo;

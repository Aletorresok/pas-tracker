-- Historial de ofertas y contactos en la compañía (2026-09-26). Tres tablas nuevas; no toca datos existentes.
-- Solo las ve y edita el administrador (el PAS y el cliente no tienen acceso): la negociación y los datos
-- del liquidador quedan internos. El PAS sigue viendo solo el monto del último ofrecimiento (pas_casos.monto_ofrecimiento).
-- Se puede volver a correr sin problema.

-- 1) Cada ofrecimiento de la compañía y qué se respondió
create table if not exists public.pas_ofertas (
  id           uuid primary key default gen_random_uuid(),
  caso_id      uuid not null references public.pas_casos(id) on delete cascade,
  fecha        date not null default current_date,
  monto        numeric not null check (monto > 0),
  respuesta    text not null default 'pendiente' check (respuesta in ('pendiente', 'rechazada', 'contraoferta', 'aceptada')),
  contraoferta numeric,
  nota         text,
  creado       timestamptz not null default now()
);
create index if not exists pas_ofertas_caso on public.pas_ofertas (caso_id, fecha);

-- 2) Quién lleva el siniestro en la compañía (liquidador / analista), por caso
create table if not exists public.pas_caso_contactos (
  caso_id      uuid primary key references public.pas_casos(id) on delete cascade,
  nombre       text,
  telefono     text,
  mail         text,
  notas        text,
  actualizado  timestamptz not null default now()
);

-- 3) Directorio de compañías: mail y teléfono de siniestros de terceros (sirve para todos sus casos)
create table if not exists public.pas_companias (
  compania     text primary key,           -- tal cual en pas_casos.compania_aseguradora
  mail         text,
  telefono     text,
  notas        text
);

-- Permisos: solo administrador
alter table public.pas_ofertas enable row level security;
alter table public.pas_caso_contactos enable row level security;
alter table public.pas_companias enable row level security;

drop policy if exists admin_todo on public.pas_ofertas;
create policy admin_todo on public.pas_ofertas
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
drop policy if exists admin_todo on public.pas_caso_contactos;
create policy admin_todo on public.pas_caso_contactos
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
drop policy if exists admin_todo on public.pas_companias;
create policy admin_todo on public.pas_companias
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- Control: las tres tablas con su política
select tablename, count(*) as politicas from pg_policies
 where schemaname = 'public' and tablename in ('pas_ofertas', 'pas_caso_contactos', 'pas_companias')
 group by tablename;

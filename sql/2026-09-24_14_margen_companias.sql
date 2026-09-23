-- Margen de "reclamo quieto" por compañía: cuántos días sin respuesta antes de avisarte para reiterar.
-- La fila '*' es el margen general (si no existe, la app usa 14 días).
-- Crea una tabla nueva; no toca datos existentes. Se puede volver a correr sin problema.

create table if not exists public.pas_margen_companias (
  compania  text primary key,                          -- nombre tal cual en pas_casos.compania_aseguradora, o '*'
  dias      integer not null check (dias between 1 and 365)
);
alter table public.pas_margen_companias enable row level security;
drop policy if exists admin_todo on public.pas_margen_companias;
create policy admin_todo on public.pas_margen_companias
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

insert into public.pas_margen_companias (compania, dias) values ('*', 14) on conflict (compania) do nothing;

-- Control
select * from public.pas_margen_companias;

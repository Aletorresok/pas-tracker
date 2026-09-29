-- SQL 30 · Directorio de compañías (pestaña Compañías)
-- Correr a mano en el SQL Editor de Supabase. Se puede correr más de una vez.
--
-- pas_companias pasa a ser la ficha única de cada compañía:
--   · datos fiscales: razón social y CUIT
--   · domicilio legal (escritos): legal_domicilio, legal_cp, legal_localidad, legal_provincia
--   · domicilio para notificar (cartas documento): las columnas que ya existían domicilio, cp, localidad, provincia (SQL 27)
--   · contacto general: mail y teléfono (ya existían)
-- pas_compania_contactos: varios contactos por compañía (siniestros, estudio gestor, analista, mediación...).

alter table public.pas_companias add column if not exists razon_social text;
alter table public.pas_companias add column if not exists cuit text;
alter table public.pas_companias add column if not exists legal_domicilio text;
alter table public.pas_companias add column if not exists legal_cp text;
alter table public.pas_companias add column if not exists legal_localidad text;
alter table public.pas_companias add column if not exists legal_provincia text;

create table if not exists public.pas_compania_contactos (
  id         uuid primary key default gen_random_uuid(),
  compania   text not null references public.pas_companias(compania) on update cascade on delete cascade,
  tipo       text not null default 'siniestros',   -- siniestros | estudio | analista | mediacion | facturacion | otro
  nombre     text,
  mail       text,
  telefono   text,
  notas      text,
  creado     timestamptz not null default now()
);
create index if not exists pas_compania_contactos_compania on public.pas_compania_contactos (compania);

-- Permisos: solo administrador (igual que el resto de las tablas del estudio)
alter table public.pas_compania_contactos enable row level security;
drop policy if exists admin_todo on public.pas_compania_contactos;
create policy admin_todo on public.pas_compania_contactos
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- Control: columnas nuevas (6) y la tabla de contactos con su política (1)
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'pas_companias'
      and column_name in ('razon_social', 'cuit', 'legal_domicilio', 'legal_cp', 'legal_localidad', 'legal_provincia')) as columnas_nuevas,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'pas_compania_contactos') as politicas_contactos;

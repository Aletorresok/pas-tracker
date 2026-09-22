-- ============================================================
-- BACKUP completo antes de las migraciones del 2026-09-22
-- Correr en Supabase → SQL Editor. Crea copias de todas las tablas
-- en el esquema "backup_20260922" (no toca las tablas originales).
-- ============================================================

create schema if not exists backup_20260922;

create table backup_20260922.pas_casos         as table public.pas_casos;
create table backup_20260922.acciones          as table public.acciones;
create table backup_20260922.pas_contactos     as table public.pas_contactos;
create table backup_20260922.pas_historial     as table public.pas_historial;
create table backup_20260922.pas_derivadores   as table public.pas_derivadores;
create table backup_20260922.pas_descartados   as table public.pas_descartados;
create table backup_20260922.pas_recordatorios as table public.pas_recordatorios;
create table backup_20260922.pas_manuales      as table public.pas_manuales;
create table backup_20260922.pas_lista         as table public.pas_lista;
create table backup_20260922.pas_portal_users  as table public.pas_portal_users;
create table backup_20260922.casos             as table public.casos;
create table backup_20260922.aseguradoras      as table public.aseguradoras;
create table backup_20260922.gestiones_judiciales as table public.gestiones_judiciales;

-- El esquema backup no queda expuesto por la API (solo "public" lo está).

-- Verificación: la cantidad de filas tiene que coincidir en cada par.
select 'pas_casos' t, (select count(*) from public.pas_casos) original, (select count(*) from backup_20260922.pas_casos) backup
union all select 'acciones', (select count(*) from public.acciones), (select count(*) from backup_20260922.acciones)
union all select 'pas_contactos', (select count(*) from public.pas_contactos), (select count(*) from backup_20260922.pas_contactos)
union all select 'pas_historial', (select count(*) from public.pas_historial), (select count(*) from backup_20260922.pas_historial)
union all select 'pas_manuales', (select count(*) from public.pas_manuales), (select count(*) from backup_20260922.pas_manuales);

-- ── RESTAURAR una tabla (solo si algo sale mal) ─────────────
-- begin;
--   delete from public.pas_casos;
--   insert into public.pas_casos select * from backup_20260922.pas_casos;
-- commit;
-- (si la tabla cambió de columnas, listar las columnas explícitamente)

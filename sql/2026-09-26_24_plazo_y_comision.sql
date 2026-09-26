-- Plazo de pago por compañía y % de comisión por PAS (2026-09-26). Se puede volver a correr sin problema.
--   1) pas_companias.plazo_pago_dias: días que suele tener la compañía para pagar desde la aceptación/firma.
--      Se copia solo al caso (pas_casos.plazo_pago) cuando el caso no tiene plazo cargado.
--   2) pas_comisiones: % de comisión de cada PAS sobre tus honorarios. Sin fila (o vacío) = ese PAS no cobra comisión.
--      Solo administrador (el PAS no la ve desde el portal).

alter table public.pas_companias add column if not exists plazo_pago_dias integer check (plazo_pago_dias is null or plazo_pago_dias between 1 and 365);

create table if not exists public.pas_comisiones (
  pas_id  text primary key,          -- id del PAS (pas_contactos.id o pas_manuales.id), como texto
  pct     numeric not null check (pct > 0 and pct <= 100)
);
alter table public.pas_comisiones enable row level security;
drop policy if exists admin_todo on public.pas_comisiones;
create policy admin_todo on public.pas_comisiones
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- Control
select (select count(*) from information_schema.columns where table_name = 'pas_companias' and column_name = 'plazo_pago_dias') as columna_plazo,
       (select count(*) from pg_policies where tablename = 'pas_comisiones') as politica_comisiones;

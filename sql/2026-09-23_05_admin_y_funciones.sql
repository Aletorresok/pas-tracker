-- Seguridad, paso 1 de 2: prepara lo necesario SIN cambiar permisos todavía.
-- No afecta a la app actual. Se puede volver a correr sin problema.

-- 1) Quién es administrador (vos). RLS activado y sin políticas: nadie la lee desde afuera.
create table if not exists public.pas_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.pas_admins enable row level security;

insert into public.pas_admins (user_id)
select id from auth.users where lower(email) = 'atglexsolutions@gmail.com'
on conflict do nothing;

-- 2) ¿El usuario conectado es administrador?
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from pas_admins where user_id = auth.uid())
$fn$;
grant execute on function public.es_admin() to anon, authenticated;

-- 3) ¿Qué PAS es el usuario conectado del portal? (texto, porque los ids no tienen el mismo tipo en todas las tablas)
create or replace function public.mi_pas_id()
returns text language sql stable security definer set search_path = public as $fn$
  select pas_id::text from pas_portal_users where user_id::text = auth.uid()::text limit 1
$fn$;
revoke all on function public.mi_pas_id() from public;
grant execute on function public.mi_pas_id() to authenticated;

-- 4) "Plazos por compañía" del portal: solo fechas y montos por compañía, sin nombres ni patentes
create or replace function public.plazos_companias()
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
           'compania_aseguradora', compania_aseguradora,
           'fecha_inicio_reclamo', fecha_inicio_reclamo,
           'fecha_ofrecimiento', fecha_ofrecimiento,
           'fecha_cobro', fecha_cobro,
           'monto_cobro_asegurado', monto_cobro_asegurado,
           'monto_reclamado', monto_reclamado)), '[]'::jsonb)
    from pas_casos
   where auth.uid() is not null
$fn$;
revoke all on function public.plazos_companias() from public;
grant execute on function public.plazos_companias() to authenticated;

-- 5) Control: tiene que decir 1 (tu usuario quedó como administrador)
select count(*) as administradores from public.pas_admins;

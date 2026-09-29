-- SQL 34 · Calendario suscribible (feed .ics para Google Calendar / celular) (2026-09-29, fase 4).
-- Se puede volver a correr sin problema. Después: desplegar la función calendario SIN verificación de JWT.
--
-- Cómo funciona: la función de Supabase "calendario" (supabase/functions/calendario/index.ts) responde
--   GET https://<proyecto>.supabase.co/functions/v1/calendario?t=<token>
-- con un archivo iCalendar con: mediaciones/audiencias/reuniones (pas_eventos), plazos pendientes (todo el día,
-- con alarma) y, si se elige, las próximas acciones con fecha. Google Calendar se suscribe a esa URL
-- ("Otros calendarios → Desde URL") y la relee sola (Google tarda entre 8 y 24 h en refrescar).
-- El token es el único secreto: se puede regenerar desde la app y el link viejo deja de andar.

create table if not exists public.calendario_tokens (
  token        text primary key default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  nombre       text not null default 'Mi calendario',
  incluir      jsonb not null default '{"eventos": true, "plazos": true, "acciones": false, "escritos": false}'::jsonb,
  activo       boolean not null default true,
  creado       timestamptz not null default now(),
  ultimo_uso   timestamptz                              -- lo actualiza la función (para saber si Google lo está leyendo)
);

alter table public.calendario_tokens enable row level security;
drop policy if exists admin_todo on public.calendario_tokens;
create policy admin_todo on public.calendario_tokens for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Regenerar: apaga los anteriores y devuelve uno nuevo
create or replace function public.nuevo_token_calendario(p_incluir jsonb default null)
returns text language plpgsql security definer set search_path = public as $fn$
declare v text;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  update calendario_tokens set activo = false where activo;
  insert into calendario_tokens (incluir)
  values (coalesce(p_incluir, '{"eventos": true, "plazos": true, "acciones": false, "escritos": false}'::jsonb))
  returning token into v;
  return v;
end $fn$;
revoke all on function public.nuevo_token_calendario(jsonb) from public, anon;
grant execute on function public.nuevo_token_calendario(jsonb) to authenticated;

-- Control
select (select count(*) from information_schema.tables where table_name = 'calendario_tokens') as tabla_1;

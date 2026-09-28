-- SQL 26 · Papelera de casos (2026-09-28). Se puede volver a correr sin problema.
--   Al eliminar un caso se guarda una copia completa (caso, bitácora, agenda, ofertas, contacto en la compañía,
--   plazos, documentación del cliente y expedientes vinculados) en pas_papelera, y recién ahí se borra.
--   Todo en una sola operación: o sale completo o no pasa nada (antes se podía perder la bitácora si fallaba).
--   Desde la app se recupera tal cual estaba (mismo id). Lo que tenga más de 30 días se borra solo cada mañana.

-- 1) Tabla ────────────────────────────────────────────────────────────────
create table if not exists public.pas_papelera (
  id            uuid primary key default gen_random_uuid(),
  caso_id       uuid not null,
  pas_id        text,
  asegurado     text,
  patente       text,
  compania      text,
  datos         jsonb not null,   -- { caso, acciones, eventos, ofertas, contactos, plazos, subidas, expedientes }
  eliminado_en  timestamptz not null default now()
);
create index if not exists pas_papelera_eliminado_idx on public.pas_papelera (eliminado_en desc);

-- La app solo la lee; guardar y sacar lo hacen las funciones de abajo
grant select on public.pas_papelera to authenticated;
alter table public.pas_papelera enable row level security;
drop policy if exists admin_todo on public.pas_papelera;
create policy admin_todo on public.pas_papelera for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- 2) Reinsertar filas guardadas como jsonb, solo con las columnas que existen hoy
--    (si después se agrega una columna con valor por defecto, la toma; si se borra una, la ignora).
create or replace function public._papelera_reinsertar(p_tabla text, p_filas jsonb)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_cols text;
begin
  if p_filas is null or jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) = 0 then return; end if;
  select string_agg(quote_ident(c.column_name), ', ') into v_cols
    from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = p_tabla and c.is_generated = 'NEVER'
     and c.column_name in (select jsonb_object_keys(p_filas -> 0));
  if v_cols is null then return; end if;
  execute format('insert into public.%I (%s) overriding system value select %s from jsonb_populate_recordset(null::public.%I, $1)',
                 p_tabla, v_cols, v_cols, p_tabla) using p_filas;
end $fn$;
revoke all on function public._papelera_reinsertar(text, jsonb) from public, anon, authenticated;

-- 3) Eliminar: copia a la papelera y borra. Devuelve el id de la papelera (para "Deshacer").
create or replace function public.eliminar_caso(p_caso_id uuid)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  v_caso public.pas_casos;
  v_id   uuid;
begin
  if not public.es_admin() then raise exception 'Solo el administrador puede eliminar casos'; end if;
  select * into v_caso from public.pas_casos where id = p_caso_id;
  if not found then raise exception 'El caso ya no existe'; end if;

  insert into public.pas_papelera (caso_id, pas_id, asegurado, patente, compania, datos)
  values (p_caso_id, v_caso.pas_id::text, v_caso.asegurado, v_caso.patente, v_caso.compania_aseguradora,
    jsonb_build_object(
      'caso',        to_jsonb(v_caso),
      'acciones',    coalesce((select jsonb_agg(to_jsonb(x)) from public.acciones x where x.caso_id::text = p_caso_id::text), '[]'::jsonb),
      'eventos',     coalesce((select jsonb_agg(to_jsonb(x)) from public.pas_eventos x where x.caso_id = p_caso_id), '[]'::jsonb),
      'ofertas',     coalesce((select jsonb_agg(to_jsonb(x)) from public.pas_ofertas x where x.caso_id = p_caso_id), '[]'::jsonb),
      'contactos',   coalesce((select jsonb_agg(to_jsonb(x)) from public.pas_caso_contactos x where x.caso_id = p_caso_id), '[]'::jsonb),
      'plazos',      coalesce((select jsonb_agg(to_jsonb(x)) from public.plazos x where x.caso_id = p_caso_id), '[]'::jsonb),
      'subidas',     coalesce((select jsonb_agg(to_jsonb(x)) from public.pas_subidas_cliente x where x.caso_id = p_caso_id), '[]'::jsonb),
      'expedientes', coalesce((select jsonb_agg(x.id) from public.expedientes x where x.caso_pas_id = p_caso_id), '[]'::jsonb)))
  returning id into v_id;

  -- La bitácora no tiene clave foránea: se borra a mano. El resto se borra en cascada con el caso.
  delete from public.acciones where caso_id::text = p_caso_id::text;
  delete from public.pas_casos where id = p_caso_id;
  return v_id;
end $fn$;
revoke all on function public.eliminar_caso(uuid) from public, anon;
grant execute on function public.eliminar_caso(uuid) to authenticated;

-- 4) Recuperar: vuelve a crear todo como estaba y lo saca de la papelera. Devuelve el caso.
create or replace function public.restaurar_caso(p_papelera_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v public.pas_papelera;
  v_caso jsonb;
begin
  if not public.es_admin() then raise exception 'Solo el administrador puede recuperar casos'; end if;
  select * into v from public.pas_papelera where id = p_papelera_id;
  if not found then raise exception 'Ese caso ya no está en la papelera'; end if;
  if exists (select 1 from public.pas_casos where id = v.caso_id) then raise exception 'El caso ya existe'; end if;

  -- Que el aviso de "caso nuevo del portal" no salga por una recuperación (ver el trigger de abajo)
  perform set_config('atg.restaurando', '1', true);

  perform public._papelera_reinsertar('pas_casos',           jsonb_build_array(v.datos -> 'caso'));
  perform public._papelera_reinsertar('acciones',            v.datos -> 'acciones');
  perform public._papelera_reinsertar('pas_eventos',         v.datos -> 'eventos');
  perform public._papelera_reinsertar('pas_ofertas',         v.datos -> 'ofertas');
  perform public._papelera_reinsertar('pas_caso_contactos',  v.datos -> 'contactos');
  perform public._papelera_reinsertar('plazos',              v.datos -> 'plazos');
  perform public._papelera_reinsertar('pas_subidas_cliente', v.datos -> 'subidas');
  update public.expedientes set caso_pas_id = v.caso_id
   where caso_pas_id is null
     and id in (select (jsonb_array_elements_text(coalesce(v.datos -> 'expedientes', '[]'::jsonb)))::uuid);

  delete from public.pas_papelera where id = p_papelera_id;
  select to_jsonb(c) into v_caso from public.pas_casos c where c.id = v.caso_id;
  return v_caso;
end $fn$;
revoke all on function public.restaurar_caso(uuid) from public, anon;
grant execute on function public.restaurar_caso(uuid) to authenticated;

-- 5) El aviso push de "caso nuevo del portal" (SQL 18) no sale al recuperar un caso
do $$
begin
  if exists (select 1 from pg_proc where proname = 'avisar_notificar' and pronamespace = 'public'::regnamespace) then
    drop trigger if exists aviso_caso_nuevo on public.pas_casos;
    create trigger aviso_caso_nuevo after insert on public.pas_casos
      for each row when (new.origen = 'portal' and coalesce(current_setting('atg.restaurando', true), '') <> '1')
      execute function public.avisar_notificar();
  end if;
end $$;

-- 6) Vaciar lo que tenga más de 30 días: todos los días a las 4:00 hs Argentina (7:00 UTC)
create extension if not exists pg_cron;
select cron.unschedule('vaciar_papelera') where exists (select 1 from cron.job where jobname = 'vaciar_papelera');
select cron.schedule('vaciar_papelera', '0 7 * * *',
  $cron$ delete from public.pas_papelera where eliminado_en < now() - interval '30 days' $cron$);

-- Control: 1 tabla, 1 política, 2 funciones y 1 tarea
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'pas_papelera') as tabla,
       (select count(*) from pg_policies where tablename = 'pas_papelera') as politica,
       (select count(*) from pg_proc where proname in ('eliminar_caso', 'restaurar_caso')) as funciones,
       (select count(*) from cron.job where jobname = 'vaciar_papelera') as tarea;

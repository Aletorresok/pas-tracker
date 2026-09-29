-- SQL 31 · Auditoría de cambios (2026-09-29, fase 1 del plan de funciones).
-- Se puede volver a correr sin problema. La app muestra el resultado en Bitácora → "Cambios de datos".
--
-- Qué hace: cada INSERT / UPDATE / DELETE en las tablas importantes deja una fila en `auditoria` con
-- SOLO los campos que cambiaron ({campo: [antes, después]}), quién lo hizo y cuándo.
--   · Un UPDATE que no cambia nada (el autoguardado reenvía el caso entero) no deja rastro.
--   · La app solo puede LEER (administrador). Nadie puede editar ni borrar desde la app: es inalterable.
--   · Se guarda la fila completa en los DELETE, para poder reconstruir lo borrado.
--   · Limpieza automática de lo que tenga más de 18 meses (cron, si pg_cron está activo).

create table if not exists public.auditoria (
  id         bigint generated always as identity primary key,
  tabla      text        not null,
  fila_id    text        not null,
  operacion  text        not null check (operacion in ('INSERT', 'UPDATE', 'DELETE')),
  cambios    jsonb       not null default '{}'::jsonb, -- UPDATE: {campo: [antes, despues]} · INSERT/DELETE: fila completa
  usuario    uuid,                                     -- auth.uid(); vacío = sistema (cron, función)
  rol        text        not null default 'sistema',   -- admin | pas | cliente | sistema
  en         timestamptz not null default now()
);
create index if not exists auditoria_fila_idx on public.auditoria (tabla, fila_id, en desc);
create index if not exists auditoria_en_idx   on public.auditoria (en desc);

alter table public.auditoria enable row level security;
drop policy if exists admin_lee on public.auditoria;
create policy admin_lee on public.auditoria for select to authenticated using ((select public.es_admin()));
-- Sin políticas de insert/update/delete: solo escribe el trigger (security definer).

-- Columnas que no interesan (ruido del autoguardado o calculadas)
create or replace function public.auditoria_ignorar() returns text[] language sql immutable as $$
  select array['updated_at', 'created_at', 'revisado_en', 'mensaje_cliente_fecha']
$$;

create or replace function public.auditar() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_cambios jsonb := '{}'::jsonb;
  v_k text;
  v_rol text;
begin
  if tg_op = 'UPDATE' then
    for v_k in select jsonb_object_keys(v_new) loop
      if v_k = any (public.auditoria_ignorar()) then continue; end if;
      if (v_old -> v_k) is distinct from (v_new -> v_k) then
        v_cambios := v_cambios || jsonb_build_object(v_k, jsonb_build_array(v_old -> v_k, v_new -> v_k));
      end if;
    end loop;
    if v_cambios = '{}'::jsonb then return new; end if; -- guardado sin cambios reales
  else
    v_cambios := coalesce(v_new, v_old);
  end if;

  v_rol := case
    when auth.uid() is null then 'sistema'
    when public.es_admin() then 'admin'
    when exists (select 1 from pas_portal_users where user_id = auth.uid()) then 'pas'
    else 'cliente' end;

  insert into auditoria (tabla, fila_id, operacion, cambios, usuario, rol)
  values (tg_table_name, coalesce(v_new ->> 'id', v_old ->> 'id'), tg_op, v_cambios, auth.uid(), v_rol);
  return coalesce(new, old);
end $fn$;

-- Tablas auditadas (sumar acá las que hagan falta)
do $$
declare t text;
begin
  foreach t in array array['pas_casos', 'expedientes', 'plazos', 'pas_eventos', 'gastos', 'pas_ofertas', 'pas_companias'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_auditar on public.%I', t);
      execute format('create trigger trg_auditar after insert or update or delete on public.%I
                        for each row execute function public.auditar()', t);
    end if;
  end loop;
end $$;

-- Historial de un registro, para la pestaña Bitácora ("Cambios de datos")
create or replace function public.historial_de(p_tabla text, p_id text, p_limite int default 200)
returns setof public.auditoria language sql stable security invoker set search_path = public as $$
  select * from auditoria where tabla = p_tabla and fila_id = p_id order by en desc limit p_limite
$$;
grant execute on function public.historial_de(text, text, int) to authenticated;

-- Limpieza: más de 18 meses (solo si pg_cron está instalado; en Supabase lo está desde el SQL 18)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('limpiar_auditoria') where exists (select 1 from cron.job where jobname = 'limpiar_auditoria');
    perform cron.schedule('limpiar_auditoria', '30 7 * * 0',
      $c$ delete from public.auditoria where en < now() - interval '18 months' $c$);
  end if;
end $$;

-- Control: 1 tabla, 7 triggers (o menos si falta alguna tabla)
select (select count(*) from information_schema.tables where table_name = 'auditoria') as tabla_1,
       (select count(*) from pg_trigger where tgname = 'trg_auditar') as triggers_7;

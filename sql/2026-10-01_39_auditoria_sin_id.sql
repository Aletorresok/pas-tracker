-- SQL 39 · Arreglo de la auditoría (2026-10-01). Se puede volver a correr sin problema.
--
-- Problema: el trigger del SQL 31 guarda `fila_id` sacándolo de la columna `id`, que es obligatoria.
-- `pas_companias` no tiene `id` (su clave es `compania`), así que todo guardado en la ficha de una
-- compañía fallaba con: null value in column "fila_id" of relation "auditoria" violates not-null constraint.
-- Arreglo: si la fila no tiene `id`, usa `compania`; y si tampoco, `pas_id` o "?" (nunca vacío).

create or replace function public.auditar() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_fila jsonb := coalesce(v_new, v_old);
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
    v_cambios := v_fila;
  end if;

  v_rol := case
    when auth.uid() is null then 'sistema'
    when public.es_admin() then 'admin'
    when exists (select 1 from pas_portal_users where user_id = auth.uid()) then 'pas'
    else 'cliente' end;

  insert into auditoria (tabla, fila_id, operacion, cambios, usuario, rol)
  values (tg_table_name,
          coalesce(v_fila ->> 'id', v_fila ->> 'compania', v_fila ->> 'pas_id', '?'),
          tg_op, v_cambios, auth.uid(), v_rol);
  return coalesce(new, old);
end $fn$;

-- Control: guardar una compañía de prueba y borrarla (tiene que devolver 1 y no dar error)
begin;
insert into public.pas_companias (compania) values ('__prueba_sql_39__') on conflict (compania) do nothing;
select count(*) as auditada_1 from public.auditoria where tabla = 'pas_companias' and fila_id = '__prueba_sql_39__';
rollback;

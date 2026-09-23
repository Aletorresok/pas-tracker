-- Mejoras: el cliente ve lo que el estudio ya tiene (checklist) y la próxima mediación/audiencia;
-- el PAS ve en el portal la próxima mediación/audiencia de sus casos.
-- Solo agrega una función y un permiso de lectura. Se puede volver a correr sin problema.

-- 1) Para la vista del cliente: documentos enviados, lo que el estudio ya tildó y el próximo evento
create or replace function public.extras_cliente(p_patente text, p_dni text, p_caso_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_tenemos jsonb;
  v_evento  jsonb;
begin
  if not cliente_es_dueno(p_patente, p_dni, p_caso_id) then
    return null;
  end if;
  select coalesce(documentacion, '{}'::jsonb) into v_tenemos from pas_casos where id = p_caso_id;
  select jsonb_build_object('tipo', tipo, 'inicio', inicio) into v_evento
    from pas_eventos
   where caso_id = p_caso_id and inicio >= now() - interval '2 hours' and tipo in ('mediacion', 'audiencia')
   order by inicio limit 1;
  return jsonb_build_object(
    'enviados', coalesce((select jsonb_agg(jsonb_build_object('tipo', tipo, 'nombre', nombre_original, 'creado', creado) order by creado desc)
                            from pas_subidas_cliente where caso_id = p_caso_id and estado in ('subida', 'guardada')), '[]'::jsonb),
    'tenemos', v_tenemos,
    'proximo_evento', v_evento);
end $fn$;
revoke all on function public.extras_cliente(text, text, uuid) from public;
grant execute on function public.extras_cliente(text, text, uuid) to anon, authenticated;

-- 2) Portal: cada PAS puede VER (no editar) la agenda de sus propios casos
drop policy if exists pas_ve_eventos on public.pas_eventos;
create policy pas_ve_eventos on public.pas_eventos
  for select to authenticated
  using (exists (select 1 from public.pas_casos c
                  where c.id = pas_eventos.caso_id
                    and c.pas_id::text = (select public.mi_pas_id())));

-- Control
select count(*) as politicas_agenda from pg_policies where schemaname = 'public' and tablename = 'pas_eventos';

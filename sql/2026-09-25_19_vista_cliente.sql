-- Vista del cliente (2026-09-25): más datos para mostrarle, sin cambiar quién puede ver qué.
--   1) consultar_caso_cliente suma fecha_firma, plazo_pago (fecha estimada de pago = firma + plazo) y fecha_cobro
--      (para "Cobraste $X el dd/mm"). Es la misma función del SQL 04, con esos tres campos de más.
--   2) extras_cliente devuelve también el link y el lugar de la próxima mediación / audiencia.
-- Se puede volver a correr sin problema. La app funciona igual antes de correrlo (solo no muestra esos datos).

-- 1) Consulta del cliente
create or replace function public.consultar_caso_cliente(p_patente text, p_dni text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_patente text := upper(regexp_replace(coalesce(p_patente, ''), '[^A-Za-z0-9]', '', 'g'));
  v_dni     text := right(regexp_replace(coalesce(p_dni, ''), '\D', '', 'g'), 3);
  v_casos   jsonb;
begin
  if length(v_patente) < 5 or length(v_dni) != 3 then
    return '[]'::jsonb;
  end if;

  -- Más de 5 intentos fallidos en 15 minutos para esa patente: se bloquea un rato
  if (select count(*) from pas_cliente_intentos
      where patente = v_patente and creado > now() - interval '15 minutes') >= 5 then
    raise exception 'demasiados_intentos';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id,
           'asegurado', c.asegurado,
           'patente', c.patente,
           'compania_aseguradora', c.compania_aseguradora,
           'estado', c.estado,
           'fecha_derivacion', c.fecha_derivacion,
           'fecha_inicio_reclamo', c.fecha_inicio_reclamo,
           'fecha_ofrecimiento', c.fecha_ofrecimiento,
           'fecha_pago', c.fecha_pago,
           'fecha_firma', c.fecha_firma,
           'plazo_pago', c.plazo_pago,
           'fecha_cobro', c.fecha_cobro,
           'fecha_ultimo_movimiento', c.fecha_ultimo_movimiento,
           'monto_ofrecimiento', c.monto_ofrecimiento,
           'monto_cobro_asegurado', c.monto_cobro_asegurado,
           'mensaje_cliente', c.mensaje_cliente,
           'mensaje_cliente_fecha', c.mensaje_cliente_fecha
         ) order by c.fecha_derivacion desc nulls last), '[]'::jsonb)
    into v_casos
    from pas_casos c
   where upper(regexp_replace(coalesce(c.patente::text, ''), '[^A-Za-z0-9]', '', 'g')) = v_patente
     and right(regexp_replace(coalesce(c.dni_asegurado::text, ''), '\D', '', 'g'), 3) = v_dni;

  if jsonb_array_length(v_casos) = 0 then
    insert into pas_cliente_intentos (patente) values (v_patente);
    delete from pas_cliente_intentos where creado < now() - interval '1 day';
  end if;

  return v_casos;
end $fn$;

-- 2) Extras del cliente: la próxima mediación / audiencia ahora con link y lugar
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
  select jsonb_build_object('tipo', tipo, 'inicio', inicio, 'link', link, 'lugar', lugar) into v_evento
    from pas_eventos
   where caso_id = p_caso_id and inicio >= now() - interval '2 hours' and tipo in ('mediacion', 'audiencia')
   order by inicio limit 1;
  return jsonb_build_object(
    'enviados', coalesce((select jsonb_agg(jsonb_build_object('tipo', tipo, 'nombre', nombre_original, 'creado', creado) order by creado desc)
                            from pas_subidas_cliente where caso_id = p_caso_id and estado in ('subida', 'guardada')), '[]'::jsonb),
    'tenemos', v_tenemos,
    'proximo_evento', v_evento);
end $fn$;

-- Control: las dos funciones tienen que aparecer
select proname from pg_proc where proname in ('consultar_caso_cliente', 'extras_cliente');

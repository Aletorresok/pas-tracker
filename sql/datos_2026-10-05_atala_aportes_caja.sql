-- Expediente MG-3846-2026 (Atala c/ Fernandez s/ divorcio por presentacion unilateral). Datos del 2026-10-05.
-- Deja registrado el pago de los aportes a la Caja y el escrito presentado el 05/10 (arts. 21 y 22 ley 6716).
-- Se corre a mano en el SQL Editor de Supabase. Se puede volver a correr: no duplica la nota ni la bitacora.
-- No cambia el estado del expediente ni honorarios_cobrados (ver el final).
begin;

-- Bitacora (interna: los movimientos de expedientes no los ve ningun PAS)
insert into public.acciones (caso_id, tipo, descripcion, fecha)
select e.id::text, 'nota',
       'Presentado: aportes a la Caja (arts. 21 y 22 ley 6716) y pedido de que se provea el oficio al Registro de las Personas. '
       || 'Boletas 82910219 (28/08/2026) y 83077064 (05/10/2026).',
       timestamptz '2026-10-05 14:58:00-03'
  from public.expedientes e
 where e.numero = 'MG-3846-2026'
   and not exists (
     select 1 from public.acciones a
      where a.caso_id = e.id::text and a.descripcion like 'Presentado: aportes a la Caja%'
   );

-- Proxima accion y notas (la nota se agrega al final de lo que ya hay)
update public.expedientes
   set proxima_accion       = 'Diligenciar el oficio ante el Registro de las Personas (inscripcion del divorcio, art. 21 bis ley 6716) cuando lo provean',
       proxima_accion_vence = null,
       notas = concat_ws(E'\n\n', nullif(notas, ''),
         '05/10/2026 · Honorarios regulados: 47 JUS a $53.232 = $2.501.904 (divorcio 40 JUS = $2.129.280; compensacion economica 7 JUS = $372.624). '
         || 'Aportes a la Caja pagados: boleta 82910219 (28/08/2026) $319.392 = 10% letrado + 5% juicio voluntario; '
         || 'boleta 83077064 (05/10/2026) $74.524,80 = 10% letrado + 10% juicio contradictorio. '
         || 'Total ingresado a la Caja: $393.916,80. A cargo de la clienta: $143.726,40 ($106.464 + $37.262,40). '
         || 'Manifestado en el expediente que los honorarios fueron percibidos (art. 22 ley 6716). Pendiente: factura.')
 where numero = 'MG-3846-2026'
   and coalesce(notas, '') not like '%boleta 83077064%';

commit;

-- Control: 1 fila, con la proxima accion nueva y 1 movimiento en la bitacora
select e.numero, e.estado, e.proxima_accion, e.honorarios_cobrados,
       (select count(*) from public.acciones a
         where a.caso_id = e.id::text and a.descripcion like 'Presentado: aportes a la Caja%') as bitacora_1
  from public.expedientes e
 where e.numero = 'MG-3846-2026';

-- Si queres reflejar mas en la ficha (no lo hice sin que lo confirmes):
--   update public.expedientes set estado = 'sentenciado' where numero = 'MG-3846-2026';     -- hasta que se inscriba; despues 'finalizado'
--   update public.expedientes set honorarios_cobrados = 2501904 where numero = 'MG-3846-2026';  -- el monto que realmente cobraste

-- Comisión del PAS pagada (2026-09-25): fecha en que le pagaste la comisión al productor.
-- Hasta ahora la app daba la comisión por pagada cuando cobrabas tus honorarios. Desde este SQL se tilda aparte.
-- Los casos anteriores con honorarios cobrados quedan como pagados (confirmado por el usuario): con la fecha
-- de cobro de honorarios, o la de cobro del caso, o hoy si no hay ninguna.
-- Se puede volver a correr sin problema.

alter table public.pas_casos add column if not exists fecha_pago_comision date;

update public.pas_casos
   set fecha_pago_comision = coalesce(fecha_cobro_honorarios, fecha_cobro, current_date)
 where fecha_pago_comision is null
   and coalesce(monto_comision_pas, 0) > 0
   and (fecha_cobro_honorarios is not null or estado_honorarios = 'COBRADO' or estado = 'cobrado');

-- Control: cuántas comisiones quedaron pagadas y cuántas pendientes
select count(*) filter (where fecha_pago_comision is not null) as comisiones_pagadas,
       count(*) filter (where fecha_pago_comision is null and coalesce(monto_comision_pas, 0) > 0) as comisiones_pendientes
  from public.pas_casos;

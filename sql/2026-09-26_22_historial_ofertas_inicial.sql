-- Historial inicial de ofertas (2026-09-26): pasa a pas_ofertas (SQL 21) los ofrecimientos que ya estaban
-- cargados en cada caso, para que "Suba 1ª → última" y la tarjeta de Ofertas arranquen con lo que ya sabías.
--   · Si el caso tiene "primer ofrecimiento" distinto del último, entra primero (con la fecha de ofrecimiento).
--   · El último ofrecimiento entra después: "Aceptada" si el caso está en Esperando pago o Cobrado; si no, "Sin responder".
-- Solo toca casos que todavía no tienen historial, así que se puede volver a correr sin duplicar nada.

with sin_historial as (
  select c.id, c.estado, c.primer_ofrecimiento, c.monto_ofrecimiento, c.fecha_ofrecimiento,
         c.fecha_reconsideracion, c.fecha_aceptacion,
         (coalesce(c.primer_ofrecimiento, 0) > 0 and c.primer_ofrecimiento <> c.monto_ofrecimiento) as hay_primero
    from public.pas_casos c
   where coalesce(c.monto_ofrecimiento, 0) > 0
     and not exists (select 1 from public.pas_ofertas o where o.caso_id = c.id)
)
insert into public.pas_ofertas (caso_id, fecha, monto, respuesta, nota)
select id, coalesce(fecha_ofrecimiento, current_date), primer_ofrecimiento, 'rechazada', 'Cargado del primer ofrecimiento del caso'
  from sin_historial where hay_primero
union all
select id,
       coalesce(case when hay_primero then coalesce(fecha_reconsideracion, fecha_aceptacion) end, fecha_ofrecimiento, current_date),
       monto_ofrecimiento,
       case when estado in ('esperando_pago', 'cobrado') then 'aceptada' else 'pendiente' end,
       'Cargado del último ofrecimiento del caso'
  from sin_historial;

-- Control: casos con historial y ofertas cargadas
select count(distinct caso_id) as casos_con_historial, count(*) as ofertas from public.pas_ofertas;

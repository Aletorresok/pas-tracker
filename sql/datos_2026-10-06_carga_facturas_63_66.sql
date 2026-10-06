-- Facturas de honorarios 0001-00000063 a 0001-00000066 (ARCA, 02/10 a 06/10/2026). 2026-10-06.
-- Sigue a datos_2026-10-01_carga_facturas.sql (que llegó hasta la 62).
-- La 63 (Villena) ya estaba bien. La 64 y la 65 se cargaron a mano con dígitos de menos; la 66 faltaba.
-- No cambia el estado de los casos (los cuatro ya están en Con ofrecimiento o Esperando pago).
-- Se puede volver a correr.
begin;
update pas_casos set nro_factura = '0001-00000064' where id = '2b414c42-151a-4799-bad3-fb0f98c193e3' and nro_factura = '0001-0000064'; -- Della Giustina Franco
update pas_casos set nro_factura = '0001-00000065' where id = '9b368c0d-39d4-4ec3-a943-193cf075a712' and nro_factura = '0001-000065';  -- Leiva Joel
update pas_casos set fecha_factura = '2026-10-06', nro_factura = '0001-00000066', estado_honorarios = 'FACTURADO',
                     monto_honorarios = coalesce(nullif(monto_honorarios, 0), 173250)
 where id = '3f71d827-7779-4d0d-9dba-4b7e1b871dc4' and coalesce(nro_factura, '') = '';                                               -- Guzman Zulema Del Carmen
commit;

-- Control: tienen que aparecer las 4, con el número completo
select nro_factura, fecha_factura, asegurado, estado, monto_honorarios, estado_honorarios
  from pas_casos
 where id in ('842bf1d6-e84c-4b9e-8221-a1fdbdecf033', '2b414c42-151a-4799-bad3-fb0f98c193e3',
              '9b368c0d-39d4-4ec3-a943-193cf075a712', '3f71d827-7779-4d0d-9dba-4b7e1b871dc4')
 order by nro_factura;

-- Carga de facturas de honorarios (ARCA, 17/03 a 29/09/2026) en cada caso. 2026-10-01. Correr una sola vez.
-- Anuladas por nota de crédito (no se cargan): F 0020 (NC 0002), F 0022 (NC 0001), F 0040 (NC 0003), F 0048 (NC 0004), F 0053 (NC 0005).
-- Además: Peñaylillo pasa a 92.250 de honorarios; Vitian, monto_honorarios 504.000 (los 3.360.000 eran la indemnización,
-- que ya está en monto_cobro_asegurado); Timpanaro y Benvenuto, cobro de honorarios = fecha de pago del caso.
begin;
update pas_casos set fecha_factura = '2026-03-17', nro_factura = '0001-00000009', estado_honorarios = 'COBRADO' where id = '7a71d077-913e-4cab-bb50-3c21ac96afcc'; -- Madrid Natalia Beatriz
update pas_casos set fecha_factura = '2026-04-09', nro_factura = '0001-00000010', estado_honorarios = 'COBRADO' where id = 'a00a83d7-94a2-4721-9bc4-821827fb6cc6'; -- Barzini Veronica
update pas_casos set fecha_factura = '2026-04-14', nro_factura = '0001-00000011', estado_honorarios = 'COBRADO' where id = 'f3f18650-230b-4e09-b7e8-80ca267c98d3'; -- Rappazzo Leticia Gisela
update pas_casos set fecha_factura = '2026-04-15', nro_factura = '0001-00000012', monto_cobro_yo = 92250, monto_honorarios = 92250, estado_honorarios = 'COBRADO' where id = '46dd82f5-84df-4126-a35b-4893d00b0d63'; -- Peñaylillo Ramon Dario
update pas_casos set fecha_factura = '2026-04-20', nro_factura = '0001-00000013', estado_honorarios = 'COBRADO' where id = '299f7f7f-7f15-4dfc-bd63-0c9d722ca3d8'; -- Ballejos Facundo
update pas_casos set fecha_factura = '2026-04-20', nro_factura = '0001-00000014', estado_honorarios = 'COBRADO' where id = '482ad585-dc66-43c2-bcdc-7874cd88a22b'; -- Palma Rosana
update pas_casos set fecha_factura = '2026-04-20', nro_factura = '0001-00000015', estado_honorarios = 'COBRADO' where id = '3e13c45f-fbaa-434d-b15f-337357d55c48'; -- Brunettini Gladis Elisabeth
update pas_casos set fecha_factura = '2026-04-24', nro_factura = '0001-00000016', estado_honorarios = 'COBRADO' where id = '27fa7173-249b-438c-8243-cb4c3c627881'; -- Fretes Emilia Soledad
update pas_casos set fecha_factura = '2026-05-09', nro_factura = '0001-00000017', estado_honorarios = 'COBRADO' where id = '280e03b7-fc1b-4968-a4a8-2ae6b0fcf367'; -- Vidable Nadia
update pas_casos set fecha_factura = '2026-05-12', nro_factura = '0001-00000018', estado_honorarios = 'COBRADO' where id = '80afe527-caad-410a-bc8a-8c3f418e5732'; -- Ciceri Agustin
update pas_casos set fecha_factura = '2026-05-14', nro_factura = '0001-00000019', estado_honorarios = 'COBRADO' where id = '947a20ec-43c5-4ff1-b9de-4ac2401395aa'; -- Repetto Carlos
update pas_casos set fecha_factura = '2026-05-26', nro_factura = '0001-00000021', estado_honorarios = 'FACTURADO' where id = '4127b2c4-0bf0-4956-83c5-5dac675604f4'; -- Guariello Carla Mariel
update pas_casos set fecha_factura = '2026-05-31', nro_factura = '0001-00000023', estado_honorarios = 'COBRADO' where id = '7c948349-56d6-4f70-8639-ad61f225e2f8'; -- Modon Delia
update pas_casos set fecha_factura = '2026-05-31', nro_factura = '0001-00000024', estado_honorarios = 'COBRADO' where id = 'afe54db1-b2f1-4cd0-a43e-a4a2a89eda4a'; -- Remic Ivana Florencia
update pas_casos set fecha_factura = '2026-06-01', nro_factura = '0001-00000025', estado_honorarios = 'COBRADO' where id = '1b6599b6-2392-45a1-a25e-2ab1ea0148c6'; -- Darvin Maria del Carmen
update pas_casos set fecha_factura = '2026-06-04', nro_factura = '0001-00000026', estado_honorarios = 'COBRADO' where id = '87eaec0f-9ac5-4c01-946f-e3a526d35b09'; -- Olivera Raul
update pas_casos set fecha_factura = '2026-06-04', nro_factura = '0001-00000027', estado_honorarios = 'COBRADO' where id = 'bbce06b9-9884-4e16-ad57-cd893b6c075a'; -- BULLON DYLAN JOEL
update pas_casos set fecha_factura = '2026-06-09', nro_factura = '0001-00000028', estado_honorarios = 'FACTURADO' where id = '3707efb7-f26f-4c96-a108-79f88677e37f'; -- Pereyra Romina
update pas_casos set fecha_factura = '2026-06-19', nro_factura = '0001-00000029', estado_honorarios = 'COBRADO' where id = '3ce19bca-f453-4bd3-a362-7d80b536ffc8'; -- Sosa Hector
update pas_casos set fecha_factura = '2026-06-19', nro_factura = '0001-00000030', estado_honorarios = 'COBRADO' where id = '6ea1d659-feeb-43ae-834c-7cd088cc8e78'; -- Galante Pablo
update pas_casos set fecha_factura = '2026-06-26', nro_factura = '0001-00000031', estado_honorarios = 'COBRADO' where id = '80ff2cad-b141-421e-aac0-0ed6954813c8'; -- Blanco Yamila
update pas_casos set fecha_factura = '2026-07-06', nro_factura = '0001-00000032', estado_honorarios = 'COBRADO' where id = 'af637596-ddc4-4876-870e-d3e0bdc15e19'; -- Repetto Vanesa
update pas_casos set fecha_factura = '2026-07-23', nro_factura = '0001-00000033', monto_honorarios = 504000, estado_honorarios = 'COBRADO' where id = '995a7d95-dbe4-4234-bce5-f519894e5463'; -- Jose Horacio Vitian
update pas_casos set fecha_factura = '2026-07-23', nro_factura = '0001-00000034', estado_honorarios = 'COBRADO' where id = '4470ad40-ca74-4502-a0be-7be880d78b9d'; -- Zarate Vanesa Myriam
update pas_casos set fecha_factura = '2026-07-23', nro_factura = '0001-00000035', estado_honorarios = 'COBRADO' where id = '06313614-95da-47d7-bc78-eb4421cd41ce'; -- Mangold Moro Juan Manuel
update pas_casos set fecha_factura = '2026-08-06', nro_factura = '0001-00000036', estado_honorarios = 'COBRADO' where id = '941d0a82-6d3d-4287-b5ac-3915f87a3f62'; -- Vila Claudio Daniel
update pas_casos set fecha_factura = '2026-08-11', nro_factura = '0001-00000037', estado_honorarios = 'COBRADO' where id = '5d6c2ec5-9960-4024-9ab4-e7a88b1e3691'; -- Baez Anabela
update pas_casos set fecha_factura = '2026-08-12', nro_factura = '0001-00000038', estado_honorarios = 'COBRADO' where id = 'e1069ad5-097c-4726-b995-cdd91307bca9'; -- SERRANO RODRIGO IVAN
update pas_casos set fecha_factura = '2026-08-13', nro_factura = '0001-00000039', estado_honorarios = 'COBRADO' where id = '2b7f518d-12cd-4176-858f-5565635d0dec'; -- Coudron Sergio
update pas_casos set fecha_factura = '2026-08-14', nro_factura = '0001-00000041', estado_honorarios = 'COBRADO' where id = '2d9dc351-78f1-402d-8e35-1763b6b0acbb'; -- Llano Tobias
update pas_casos set fecha_factura = '2026-08-18', nro_factura = '0001-00000042', estado_honorarios = 'FACTURADO' where id = '9580ed13-efe3-43e6-9f54-23f87c2aa08c'; -- Arevalo Miguel
update pas_casos set fecha_factura = '2026-08-19', nro_factura = '0001-00000043', estado_honorarios = 'COBRADO' where id = '544f7182-e4e9-434f-b3c3-b5071d669820'; -- Lucero Maria Alejandra
update pas_casos set fecha_factura = '2026-08-21', nro_factura = '0001-00000044', estado_honorarios = 'COBRADO' where id = '2730b5bd-18d1-4c54-8605-cba427aa105c'; -- Morelli SIlvia
update pas_casos set fecha_factura = '2026-08-24', nro_factura = '0001-00000045', estado_honorarios = 'COBRADO' where id = 'cafca80b-8c93-46aa-9ccb-1ffe1d618c62'; -- Fontenla Gabriel
update pas_casos set fecha_factura = '2026-08-25', nro_factura = '0001-00000046', estado_honorarios = 'COBRADO' where id = 'd2672a9a-7fe5-48b6-b683-9020f427b8de'; -- Ferrer Cristian Alejandro
update pas_casos set fecha_factura = '2026-08-25', nro_factura = '0001-00000047', fecha_cobro_honorarios = '2026-09-02', estado_honorarios = 'COBRADO' where id = '61d1a818-2d8e-4633-a674-5ded652c67fb'; -- Timpanaro Agustin
update pas_casos set fecha_factura = '2026-08-25', nro_factura = '0001-00000049', estado_honorarios = 'COBRADO' where id = '284d1dfb-fceb-48e7-9a0c-e774d90a5c00'; -- Racedo Yanina
update pas_casos set fecha_factura = '2026-09-01', nro_factura = '0001-00000050', estado_honorarios = 'FACTURADO' where id = '82401f9d-d9ef-4c0c-a50e-c17ea33db8cd'; -- Blanco Gladys
update pas_casos set fecha_factura = '2026-09-01', nro_factura = '0001-00000051', estado_honorarios = 'FACTURADO' where id = '882dd52f-02cf-42fb-a4f2-dc2c29eb71d2'; -- Kubar Juan Pablo
update pas_casos set fecha_factura = '2026-09-01', nro_factura = '0001-00000052', estado_honorarios = 'COBRADO' where id = 'c6d57318-7663-4328-b640-5d9418fdc347'; -- Rodriguez Carlos
update pas_casos set fecha_factura = '2026-09-08', nro_factura = '0001-00000054', estado_honorarios = 'COBRADO' where id = '5d1001d6-3942-423e-9ac8-f7037ba329f6'; -- Rojas Carlos
update pas_casos set fecha_factura = '2026-09-08', nro_factura = '0001-00000055', fecha_cobro_honorarios = '2026-09-28', estado_honorarios = 'COBRADO' where id = '2d6f91c7-f6b2-4515-a272-470e20b2f5df'; -- Benvenuto Analia
update pas_casos set fecha_factura = '2026-09-09', nro_factura = '0001-00000056', estado_honorarios = 'FACTURADO' where id = 'c40380b0-b295-4a5e-8d8a-69eaf6218177'; -- Monzon Gerardo
update pas_casos set fecha_factura = '2026-09-11', nro_factura = '0001-00000057', estado_honorarios = 'COBRADO' where id = '697f0b9d-98e8-4a0d-821c-bd00b5b1937a'; -- Insaurralde Claudia
update pas_casos set fecha_factura = '2026-09-16', nro_factura = '0001-00000058', estado_honorarios = 'FACTURADO' where id = '04cf6bd2-766d-47ac-98d3-d241252bd315'; -- Orsini Mariano
update pas_casos set fecha_factura = '2026-09-22', nro_factura = '0001-00000059', estado_honorarios = 'FACTURADO' where id = 'd5596496-5f39-4fea-846b-5d21598a89bf'; -- Herrera Gabriel
update pas_casos set fecha_factura = '2026-09-24', nro_factura = '0001-00000060', estado_honorarios = 'FACTURADO' where id = 'c5789866-7433-42e9-a646-a09c88f0594e'; -- Gallardo Gerardo
update pas_casos set fecha_factura = '2026-09-24', nro_factura = '0001-00000061', estado_honorarios = 'FACTURADO' where id = 'a67198dc-f24d-4af4-b8d6-c2244072693f'; -- Briozzo Andres Gabriel
update pas_casos set fecha_factura = '2026-09-29', nro_factura = '0001-00000062', estado_honorarios = 'FACTURADO' where id = '97150bb9-2b58-498a-ae52-324e8e792425'; -- Canchumani Salome Abel
commit;

-- Control: tiene que dar 49
select count(*) as con_factura_49 from pas_casos where nro_factura like '0001-%';

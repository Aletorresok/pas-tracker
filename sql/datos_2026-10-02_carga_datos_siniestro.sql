-- Carga de los datos del siniestro relevados en "Siniestros - datos sin campo en app.xlsx" (35 casos)
-- Requiere el SQL 44. Correr en el SQL Editor de Supabase en dos pasos:
--   1) Solo la parte "CONTROL" (hasta la primera línea de guiones): lista cada fila del Excel con los casos que encuentra.
--      Tiene que dar 1 caso por fila. Si alguna da 0 o 2, avisame antes de seguir.
--   2) Todo el archivo: completa los datos. Solo llena lo que está vacío (no pisa nada cargado a mano)
--      y no toca las filas que dan 0 o más de 1 caso.
-- Reglas: titular y conductor quedan vacíos cuando son el asegurado; el DNI/registro del tercero solo
-- se carga si el caso no lo tenía; el teléfono de la póliza va a observaciones.

create temp table if not exists _excel_siniestros (
  asegurado text, cia_propia text, nro_siniestro_propio text, poliza_propia text, productor_poliza text, cobertura text,
  vigencia_desde date, vigencia_hasta date, titular_poliza text, conductor_nombre text, conductor_dni text, conductor_tel text,
  hora_siniestro time, tercero_conductor text, tercero_cia text, tercero_dni text, observaciones_siniestro text
);
truncate _excel_siniestros;
insert into _excel_siniestros values
  ('ALAN DIAZ', 'Provincia Seguros', '1-4-2482418', '10977011', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 8 RC,INC/ROB/HURTO TOT Y PAR', '2026-03-02', '2026-10-02', null, null, null, null, '09:35', null, 'RIO URUGUAY', null, null),
  ('ALBA VILAQUI NANCY BEATRIZ', 'Provincia Seguros', '1-4-2482436', '10980915', '37381 MIRAGLIA IRENE MONICA HAYDEE', 'PLAN 22 TERCEROS COMPLETOS FULL', '2026-03-15', '2026-10-15', null, 'PONCE GASTON ALEJANDRO', '27344152', '1140744169', '09:30', 'HERNANDEZ MATIAS EZEQUIEL', 'SAN CRISTOBAL', null, 'Conducía otra persona: no se cargó teléfono (el de la denuncia es del conductor). Domicilio distinto: denuncia «COLON CRISTOBAL Nro.4031» / certificado «PAZ MARCOS Nro.4345 Piso - Depto. - - SAN MIGUEL (1663)».'),
  ('Alemis Lucia Graciela', 'Provincia Seguros', '1-4-2463209', '10842861', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 22 TERCEROS COMPLETOS FULL', '2025-07-21', '2026-07-21', null, null, null, null, '09:30', 'Oliva Leandro Andrés', 'FEDERACION PATRONAL SEGUROS SA', null, null),
  ('Arellano Torrico Oscar Maik', 'Provincia Seguros', '1-4-2475288', '10908423', '98391 SUAREZ GORDILLO ANA BELEN', 'PLAN 22 TERCEROS COMPLETOS FULL', '2025-11-08', '2026-09-08', null, null, null, null, '13:30', 'Sergio Javier Cortes', 'PRUDENCIA', null, null),
  ('Arevalo Miguel', 'Agrosalta', 'Denuncia 361.204', '8249187', '10957 BOCCHIO SANDRA BEATRIZ', null, null, null, null, null, null, null, '16:00', null, null, null, 'Titular: Arevalo Roberto Miguel'),
  ('Blanco Gladys', 'Provincia Seguros', '1-4-2477093', '11049614', '37381 MIRAGLIA IRENE MONICA HAYDEE', 'PLAN 50 TODO RIESGO GARANTIZADO', '2026-07-06', '2026-09-06', null, null, null, null, '15:45', null, 'ATM COMPAÑIA DE SEGUROS', null, 'Tel. de la póliza: 02320427454'),
  ('Briozzo Andres Gabriel', 'Provincia Seguros', '1-4-2479603', '11078493', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 22 TERCEROS COMPLETOS FULL', '2026-08-18', '2026-09-18', null, null, null, null, '14:42', 'GONZALEZ RAMON JORGE', 'NACION SEGUROS S.A.', null, null),
  ('Canchumani Salome Abel', 'Provincia Seguros', '1-4-2467839', '11018053', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 8 RC,INC/ROB/HURTO TOT Y PAR', '2026-05-12', '2026-08-12', null, 'GONZALEZ HERNAN ESEQUIEL', '38130904', '1127142942', '16:30', 'ROMERO MARCELINO NAZARIO', 'RIVADAVIA SEGUROS', null, 'Conducía otra persona: no se cargó teléfono (el de la denuncia es del conductor).'),
  ('Castro Jorge', 'Provincia Seguros', '1-4-2485525', '11003563', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 22 TERCEROS COMPLETOS FULL', '2026-04-21', '2026-10-21', null, null, null, null, '19:00', null, 'RIVADAVIA SEGUROS', null, 'Tel. de la póliza: 02320-457436'),
  ('COTORRUELO SANDRA KARINA', 'Seguros Rivadavia', '08/02/716596', '08/02/849415/003', null, null, null, null, 'PORRECA MACARENA AYELEN (titular, hija)', null, null, null, '15:40', 'ROMINA VILLAREAL DNI 33777458', 'Otras aseguradoras - póliza 212287-01', null, 'DNI de Cotorruelo no figura en la denuncia (registro Nº 20719095). Testigo: Estela Margarita Ramírez DNI 16112661 tel 1149165983. Hubo atención médica (Sanatorio Anchorena San Martín).'),
  ('Della Giustina Franco', 'Provincia Seguros', '1-4-2477017', '10875481', '54447 GONZALEZ JORGE PEDRO', 'PLAN 22 TERCEROS COMPLETOS FULL', '2025-09-12', '2026-09-12', null, null, null, null, '21:29', 'YAEL', 'CAJA DE SEGUROS SA', null, null),
  ('Franchini Jose Luis', 'Provincia Seguros', '1-4-2474765', '10902631', '37381 MIRAGLIA IRENE MONICA HAYDEE', 'PLAN 40 TODO RIESGO CON FRANQUICIA', '2025-10-30', '2026-08-31', null, null, null, null, '16:50', null, null, null, null),
  ('Gallardo Gerardo', 'Provincia Seguros', '1-4-2462311', '10999311', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 22 TERCEROS COMPLETOS FULL', '2026-04-12', '2026-07-12', null, null, null, null, '14:05', null, 'FEDERACION PATRONAL SEGUROS SA', null, null),
  ('Gauto Mabel Cristina', 'Provincia Seguros', '1-4-2472323', '11046862', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 22 TERCEROS COMPLETOS FULL', '2026-07-02', '2026-09-02', null, 'Yanina Elisabeth Friedl', '31299542', '1157575540', '15:15', null, 'PARANA', null, 'Conducía otra persona: no se cargó teléfono (el de la denuncia es del conductor).'),
  ('Guariello Carla Mariel', '(ver certificado) póliza 006934384', '51/640366/7', '006934384', '00013206 HERRERA GASTON EZEQUIEL', null, null, null, 'GUARRIELLO CARLA MARIEL', null, null, null, '16:40', null, 'RIO URUGUAY COOPERATIVA - póliza 04 13230856', null, 'En la denuncia el apellido figura GUARRIELLO (con doble R). Testigo: Portillo Claudio Oscar DNI 27187005.'),
  ('Guerreiro Gabriel', 'Provincia Seguros', '1-4-2451376', '10916504', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 22 TERCEROS COMPLETOS FULL', '2025-11-24', '2026-05-24', 'GUERRIERO GABRIEL', 'YUDICHE ROMINA', null, '1159673212', '19:30', null, 'MERCANTIL ANDINA', null, 'Conducía otra persona: no se cargó teléfono (el de la denuncia es del conductor).'),
  ('Guzman Francisco', 'Provincia Seguros', '1-4-2466361', '10938387', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 22 TERCEROS COMPLETOS FULL', '2026-01-07', '2026-08-07', null, null, null, null, '11:32', 'JURAO ROBERTO SEBASTIAN', null, null, 'Domicilio distinto: denuncia «ESMERALDA Nro.1673» / certificado «CHOPIN Nro.455 Piso 1 Depto. 8 - JOSE C. PAZ (1665)».'),
  ('Guzman Zulema Del Carmen', 'Provincia Seguros', '1-4-2477734', '11057446', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 50 TODO RIESGO GARANTIZADO', '2026-07-22', '2026-09-22', null, null, null, null, '19:15', 'BENITEZ FACUNDO AGUSTIN', 'LA SEGUNDA', null, null),
  ('Herrera Gabriel', 'Nación Seguros', '769995', '4-2501310', '72490 NACION SEGUROS (empleado)', null, null, null, 'SCHWINDT PATRICIA MABEL (titular)', null, null, null, '17:00', null, null, null, 'Tel. en denuncia: 1531754079 // 1141683473 (titular); email schwindt-pato@hotmail.com. La denuncia no identifica al tercero que embistió.'),
  ('Juan Jose Rodriguez', 'Provincia Seguros', '1-4-2481635', '10912257', '54447 GONZALEZ JORGE PEDRO', 'PLAN 22 TERCEROS COMPLETOS FULL', '2025-11-15', '2026-10-15', null, null, null, null, '18:00', null, 'RIO URUGUAY', null, null),
  ('Kubar Juan Pablo', 'Digna Seguros', 'Denuncia 30.753', '298165', '35458 CAORSI JONATAN', null, null, null, null, null, null, null, '12:00', null, null, null, 'La denuncia no trae datos del tercero.'),
  ('Leiva Joel', 'Provincia Seguros', '1-4-2470576', '10870222', '54447 GONZALEZ JORGE PEDRO', 'PLAN 50 TODO RIESGO GARANTIZADO', '2025-09-04', '2026-09-04', null, null, null, null, '19:15', null, 'ATM COMPAÑIA DE SEGUROS', null, null),
  ('Maderna Noemi', 'Provincia Seguros', '1-4-2477126', '10978510', '37381 MIRAGLIA IRENE MONICA HAYDEE', 'PLAN 22 TERCEROS COMPLETOS FULL', '2026-03-12', '2026-09-12', null, null, null, null, '18:30', null, 'CAJA DE SEGUROS SA', null, null),
  ('Mastrocola Luciano Valentin', 'Provincia Seguros', '1-4-2475211', '11045945', '98391 SUAREZ GORDILLO ANA BELEN', 'PLAN 22 TERCEROS COMPLETOS FULL', '2026-07-01', '2026-09-01', null, null, null, null, '17:50', null, 'AGROSALTA', null, null),
  ('Monzon Gerardo', 'Provincia Seguros', '1-4-2460773', '10888016', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 22 TERCEROS COMPLETOS FULL', '2025-10-03', '2026-07-03', null, null, null, null, '08:50', null, 'BERNARDINO RIVADAVIA MUTUAL DE SEGUROS', null, null),
  ('Moya Mirta Del Valle', 'Provincia Seguros', '1-4-2478639', '11032815', '37381 MIRAGLIA IRENE MONICA HAYDEE', 'PLAN 22 TERCEROS COMPLETOS FULL', '2026-06-07', '2026-10-07', null, null, null, null, '13:00', null, 'DIGNA SEGUROS SA', null, 'Tel. de la póliza: 46662630'),
  ('Orsini Mariano', 'Seguros Galicia', '0420251540359', '04007822103', null, null, null, null, null, null, null, null, '23:30', null, 'ATM - póliza 967764', null, 'Tel. en denuncia es ficticio (011 111111).'),
  ('Pereyra Romina', 'Federación Patronal', 'Denuncia 5792998', '33517246', '33965 MACHUCA CARINA MIRIAM', null, null, null, null, 'OTONDO PEREYRA FELIPE', null, null, null, null, 'RIO URUGUAY', null, 'Fecha del siniestro según denuncia: 19-06-2025 (en la app estaba vacía).'),
  ('Ponce Gonzalo', 'Provincia Seguros', '1-4-2483629', '11070038', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 22 TERCEROS COMPLETOS FULL', '2026-08-11', '2026-10-11', null, null, null, null, '07:00', null, 'CAJA DE SEGUROS SA', null, 'Domicilio distinto: denuncia «ANGEL GALLARDO Nro.1748 Depto.4» / certificado «PICHINCHA Nro.2174 - SAN MIGUEL (1663)».'),
  ('Repetto Vanesa', 'Provincia Seguros', '1-4-2401986', '10752601', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 40 TODO RIESGO CON FRANQUICIA', '2025-03-05', '2025-11-05', null, 'Thiago Exequiel Benitez', '46274010', '1151313923', '13:15', null, 'ATM COMPAÑIA DE SEGUROS', null, 'Conducía otra persona: no se cargó teléfono (el de la denuncia es del conductor).'),
  ('Saley Graciela Laura', 'Provincia Seguros', '1-4-2483256', '10969181', '37381 MIRAGLIA IRENE MONICA HAYDEE', 'PLAN 22 TERCEROS COMPLETOS FULL', '2026-02-27', '2026-10-27', null, null, null, null, '17:00', null, 'MAPFRE ARG DE SEGUROS SA', null, null),
  ('Sanchez Cecilia', 'Provincia Seguros', '1-4-2463625', '10849830', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 2 TERCEROS COMPLETOS', '2025-08-02', '2026-07-02', null, null, null, null, '09:55', null, 'PRUDENCIA', null, null),
  ('Santillan Elsa', 'Provincia Seguros', '1-4-2478659', '10922359', '98391 SUAREZ GORDILLO ANA BELEN', 'PLAN 2 TERCEROS COMPLETOS', '2025-12-05', '2026-10-05', null, 'GASTON MARIANO ARIEL MIELE', '27330591', '1136329088', '14:30', null, 'SAN CRISTOBAL', null, 'Conducía otra persona: no se cargó teléfono (el de la denuncia es del conductor).'),
  ('Timpanaro Agustin', 'Provincia Seguros', '1-4-2470335', '11000318', '69118 MUÑOZ MIRAGLIA DAMIAN RODRIGO', 'PLAN 22 TERCEROS COMPLETOS FULL', '2026-04-06', '2026-08-06', null, null, null, null, '16:40', null, null, null, null),
  ('Villena Soledad', 'Provincia Seguros', '1-4-2475677', '10879155', '98391 SUAREZ GORDILLO ANA BELEN', 'PLAN 22 TERCEROS COMPLETOS FULL', '2025-09-09', '2026-09-09', 'ORREGO JORGE SEBASTIAN', 'ORREGO JORGE SEBASTIAN', '26052874', '1130223132', '13:15', null, 'CAJA DE SEGUROS SA', null, 'El titular de la póliza NO es el cliente cargado en la app: no se cargaron DNI/domicilio/teléfono.');

-- CONTROL
select e.asegurado as en_excel, count(c.id) as casos, string_agg(c.asegurado || ' (' || coalesce(c.compania_aseguradora, 's/compañía') || ')', ' | ') as en_la_app
from _excel_siniestros e
left join public.pas_casos c on lower(trim(c.asegurado)) = lower(trim(e.asegurado))
group by e.asegurado
order by count(c.id), e.asegurado;
-- ------------------------------------------------------------------------------------------------

with unicos as (
  select e.*, min(c.id::text) as caso_id
  from _excel_siniestros e
  join public.pas_casos c on lower(trim(c.asegurado)) = lower(trim(e.asegurado))
  group by e.asegurado, e.cia_propia, e.nro_siniestro_propio, e.poliza_propia, e.productor_poliza, e.cobertura, e.vigencia_desde,
    e.vigencia_hasta, e.titular_poliza, e.conductor_nombre, e.conductor_dni, e.conductor_tel, e.hora_siniestro, e.tercero_conductor,
    e.tercero_cia, e.tercero_dni, e.observaciones_siniestro
  having count(*) = 1
)
update public.pas_casos c set
  cia_propia              = coalesce(nullif(c.cia_propia, ''), u.cia_propia),
  nro_siniestro_propio    = coalesce(nullif(c.nro_siniestro_propio, ''), u.nro_siniestro_propio),
  poliza_propia           = coalesce(nullif(c.poliza_propia, ''), u.poliza_propia),
  productor_poliza        = coalesce(nullif(c.productor_poliza, ''), u.productor_poliza),
  cobertura               = coalesce(nullif(c.cobertura, ''), u.cobertura),
  vigencia_desde          = coalesce(c.vigencia_desde, u.vigencia_desde),
  vigencia_hasta          = coalesce(c.vigencia_hasta, u.vigencia_hasta),
  titular_poliza          = coalesce(nullif(c.titular_poliza, ''), u.titular_poliza),
  conductor_nombre        = coalesce(nullif(c.conductor_nombre, ''), u.conductor_nombre),
  conductor_dni           = coalesce(nullif(c.conductor_dni, ''), u.conductor_dni),
  conductor_tel           = coalesce(nullif(c.conductor_tel, ''), u.conductor_tel),
  hora_siniestro          = coalesce(c.hora_siniestro, u.hora_siniestro),
  tercero_conductor       = coalesce(nullif(c.tercero_conductor, ''), u.tercero_conductor),
  tercero_cia             = coalesce(nullif(c.tercero_cia, ''), u.tercero_cia),
  tercero_dni             = coalesce(nullif(c.tercero_dni, ''), u.tercero_dni),
  observaciones_siniestro = coalesce(nullif(c.observaciones_siniestro, ''), u.observaciones_siniestro)
from unicos u
where c.id::text = u.caso_id;

-- Resultado: casos con datos de póliza cargados
select asegurado, cia_propia, poliza_propia, nro_siniestro_propio, hora_siniestro, conductor_nombre, tercero_cia
from public.pas_casos where cia_propia is not null order by asegurado;

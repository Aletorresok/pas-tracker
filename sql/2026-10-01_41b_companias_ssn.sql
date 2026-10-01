-- SQL 41b · Directorio de compañías desde el listado de la SSN, segunda parte (2026-10-01). Correr después del 41.

-- Nuevas, de la L a la Z (42)
insert into public.pas_companias (compania, razon_social, cuit) values
  ('La Dulce Seguros', 'LA DULCE COOPERATIVA DE SEGUROS LIMITADA', '30-50004144-3'),
  ('La Equidad Social', 'LA EQUIDAD SOCIAL COMPAÑÍA DE SEGUROS PATRIMONIALES S.A.', '30-71494741-5'),
  ('La Equitativa del Plata', 'LA EQUITATIVA DEL PLATA SOCIEDAD ANONIMA DE SEGUROS', '30-51541976-0'),
  ('La Nueva Seguros', 'LA NUEVA COOPERATIVA DE SEGUROS LIMITADA', '30-50004113-3'),
  ('La Paz Seguros', 'LA PAZ COMPAÑÍA DE SEGUROS S.A.', '33-71825211-9'),
  ('La Perseverancia Seguros', 'LA PERSEVERANCIA SEGUROS SOCIEDAD ANONIMA', '30-50003288-6'),
  ('Latitud Sur Seguros', 'COMPAÑIA ARGENTINA DE SEGUROS LATITUD SUR SOCIEDAD ANONIMA', '30-50006638-1'),
  ('Lider Motos Seguros', 'LIDER MOTOS COMPAÑÍA DE SEGUROS S.A.', '33-71234957-9'),
  ('Liderar Seguros', 'LIDERAR COMPAÑIA GENERAL DE SEGUROS S.A.', '30-50005949-0'),
  ('Life Seguros', 'LIFE SEGUROS DE PERSONAS Y PATRIMONIALES S.A.', '30-50005154-6'),
  ('Lograr Seguros', 'LOGRAR COMPAÑÍA DE SEGUROS PATRIMONIALES SOCIEDAD ANÓNIMA', '33-71826648-9'),
  ('Luz y Fuerza Seguros', 'COOPERATIVA DE SEGUROS LUZ Y FUERZA LIMITADA', '30-51896571-5'),
  ('Meridional', 'LA MERIDIONAL COMPAÑÍA ARGENTINA DE SEGUROS SOCIEDAD ANÓNIMA', '30-50005116-3'),
  ('Metropol Mutual', 'METROPOL SOCIEDAD DE SEGUROS MUTUOS', '30-69688027-8'),
  ('Metropol Seguros', 'METROPOL COMPAÑÍA ARGENTINA DE SEGUROS SOCIEDAD ANONIMA', '30-50006133-9'),
  ('Mista Seguros', 'MISTA SEGUROS S.A.', '30-68208831-8'),
  ('Mutual DAN', 'ASOCIACION MUTUAL DAN', '30-50004519-8'),
  ('Mutual Rivadavia (Transporte)', 'MUTUAL RIVADAVIA DE SEGUROS DEL TRANSPORTE PÚBLICO DE PASAJEROS', '30-69210356-0'),
  ('Nativa Seguros', 'NATIVA COMPAÑIA ARGENTINA DE SEGUROS S.A.', '30-50005185-6'),
  ('Nivel Seguros', 'NIVEL SEGUROS S.A.', '30-69067464-1'),
  ('Noble Seguros', 'NOBLE COMPAÑÍA DE SEGUROS SOCIEDAD ANÓNIMA', '30-70812715-5'),
  ('NRE Seguros', 'NRE COMPAÑÍA DE SEGUROS PATRIMONIALES Y DE PERSONAS S.A', '30-71233712-1'),
  ('Opción Seguros', 'OPCIÓN SEGUROS S.A.', '30-71435879-7'),
  ('Previnca Seguros', 'PREVINCA SEGUROS SOCIEDAD ANONIMA', '30-50006614-4'),
  ('Providencia Seguros', 'PROVIDENCIA COMPAÑIA ARGENTINA DE SEGUROS S.A.', '30-67729047-8'),
  ('Provincia Seguros', 'PROVINCIA SEGUROS SOCIEDAD ANONIMA', '30-52750816-5'),
  ('Qualia Seguros', 'QUALIA COMPAÑÍA DE SEGUROS S.A.', '30-71449680-4'),
  ('Segurcoop Seguros', 'SEGURCOOP COOPERATIVA DE SEGUROS LIMITADA', '30-50005727-7'),
  ('Segurometal Seguros', 'SEGUROMETAL COOPERATIVA DE SEGUROS LIMITADA', '30-50005536-3'),
  ('Seguros de Jujuy', 'COMPAÑÍA DE SEGUROS DE JUJUY SOCIEDAD DEL ESTADO', '30-71779478-4'),
  ('Seguros de Santa Cruz', 'COMPAÑÍA DE SEGUROS GENERALES DE LA PROVINCIA DE SANTA CRUZ SOCIEDAD ANÓNIMA', '33-71819294-9'),
  ('Seguros Médicos', 'SEGUROS MÉDICOS SAU', '30-70834090-8'),
  ('SMSV Seguros', 'SMSV COMPAÑIA ARGENTINA DE SEGUROS S.A.', '30-70833318-9'),
  ('Sol Naciente Seguros', 'SOL NACIENTE SEGUROS SOCIEDAD ANONIMA', '30-68250955-0'),
  ('Starr Indemnity', 'STARR INDEMNITY & LIABILITY COMPANY, SUCURSAL ARGENTINA, DE SEGUROS', '30-71212247-8'),
  ('Sumicli Seguros', 'SUMICLI ASOCIACION MUTUAL DE SEGUROS', '33-69068597-9'),
  ('Testimonio Seguros', 'TESTIMONIO COMPAÑÍA DE SEGUROS S.A.', '30-68624433-0'),
  ('Tutelar Seguros', 'TUTELAR SEGUROS SOCIEDAD ANONIMA', '30-71144275-4'),
  ('Victoria', 'COMPAÑIA ARGENTINA DE SEGUROS VICTORIA SOCIEDAD ANONIMA', '30-50003226-6'),
  ('Warranty Insurance', 'WARRANTY INSURANCE COMPANY ARGENTINA DE SEGUROS SOCIEDAD ANÓNIMA', '30-50005000-0'),
  ('Woranz Seguros', 'WORANZ COMPAÑÍA DE SEGUROS S.A.', '30-71216248-8'),
  ('Zurich Santander Seguros', 'ZURICH SANTANDER SEGUROS ARGENTINA S.A.', '30-69896545-9')
on conflict (compania) do update set
  razon_social = coalesce(nullif(pas_companias.razon_social, ''), excluded.razon_social),
  cuit         = coalesce(nullif(pas_companias.cuit, ''), excluded.cuit);

-- Control: 112 o más fichas, y cuántas siguen sin CUIT o sin razón social
select count(*) as fichas_112, count(*) filter (where coalesce(cuit, '') = '') as sin_cuit,
       count(*) filter (where coalesce(razon_social, '') = '') as sin_razon_social from public.pas_companias;

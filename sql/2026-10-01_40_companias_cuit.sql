-- SQL 40 · Fichas de compañías (2026-10-01). Se puede volver a correr sin problema. Requiere el SQL 39.
--   1) Crea la ficha de las compañías que tienen casos y todavía no tienen ficha.
--   2) Carga el CUIT de 17 compañías (sacados de las facturas de ARCA; dígito verificador controlado).
--      Solo completa el CUIT si está vacío: no pisa uno cargado a mano.
--   3) Borra las columnas legal_* (sin uso desde que el domicilio legal es el mismo que el de notificar).

-- 1) Fichas que faltan (una por cada nombre que aparece en los casos)
insert into public.pas_companias (compania)
select distinct trim(compania_aseguradora) from public.pas_casos
where coalesce(trim(compania_aseguradora), '') <> ''
on conflict (compania) do nothing;

-- 2) CUIT
update public.pas_companias c set cuit = v.cuit
from (values
  ('Federación Patronal',  '33-70736658-9'),
  ('Sancor Seguros',       '30-50004946-0'),
  ('Mercantil Andina',     '30-50003691-1'),
  ('ATM Seguros',          '30-69940815-4'),
  ('Rivadavia Seguros',    '30-50005031-0'),
  ('La Holando',           '33-50003806-9'),
  ('Zurich',               '30-50004977-0'),
  ('La Caja',              '30-66320562-1'),
  ('Mapfre',               '30-50000753-9'),
  ('San Cristobal',        '34-50004533-9'),
  ('Triunfo Seguros',      '30-50006577-6'),
  ('Parana Seguros',       '30-50005710-2'),
  ('Galicia Seguros',      '30-50000012-7'),
  ('El Norte Seguros',     '30-50004045-5'),
  ('La Segunda',           '30-50001770-4'),
  ('Rio Uruguay Seguros',  '30-50006171-1'),
  ('Nacion Seguros',       '30-67856116-5')
) as v(compania, cuit)
where c.compania = v.compania and coalesce(c.cuit, '') = '';

-- 3) Columnas sin uso
alter table public.pas_companias drop column if exists legal_domicilio;
alter table public.pas_companias drop column if exists legal_cp;
alter table public.pas_companias drop column if exists legal_localidad;
alter table public.pas_companias drop column if exists legal_provincia;

-- Control: 26 fichas, 17 con CUIT, 0 columnas legal_*
select (select count(*) from public.pas_companias) as fichas_26,
       (select count(*) from public.pas_companias where coalesce(cuit, '') <> '') as con_cuit_17,
       (select count(*) from information_schema.columns
         where table_name = 'pas_companias' and column_name like 'legal\_%') as legal_0;

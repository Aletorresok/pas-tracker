-- Domicilios de 18 compañías (2026-10-03). Se puede volver a correr sin problema.
--   Es el domicilio legal / casa central, el que usan las cartas documento y los escritos.
--   Solo completa lo que está vacío: no pisa un domicilio, CP, localidad o provincia cargados a mano.
--   CP solo donde la localidad tiene uno solo (La Plata, Rosario, Sunchales, Munro, Salta); en CABA depende de la calle.
--   ATM: se usa Florida 833 (también figura Av. Juan de Garay 151, CABA).
--   Digna: se usa la sede estatutaria, Esmeralda 920 (también figura Arias 3751, Piso 3, CABA).

insert into public.pas_companias (compania)
select v.compania from (values ('Rivadavia Seguros'), ('ATM Seguros'), ('La Caja'), ('Federación Patronal'), ('Mercantil Andina'),
  ('San Cristobal'), ('Prudencia Seguros'), ('Sancor Seguros'), ('Parana Seguros'), ('Proteccion Mutual'), ('Agrosalta'),
  ('La Segunda'), ('Libra Seguros'), ('Mapfre'), ('SMG Seguros'), ('Antartida'), ('Digna Seguros'), ('Nacion Seguros')) v(compania)
on conflict (compania) do nothing;

update public.pas_companias c set
  domicilio = coalesce(nullif(trim(c.domicilio), ''), v.domicilio),
  cp        = coalesce(nullif(trim(c.cp), ''), v.cp),
  localidad = coalesce(nullif(trim(c.localidad), ''), v.localidad),
  provincia = coalesce(nullif(trim(c.provincia), ''), v.provincia)
from (values
  ('Rivadavia Seguros',   'Avenida 7 N° 755',                          '1900', 'La Plata',                         'Buenos Aires'),
  ('ATM Seguros',         'Florida 833, Piso 2, Depto. 207',           null,   'Ciudad Autónoma de Buenos Aires',  null),
  ('La Caja',             'Fitz Roy 957',                              null,   'Ciudad Autónoma de Buenos Aires',  null),
  ('Federación Patronal', 'Calle 51 N° 770',                           '1900', 'La Plata',                         'Buenos Aires'),
  ('Mercantil Andina',    'Av. Belgrano 672',                          null,   'Ciudad Autónoma de Buenos Aires',  null),
  ('San Cristobal',       'Italia 646',                                '2000', 'Rosario',                          'Santa Fe'),
  ('Prudencia Seguros',   '25 de Mayo 489, Piso 6',                    null,   'Ciudad Autónoma de Buenos Aires',  null),
  ('Sancor Seguros',      'Ruta Nacional 34, Km 257',                  '2322', 'Sunchales',                        'Santa Fe'),
  ('Parana Seguros',      'Maipú 215, Piso 6',                         null,   'Ciudad Autónoma de Buenos Aires',  null),
  ('Proteccion Mutual',   'San Luis 3130',                             null,   'Ciudad Autónoma de Buenos Aires',  null),
  ('Agrosalta',           'Pedernera 237',                             '4400', 'Salta',                            'Salta'),
  ('La Segunda',          'Brig. Gral. Juan Manuel de Rosas 957',      '2000', 'Rosario',                          'Santa Fe'),
  ('Libra Seguros',       'Guayrá 1737',                               null,   'Ciudad Autónoma de Buenos Aires',  null),
  ('Mapfre',              'Alférez Hipólito Bouchard 4191',            '1605', 'Munro',                            'Buenos Aires'),
  ('SMG Seguros',         'Sarmiento 487',                             null,   'Ciudad Autónoma de Buenos Aires',  null),
  ('Antartida',           'Reconquista 629, Piso 4, Of. 8',            null,   'Ciudad Autónoma de Buenos Aires',  null),
  ('Digna Seguros',       'Esmeralda 920, Piso 25, Of. 07',            null,   'Ciudad Autónoma de Buenos Aires',  null),
  ('Nacion Seguros',      'San Martín 913',                            null,   'Ciudad Autónoma de Buenos Aires',  null)
) v(compania, domicilio, cp, localidad, provincia)
where c.compania = v.compania;

-- Control: las 18, con lo que quedó cargado (si alguna ya tenía otro domicilio, se ve acá y no se pisó)
select compania, domicilio, cp, localidad, provincia from public.pas_companias
where compania in ('Rivadavia Seguros', 'ATM Seguros', 'La Caja', 'Federación Patronal', 'Mercantil Andina', 'San Cristobal',
  'Prudencia Seguros', 'Sancor Seguros', 'Parana Seguros', 'Proteccion Mutual', 'Agrosalta', 'La Segunda', 'Libra Seguros',
  'Mapfre', 'SMG Seguros', 'Antartida', 'Digna Seguros', 'Nacion Seguros')
order by compania;

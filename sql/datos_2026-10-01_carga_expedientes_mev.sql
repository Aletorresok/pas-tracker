-- Carga de expedientes de la Provincia de Buenos Aires (MEV) y de la Justicia Nacional (PJN). 2026-10-01.
-- Se puede volver a correr: no inserta si ya existe un expediente con el mismo número y juzgado.
-- "Autorizada - fecha" del portal queda en notas (es la fecha de autorización del letrado, no la de inicio).
-- MG-6061-2024 figura dos veces en el portal: pasó del Civil y Comercial 3 de Gral. Rodríguez al Civil y Comercial 1 de Moreno.
-- Se carga una sola vez, en Moreno.
begin;
insert into public.expedientes (numero, caratula, fuero, jurisdiccion, juzgado, estado, portal, notas)
select v.numero, v.caratula, v.fuero, 'PBA', v.juzgado, 'activo', 'mev', v.notas
from (values
  ('MG-3846-2026',  'ATALA MICAELA LILIAN C/ FERNANDEZ IVAN ANIBAL S/ DIVORCIO POR PRESENTACION UNILATERAL', 'Familia',             'Juzgado de Familia N° 3 - Moreno (Gral. Rodríguez)',  'Autorizada en el portal el 11/03/2026'),
  ('MG-9129-2026',  'BOGADO DAIANA SOLEDAD Y OTRO/A C/ CHAZARRETA MATIAS NICOLAS S/ ALIMENTOS',             'Familia',             'Juzgado de Familia N° 2 - Moreno',                    'Autorizada en el portal el 26/05/2026'),
  ('MG-15732-2026', 'CISTERNAS EYERALDE RAMIRO Y OTRO/A C/ CISTERNAS YANIERO MARIANO ALEXIS S/ ALIMENTOS',  'Familia',             'Juzgado de Familia N° 2 - Moreno',                    'Autorizada en el portal el 03/09/2026'),
  ('MG-8443-2025',  'GODOY JORGE ARTURO S/ SUCESION AB-INTESTATO',                                         'Civil y Comercial',   'Juzgado en lo Civil y Comercial N° 2 - Moreno',       'Autorizada en el portal el 05/06/2025'),
  ('MG-1887-2023',  'MIRARCHI IVIS MAGELA S/ SUCESION AB-INTESTATO',                                       'Civil y Comercial',   'Juzgado en lo Civil y Comercial N° 1 - Moreno',       null),
  ('MG-8324-2021',  'MONTOJO ANA LAURA C/ PONCE CRISTIAN GABRIEL S/ ALIMENTOS',                            'Familia',             'Juzgado de Familia N° 2 - Moreno',                    null),
  ('MG-6061-2024',  'PESANTE ALBERTO ENRIQUE S/ SUCESION AB-INTESTATO',                                    'Civil y Comercial',   'Juzgado en lo Civil y Comercial N° 1 - Moreno',       'Antes radicado en el Juzgado en lo Civil y Comercial N° 3 de General Rodríguez'),
  ('42002',         'PESANTE MARÍA ISABEL S/ SUCESION AB-INTESTATO',                                       'Civil y Comercial',   'Juzgado en lo Civil y Comercial N° 5 - Quilmes',      null),
  ('LP-68555-2022', 'BARCELO JULIAN JORGE ALBERTO S/ SUCESION AB-INTESTATO',                               'Civil y Comercial',   'Juzgado de Primera Instancia en lo Civil y Comercial N° 27 - La Plata', null)
) as v(numero, caratula, fuero, juzgado, notas)
where not exists (
  select 1 from public.expedientes e where e.numero = v.numero and e.juzgado = v.juzgado
);

-- Justicia Nacional (PJN). La fecha es la de la última actuación que mostraba el PJN al 01/10/2026.
insert into public.expedientes (numero, caratula, fuero, jurisdiccion, juzgado, secretaria, estado, portal, notas)
select v.numero, v.caratula, v.fuero, 'CABA', v.juzgado, v.secretaria, 'activo', 'pjn', v.notas
from (values
  ('CIV 092392/2024', 'LESCANO, MIGUEL ANGEL Y OTRO S/SUCESION AB-INTESTATO',                                                  'Civil y Comercial', 'Juzgado Nacional en lo Civil N° 61',                    'Secretaría N° 91', 'Última actuación en el PJN: 18/07/2025'),
  ('CIV 062595/2021', 'SALOMONE, PABLO ARIEL C/ VILARDO, DIEGO HERNAN Y OTROS S/DAÑOS Y PERJUICIOS(ACC.TRAN. C/LES. O MUERTE)', 'Civil y Comercial', 'Juzgado Nacional en lo Civil N° 42',                    'Secretaría N° 72', 'Última actuación en el PJN: 08/09/2026'),
  ('CNT 048153/2022', 'SCHILIRO, CATALINA MARIA C/ FMIND ENTERPRISES S.A.S. Y OTRO S/DESPIDO',                                'Laboral',           'Juzgado Nacional de 1ra Instancia del Trabajo N° 30', null,               'Última actuación en el PJN: 27/08/2026')
) as v(numero, caratula, fuero, juzgado, secretaria, notas)
where not exists (
  select 1 from public.expedientes e where e.numero = v.numero and e.juzgado = v.juzgado
);

-- Caso a iniciar: Zapata Bruno Julián (despido indirecto). Sin número ni juzgado hasta el sorteo.
-- Documentación en Documents\ATG LexSolutions\Bruno Zapata.
insert into public.expedientes (caratula, fuero, jurisdiccion, estado, cliente_nombre, cliente_dni, rol_cliente, contraparte,
                                proxima_accion, portal, notas)
select 'ZAPATA BRUNO JULIAN C/ COOPERATIVA DE PROVISION DE ENSEÑANZA NUEVA GENERACION LIMITADA S/ DESPIDO',
       'Laboral', 'PBA', 'activo', 'Zapata Bruno Julián', '39.599.670', 'actora',
       'Cooperativa de Provisión de Enseñanza Nueva Generación Ltda. (Paraguay 6945, Moreno)',
       'Completar y presentar la demanda', 'mev',
       'Docente de Matemáticas desde el 04/11/2024. TCL intimación 11/02/2026 (CD255037853), recibido 18/02/2026. '
       || 'Despido indirecto 25/02/2026 (CD255036570). CD de la demandada del 24/02/2026, rechazada por TCL del 12/03/2026. '
       || 'Liquidación preliminar: $2.322.885,49 (sin aportes ni vacaciones proporcionales). '
       || 'Prescripción (art. 256 LCT): 25/02/2028.'
where not exists (
  select 1 from public.expedientes e where e.cliente_dni = '39.599.670' and e.fuero = 'Laboral'
);

-- Caso a iniciar: sucesión de Valeria Vogel. Documentación en Drive, carpeta "Vogel Valeria Sucesion".
insert into public.expedientes (caratula, fuero, jurisdiccion, estado, cliente_nombre, cliente_dni, rol_cliente,
                                proxima_accion, portal, notas)
select 'VOGEL VALERIA S/ SUCESION AB-INTESTATO',
       'Civil y Comercial', 'PBA', 'activo', 'Torres Vogel Dagoberto José', '20.514.732', 'actora',
       'Completar el escrito de inicio y presentar', 'mev',
       'Causante: Valeria Vogel, DNI 4.132.523, fallecida el 08/06/2024; último domicilio Ituzaingó 1990, Moreno '
       || '(depto. judicial Moreno - Gral. Rodríguez). Acta de defunción: Moreno, tomo 5D, acta 89, año 2024. '
       || 'Herederos (hijos): Dagoberto José Torres Vogel (DNI 20.514.732) y Guillermo Horacio Ojeda (DNI 16.917.045). '
       || 'Escrito de inicio en Drive: https://docs.google.com/document/d/1jl77QiAQ2hQanucE0TFWcxlAeVqIITGBMCq3WaXTKpE/edit'
where not exists (
  select 1 from public.expedientes e where e.caratula = 'VOGEL VALERIA S/ SUCESION AB-INTESTATO'
);
commit;

-- SQL 42 · Honorarios % y plazo de pago de cada compañía, calculados con los casos (2026-10-01).
-- Se puede volver a correr. Después se ajustan a mano en la ficha de la compañía.
--   · honorarios_pct = tus honorarios / indemnización, en los casos no desistidos que tienen las dos cosas.
--   · plazo_pago_dias = mediana de días entre la firma (o la aceptación, si no hay firma) y el pago, en los casos cobrados.
-- Quedan afuera a propósito: % de Mercantil Andina (15 y 10) y San Cristóbal (10 y 15), que se cargan a mano,
-- y el plazo de Paraná (un solo caso, 116 días).

update public.pas_companias c set honorarios_pct = v.pct
from (values
  ('Federación Patronal', 15), ('La Caja', 15), ('Zurich', 15), ('Galicia Seguros', 15), ('La Segunda', 15),
  ('Rivadavia Seguros', 12),
  ('Sancor Seguros', 10), ('Rio Uruguay Seguros', 10), ('La Holando', 10), ('Triunfo Seguros', 10),
  ('El Norte Seguros', 10), ('Nacion Seguros', 10), ('Parana Seguros', 10), ('Mapfre', 10)
) as v(compania, pct)
where c.compania = v.compania;

update public.pas_companias c set plazo_pago_dias = v.dias
from (values
  ('Federación Patronal', 8), ('Galicia Seguros', 12), ('Sancor Seguros', 16), ('Mapfre', 21), ('La Holando', 23),
  ('Triunfo Seguros', 27), ('San Cristobal', 31), ('La Segunda', 31), ('Zurich', 48), ('Mercantil Andina', 51)
) as v(compania, dias)
where c.compania = v.compania;

-- Control: 15 con % (las 14 de acá + ATM, que ya tenía 15) y 10 plazos actualizados
select count(*) filter (where honorarios_pct is not null) as con_pct_15,
       count(*) filter (where plazo_pago_dias is not null) as con_plazo
from public.pas_companias;

-- ============================================================
-- Plazo (cuenta regresiva) para la "Próxima acción" de cada caso.
-- Guarda la fecha de vencimiento; la app calcula los días que faltan
-- y ordena "Mis pendientes" del más urgente al menos urgente.
-- Seguro de correr más de una vez.
-- ============================================================
alter table public.pas_casos
  add column if not exists proxima_accion_vence date;

-- Verificación: tiene que devolver una fila con data_type = date
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'pas_casos' and column_name = 'proxima_accion_vence';

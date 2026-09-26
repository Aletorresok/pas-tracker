-- Porcentaje de honorarios que paga cada compañía (2026-09-26), para la proyección de Análisis → Flujo de caja.
-- Es el % sobre la indemnización. Si una compañía no lo tiene cargado, la app usa lo que surge de tus casos cobrados.
-- Se puede volver a correr sin problema.

alter table public.pas_companias add column if not exists honorarios_pct numeric check (honorarios_pct is null or (honorarios_pct > 0 and honorarios_pct <= 100));

-- Control
select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'pas_companias' and column_name = 'honorarios_pct';

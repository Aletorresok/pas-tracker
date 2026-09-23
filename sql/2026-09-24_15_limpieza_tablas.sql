-- Limpieza de tablas y columnas sin uso (confirmada el 24/09 con el diagnóstico:
-- notas_log en 47 casos, recordatorio en 7, pas_recordatorios 8 filas, aseguradoras / casos / gestiones_judiciales vacías).
-- El código que las usaba ya se quitó (PR #24). Correr cada paso por separado, en orden.

-- ── PASO 1: copia de seguridad en el esquema backup_20260924 ──
create schema if not exists backup_20260924;
create table if not exists backup_20260924.pas_casos_notas as select id, notas_log, recordatorio from public.pas_casos;
create table if not exists backup_20260924.pas_recordatorios as table public.pas_recordatorios;
alter table backup_20260924.pas_casos_notas enable row level security;
alter table backup_20260924.pas_recordatorios enable row level security;
select (select count(*) from backup_20260924.pas_casos_notas) as casos_copiados, (select count(*) from backup_20260924.pas_recordatorios) as recordatorios_copiados;

-- ── PASO 2: la bitácora vieja (notas_log) pasa a la tabla acciones (sin duplicar lo que ya está) ──
insert into public.acciones (caso_id, tipo, descripcion, fecha)
select c.id::text, 'nota', e->>'texto',
       case when (e->>'fecha') ~ '^\d{4}-\d{2}-\d{2}' then (left(e->>'fecha', 10) || ' 12:00:00-03')::timestamptz
            when (e->>'ts') ~ '^\d{10,13}$' then to_timestamp((e->>'ts')::bigint / 1000.0)
            else now() end
from public.pas_casos c, jsonb_array_elements(case when jsonb_typeof(c.notas_log) = 'array' then c.notas_log else '[]'::jsonb end) e
where jsonb_typeof(e) = 'object' and nullif(trim(e->>'texto'), '') is not null
  and not exists (select 1 from public.acciones a where a.caso_id = c.id::text and a.descripcion = e->>'texto');

-- ── PASO 3: borrar (solo después de que los pasos 1 y 2 salieron bien) ──
alter table public.pas_casos drop column if exists notas_log;
alter table public.pas_casos drop column if exists recordatorio;
drop table if exists public.pas_recordatorios;
drop table if exists public.gestiones_judiciales;
drop table if exists public.aseguradoras;
drop table if exists public.casos;

-- ── PASO 4: control (tienen que quedar solo las tablas que usa la app) ──
select tablename as tabla from pg_tables where schemaname = 'public' order by 1;

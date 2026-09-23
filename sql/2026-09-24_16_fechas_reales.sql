-- Fechas guardadas como texto → fechas reales (tipo date).
-- pas_casos: fecha_siniestro, fecha_derivacion, fecha_contacto_asegurado, fecha_inicio_reclamo, fecha_ultimo_movimiento
-- pas_historial: fecha
-- La app ya lee y escribe "AAAA-MM-DD", que es como Supabase devuelve las fechas: no cambia nada visible.
-- Correr cada paso por separado, en orden. El paso B guarda una copia en el esquema backup_fechas.

-- ── PASO A: diagnóstico (crea una función auxiliar y solo mira; no cambia datos) ──
create or replace function public.texto_a_fecha(t text) returns date
language plpgsql immutable as $fn$
declare
  s text := trim(coalesce(t, ''));
  m text[];
begin
  if s = '' then return null; end if;
  if s ~ '^\d{4}-\d{2}-\d{2}' then return left(s, 10)::date; end if;                -- 2026-09-24 o 2026-09-24T…
  m := regexp_match(s, '^(\d{1,2})/(\d{1,2})/(\d{2,4})$');                          -- 24/9/2026 o 24/09/26
  if m is not null then
    return make_date(case when length(m[3]) = 2 then 2000 + m[3]::int else m[3]::int end, m[2]::int, m[1]::int);
  end if;
  return null;
exception when others then
  return null;
end $fn$;

with v as (
  select 'pas_casos.fecha_siniestro' as columna, fecha_siniestro::text as valor from public.pas_casos
  union all select 'pas_casos.fecha_derivacion', fecha_derivacion::text from public.pas_casos
  union all select 'pas_casos.fecha_contacto_asegurado', fecha_contacto_asegurado::text from public.pas_casos
  union all select 'pas_casos.fecha_inicio_reclamo', fecha_inicio_reclamo::text from public.pas_casos
  union all select 'pas_casos.fecha_ultimo_movimiento', fecha_ultimo_movimiento::text from public.pas_casos
  union all select 'pas_historial.fecha', fecha::text from public.pas_historial
)
select columna,
       count(*) filter (where nullif(trim(valor), '') is null) as vacias,
       count(*) filter (where public.texto_a_fecha(valor) is not null) as se_convierten,
       count(*) filter (where nullif(trim(valor), '') is not null and public.texto_a_fecha(valor) is null) as no_se_convierten,
       (array_agg(distinct valor) filter (where nullif(trim(valor), '') is not null and public.texto_a_fecha(valor) is null))[1:5] as ejemplos_que_no
  from v
 group by columna
 order by columna;

-- ── PASO B: copia de seguridad + conversión (correr después de revisar el paso A) ──
create schema if not exists backup_fechas;
create table if not exists backup_fechas.pas_casos as
  select id, fecha_siniestro, fecha_derivacion, fecha_contacto_asegurado, fecha_inicio_reclamo, fecha_ultimo_movimiento from public.pas_casos;
create table if not exists backup_fechas.pas_historial as select id, fecha from public.pas_historial;
alter table backup_fechas.pas_casos enable row level security;
alter table backup_fechas.pas_historial enable row level security;

alter table public.pas_casos
  alter column fecha_siniestro          type date using public.texto_a_fecha(fecha_siniestro::text),
  alter column fecha_derivacion         type date using public.texto_a_fecha(fecha_derivacion::text),
  alter column fecha_contacto_asegurado type date using public.texto_a_fecha(fecha_contacto_asegurado::text),
  alter column fecha_inicio_reclamo     type date using public.texto_a_fecha(fecha_inicio_reclamo::text),
  alter column fecha_ultimo_movimiento  type date using public.texto_a_fecha(fecha_ultimo_movimiento::text);
alter table public.pas_historial
  alter column fecha type date using public.texto_a_fecha(fecha::text);

-- ── PASO C: limpieza y control (tienen que decir "date") ──
drop function if exists public.texto_a_fecha(text);
select table_name as tabla, column_name as columna, data_type as tipo
  from information_schema.columns
 where table_schema = 'public'
   and ((table_name = 'pas_casos' and column_name in ('fecha_siniestro', 'fecha_derivacion', 'fecha_contacto_asegurado', 'fecha_inicio_reclamo', 'fecha_ultimo_movimiento'))
     or (table_name = 'pas_historial' and column_name = 'fecha'))
 order by 1, 2;

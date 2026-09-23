-- Limpieza de la base (deuda técnica). En 4 pasos cortos: correr cada uno por separado, en orden.
-- (La primera versión en un solo bloque falló en el editor de Supabase con
--  'relation "public" does not exist'; no se aplicó nada.)
-- Hay backup completo en el esquema backup_20260922.

-- ── PASO A: columnas viejas dominio / compania y trigger puente ──────────────
update public.pas_casos set patente = upper(trim(dominio))
 where nullif(trim(patente), '') is null and nullif(trim(dominio), '') is not null;
update public.pas_casos set compania_aseguradora = trim(compania)
 where nullif(trim(compania_aseguradora), '') is null and nullif(trim(compania), '') is not null;
drop trigger if exists trg_pas_casos_sync_columnas_viejas on public.pas_casos;
drop function if exists public.pas_casos_sync_columnas_viejas();
alter table public.pas_casos drop column if exists dominio;
alter table public.pas_casos drop column if exists compania;

-- ── PASO B: ver montos reclamados que no sean un número simple ───────────────
select id, asegurado, monto_reclamado
  from public.pas_casos
 where monto_reclamado is not null
   and trim(monto_reclamado::text) != ''
   and trim(monto_reclamado::text) !~ '^[0-9]+([.][0-9]+)?$';

-- ── PASO C: monto_reclamado → número (correr solo si el paso B no mostró nada raro) ──
-- Quita $, espacios y puntos de miles; la coma decimal pasa a punto.
alter table public.pas_casos
  alter column monto_reclamado type numeric
  using nullif(
          case
            when trim(monto_reclamado::text) ~ '^[0-9]+([.][0-9]+)?$' then trim(monto_reclamado::text)
            else replace(regexp_replace(monto_reclamado::text, '[^0-9,]', '', 'g'), ',', '.')
          end, '')::numeric;

-- ── PASO D: esquema actualizado (para regenerar schema.sql) ─────────────────
select table_name as tabla, column_name as columna, data_type as tipo, is_nullable as nulo, column_default as defecto
  from information_schema.columns
 where table_schema = 'public'
 order by table_name, ordinal_position;

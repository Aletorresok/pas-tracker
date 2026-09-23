-- Limpieza de la base (deuda técnica). Todo en una transacción: si algo falla, no se aplica nada.
--   1) Borra las columnas viejas dominio y compania (reemplazadas por patente y compania_aseguradora)
--      y el trigger puente que las copiaba.
--   2) Pasa monto_reclamado de texto a número. Si encuentra un valor que no sabe leer, frena y lo muestra.
--   3) Devuelve el esquema actualizado (para regenerar schema.sql).
-- Hay backup completo en el esquema backup_20260922.

-- 1) Último copiado por las dudas y fuera columnas viejas
update public.pas_casos set patente = upper(trim(dominio))
 where nullif(trim(patente), '') is null and nullif(trim(dominio), '') is not null;
update public.pas_casos set compania_aseguradora = trim(compania)
 where nullif(trim(compania_aseguradora), '') is null and nullif(trim(compania), '') is not null;

drop trigger if exists trg_pas_casos_sync_columnas_viejas on public.pas_casos;
drop function if exists public.pas_casos_sync_columnas_viejas();
alter table public.pas_casos drop column if exists dominio, drop column if exists compania;

-- 2) monto_reclamado → numeric. Entiende 800000 · 800.000 · 800.000,50 · 800000,5 · 800000.5 · $ 800.000
create or replace function pg_temp.a_numero(t text) returns numeric language plpgsql immutable as $fn$
declare s text := regexp_replace(coalesce(t, ''), '[\s$]', '', 'g');
begin
  if s = '' then return null; end if;
  if s ~ '^-?\d+$' then return s::numeric; end if;
  if s ~ '^-?\d{1,3}(\.\d{3})+(,\d+)?$' then return replace(replace(s, '.', ''), ',', '.')::numeric; end if;
  if s ~ '^-?\d+,\d+$' then return replace(s, ',', '.')::numeric; end if;
  if s ~ '^-?\d+\.\d+$' then return s::numeric; end if;
  if s ~ '^-?\d{1,3}(,\d{3})+(\.\d+)?$' then return replace(s, ',', '')::numeric; end if;
  raise exception 'monto_reclamado que no se pudo leer: "%". Corregilo a mano y volvé a correr el script.', t;
end $fn$;

alter table public.pas_casos
  alter column monto_reclamado type numeric using pg_temp.a_numero(monto_reclamado::text);

-- 3) Esquema actualizado (copiá el resultado y pasámelo)
select string_agg(format(E'create table public.%I (\n%s\n);', table_name, cols), E'\n\n' order by table_name) as esquema
  from (select table_name,
               string_agg(format('  %I %s%s%s', column_name,
                                 case when data_type in ('ARRAY', 'USER-DEFINED') then udt_name else data_type end,
                                 case when is_nullable = 'NO' then ' not null' else '' end,
                                 case when column_default is not null then ' default ' || column_default else '' end),
                          E',\n' order by ordinal_position) as cols
          from information_schema.columns
         where table_schema = 'public'
         group by table_name) t;

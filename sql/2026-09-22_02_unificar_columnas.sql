-- ============================================================
-- Unificar columnas duplicadas en pas_casos
--   dominio  → patente
--   compania → compania_aseguradora
-- Requiere haber corrido antes 2026-09-22_01_backup.sql
-- ============================================================

-- 1) DIAGNÓSTICO (opcional, correr primero): casos donde las dos columnas
--    tienen valores DISTINTOS. Si devuelve filas, revisarlas antes de seguir:
--    el paso 2 conserva el valor de la columna nueva.
select id, asegurado, patente, dominio, compania_aseguradora, compania
from public.pas_casos
where (nullif(trim(patente),'') is not null and nullif(trim(dominio),'') is not null and upper(trim(patente)) <> upper(trim(dominio)))
   or (nullif(trim(compania_aseguradora),'') is not null and nullif(trim(compania),'') is not null and trim(compania_aseguradora) <> trim(compania));

-- 2) COPIAR los datos viejos a las columnas nuevas (solo donde la nueva está vacía)
begin;
update public.pas_casos
   set patente = upper(trim(dominio))
 where nullif(trim(patente),'') is null and nullif(trim(dominio),'') is not null;

update public.pas_casos
   set compania_aseguradora = trim(compania)
 where nullif(trim(compania_aseguradora),'') is null and nullif(trim(compania),'') is not null;
commit;

-- 3) PUENTE TEMPORAL: si algún cliente viejo (ej. un .exe desactualizado)
--    sigue escribiendo en dominio/compania, el trigger lo copia a las columnas nuevas.
create or replace function public.pas_casos_sync_columnas_viejas()
returns trigger language plpgsql as $$
begin
  if nullif(trim(new.patente),'') is null and nullif(trim(new.dominio),'') is not null then
    new.patente := upper(trim(new.dominio));
  end if;
  if nullif(trim(new.compania_aseguradora),'') is null and nullif(trim(new.compania),'') is not null then
    new.compania_aseguradora := trim(new.compania);
  end if;
  return new;
end $$;

drop trigger if exists trg_pas_casos_sync_columnas_viejas on public.pas_casos;
create trigger trg_pas_casos_sync_columnas_viejas
  before insert or update on public.pas_casos
  for each row execute function public.pas_casos_sync_columnas_viejas();

-- 4) VERIFICACIÓN: tiene que dar 0 en ambas columnas
select
  count(*) filter (where nullif(trim(patente),'') is null and nullif(trim(dominio),'') is not null) as patente_sin_migrar,
  count(*) filter (where nullif(trim(compania_aseguradora),'') is null and nullif(trim(compania),'') is not null) as compania_sin_migrar
from public.pas_casos;

-- 5) MÁS ADELANTE (no ahora): cuando la app nueva esté andando unas semanas,
--    borrar las columnas viejas y el trigger puente.
-- drop trigger if exists trg_pas_casos_sync_columnas_viejas on public.pas_casos;
-- drop function if exists public.pas_casos_sync_columnas_viejas();
-- alter table public.pas_casos drop column dominio, drop column compania;

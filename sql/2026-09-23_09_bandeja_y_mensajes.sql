-- Etapa 11: bandeja "Nuevos del portal" y mensajes con un toque. Solo agrega columnas; no borra nada.
-- Se puede volver a correr sin problema.

alter table public.pas_casos add column if not exists origen text;               -- 'portal' | 'estudio' (los viejos quedan vacíos)
alter table public.pas_casos add column if not exists revisado_en timestamptz;   -- cuándo lo tomaste; vacío = sin revisar
alter table public.pas_casos add column if not exists telefono_asegurado text;   -- antes el portal lo guardaba en tercero_contacto

-- Casos viejos cargados desde el portal: el teléfono del asegurado estaba en tercero_contacto.
-- Solo se copia cuando no hay tercero cargado (si hay nombre de tercero, ese contacto es del tercero).
update public.pas_casos
   set telefono_asegurado = tercero_contacto
 where telefono_asegurado is null
   and nullif(trim(tercero_nombre), '') is null
   and regexp_replace(coalesce(tercero_contacto, ''), '\D', '', 'g') ~ '^\d{8,13}$';

-- Control
select count(*) filter (where telefono_asegurado is not null) as casos_con_telefono,
       count(*) as casos
  from public.pas_casos;

-- 44 · Datos del siniestro para cargar los reclamos (ficha del caso → Datos)
-- Póliza del cliente, titular, conductor, hora del hecho y datos del tercero según la denuncia.
-- Correr en el SQL Editor de Supabase antes de usar los grupos nuevos de la ficha.

alter table public.pas_casos add column if not exists cia_propia             text;  -- compañía del cliente (la que tomó la denuncia)
alter table public.pas_casos add column if not exists nro_siniestro_propio   text;  -- N° de siniestro o denuncia en la compañía del cliente
alter table public.pas_casos add column if not exists poliza_propia          text;  -- póliza del cliente
alter table public.pas_casos add column if not exists productor_poliza       text;  -- productor que figura en la póliza
alter table public.pas_casos add column if not exists cobertura              text;  -- plan / cobertura
alter table public.pas_casos add column if not exists vigencia_desde         date;
alter table public.pas_casos add column if not exists vigencia_hasta         date;
alter table public.pas_casos add column if not exists titular_poliza         text;  -- vacío = el asegurado
alter table public.pas_casos add column if not exists conductor_nombre       text;  -- vacío = conducía el asegurado
alter table public.pas_casos add column if not exists conductor_dni          text;
alter table public.pas_casos add column if not exists conductor_tel          text;
alter table public.pas_casos add column if not exists hora_siniestro         time;
alter table public.pas_casos add column if not exists tercero_conductor      text;  -- si no es el propietario
alter table public.pas_casos add column if not exists tercero_cia            text;  -- aseguradora del tercero según la denuncia
alter table public.pas_casos add column if not exists observaciones_siniestro text; -- testigos, atención médica, domicilios distintos, etc.

-- Control: tienen que aparecer las 15 columnas
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'pas_casos'
  and column_name in ('cia_propia','nro_siniestro_propio','poliza_propia','productor_poliza','cobertura','vigencia_desde','vigencia_hasta',
    'titular_poliza','conductor_nombre','conductor_dni','conductor_tel','hora_siniestro','tercero_conductor','tercero_cia','observaciones_siniestro')
order by column_name;

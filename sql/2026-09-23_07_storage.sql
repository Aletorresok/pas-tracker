-- Seguridad de archivos (Supabase Storage).
--   · casos    → documentos de cada caso (los usa solo la app del estudio): PRIVADO, solo administrador.
--   · adjuntos → lo que suben los PAS desde el portal. Sigue público para que funcionen los links que
--                llegan por mail (los nombres son aleatorios), pero:
--                  - cada PAS solo puede subir a su propia carpeta (<pas_id>/...),
--                  - nadie puede listar la carpeta ni borrar/modificar archivos, salvo el administrador.
-- Se puede volver a correr sin problema.

update storage.buckets set public = false where id = 'casos';

do $fn$
declare p record;
begin
  -- Se borran las políticas anteriores de los archivos para empezar de cero
  for p in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $fn$;

-- El administrador puede todo en todas las carpetas
create policy admin_archivos on storage.objects
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- Cada PAS sube adjuntos solo a su carpeta
create policy pas_sube_adjuntos on storage.objects
  for insert to authenticated
  with check (bucket_id = 'adjuntos' and (storage.foldername(name))[1] = (select public.mi_pas_id()));

-- Control: casos tiene que decir public = false, adjuntos public = true
select id as carpeta, public from storage.buckets order by id;

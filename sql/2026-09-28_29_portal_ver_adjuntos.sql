-- SQL 29 · Portal: el PAS ve la documentación que ya mandó (2026-09-28). Se puede volver a correr sin problema.
-- Hasta ahora el PAS podía subir a su carpeta del bucket "adjuntos" pero no listarla. Con esto puede ver (solo)
-- sus propios archivos, así la tarjeta del caso muestra "Documentación que mandaste". No puede borrar ni cambiar nada.
-- Ojo: el SQL 07 borra todas las políticas de Storage al correrse; si alguna vez lo volvés a correr, corré este después.

drop policy if exists pas_ve_adjuntos on storage.objects;
create policy pas_ve_adjuntos on storage.objects
  for select to authenticated
  using (bucket_id = 'adjuntos' and (storage.foldername(name))[1] = (select public.mi_pas_id()));

-- Control: tiene que aparecer pas_ve_adjuntos (select) junto a pas_sube_adjuntos (insert) y admin_archivos
select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' order by policyname;

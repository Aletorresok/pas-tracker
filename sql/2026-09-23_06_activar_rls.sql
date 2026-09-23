-- Seguridad, paso 2 de 2: activa RLS en TODAS las tablas.
-- Correr SOLO después de haber entrado a la app nueva con tu mail y contraseña.
-- Después de esto, la clave pública de la app ya no alcanza para leer ni escribir nada:
--   · vos (administrador, con sesión iniciada) podés todo;
--   · cada PAS del portal ve y deriva solo sus casos (y los movimientos de esos casos);
--   · el cliente consulta por la función consultar_caso_cliente (patente + DNI).
-- Para volver atrás, ver el final del archivo.

do $fn$
declare
  t record;
  p record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    -- Se borran las políticas anteriores de la tabla para empezar de cero
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t.tablename loop
      execute format('drop policy %I on public.%I', p.policyname, t.tablename);
    end loop;
    -- El administrador puede todo
    execute format('create policy admin_todo on public.%I for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()))', t.tablename);
  end loop;
end $fn$;

-- Portal de productores: cada PAS ve solo lo suyo
create policy pas_ve_sus_casos on public.pas_casos
  for select to authenticated using (pas_id::text = (select public.mi_pas_id()));

create policy pas_deriva_casos on public.pas_casos
  for insert to authenticated with check (pas_id::text = (select public.mi_pas_id()));

create policy pas_ve_movimientos on public.acciones
  for select to authenticated using (exists (
    select 1 from public.pas_casos c
     where c.id::text = acciones.caso_id::text
       and c.pas_id::text = (select public.mi_pas_id())));

create policy pas_ve_su_usuario on public.pas_portal_users
  for select to authenticated using (user_id::text = auth.uid()::text);

create policy pas_ve_su_ficha on public.pas_lista
  for select to authenticated using (pas_id::text = (select public.mi_pas_id()));

-- Control: todas las tablas tienen que decir rls = true
select c.relname as tabla, c.relrowsecurity as rls,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as politicas
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by 1;

-- ── PARA VOLVER ATRÁS (solo si algo deja de andar) ─────────────────────────
-- Copiar y correr solo esto:
-- do $fn$ declare t record; begin
--   for t in select tablename from pg_tables where schemaname = 'public' loop
--     execute format('alter table public.%I disable row level security', t.tablename);
--   end loop;
-- end $fn$;

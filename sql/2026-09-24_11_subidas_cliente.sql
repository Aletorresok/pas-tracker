-- Etapa 15: el cliente sube su documentación desde su vista (patente + DNI).
-- Supabase funciona solo como "buzón de paso": la app lo baja a la carpeta del caso en tu PC y lo borra.
-- Crea cosas nuevas; no toca datos existentes. Se puede volver a correr sin problema.

-- 1) Carpeta privada "recepcion": máximo 15 MB por archivo, solo fotos y PDF
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recepcion', 'recepcion', false, 15728640,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 2) Registro de cada subida (autorizada → subida → guardada en la PC)
create table if not exists public.pas_subidas_cliente (
  id              uuid primary key default gen_random_uuid(),
  caso_id         uuid not null references public.pas_casos(id) on delete cascade,
  tipo            text not null,                      -- DNI | LICENCIA | CEDULA | FOTOS | DENUNCIA | CERTIFICADO | PRESUPUESTO | OTRO
  nombre_original text,
  ruta            text not null unique,               -- nombre del archivo en la carpeta "recepcion"
  estado          text not null default 'autorizada', -- autorizada | subida | guardada
  creado          timestamptz not null default now(),
  expira          timestamptz not null default now() + interval '15 minutes'
);
create index if not exists pas_subidas_cliente_caso_idx on public.pas_subidas_cliente (caso_id);
alter table public.pas_subidas_cliente enable row level security;
drop policy if exists admin_todo on public.pas_subidas_cliente;
create policy admin_todo on public.pas_subidas_cliente
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- 3) ¿Patente + DNI corresponden a ese caso? (uso interno de las funciones de abajo)
create or replace function public.cliente_es_dueno(p_patente text, p_dni text, p_caso_id uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from pas_casos c
     where c.id = p_caso_id
       and length(regexp_replace(coalesce(p_dni, ''), '\D', '', 'g')) >= 3
       and upper(regexp_replace(coalesce(c.patente::text, ''), '[^A-Za-z0-9]', '', 'g'))
           = upper(regexp_replace(coalesce(p_patente, ''), '[^A-Za-z0-9]', '', 'g'))
       and right(regexp_replace(coalesce(c.dni_asegurado::text, ''), '\D', '', 'g'), 3)
           = right(regexp_replace(coalesce(p_dni, ''), '\D', '', 'g'), 3))
$fn$;
revoke all on function public.cliente_es_dueno(text, text, uuid) from public, anon, authenticated;

-- 4) Autoriza UNA subida: valida patente + DNI y devuelve el nombre con el que se puede subir (vale 15 minutos)
create or replace function public.autorizar_subida_cliente(p_patente text, p_dni text, p_caso_id uuid, p_tipo text, p_nombre text)
returns text language plpgsql security definer set search_path = public as $fn$
declare
  v_ruta text;
begin
  if not cliente_es_dueno(p_patente, p_dni, p_caso_id) then
    raise exception 'no_autorizado';
  end if;
  if p_tipo not in ('DNI', 'LICENCIA', 'CEDULA', 'FOTOS', 'DENUNCIA', 'CERTIFICADO', 'PRESUPUESTO', 'OTRO') then
    raise exception 'tipo_invalido';
  end if;
  if (select count(*) from pas_subidas_cliente where caso_id = p_caso_id and creado > now() - interval '1 day') >= 40 then
    raise exception 'demasiadas_subidas';
  end if;
  v_ruta := p_caso_id::text || '/' || replace(gen_random_uuid()::text, '-', '') || '_'
            || left(regexp_replace(coalesce(nullif(p_nombre, ''), 'archivo'), '[^A-Za-z0-9._-]+', '_', 'g'), 60);
  insert into pas_subidas_cliente (caso_id, tipo, nombre_original, ruta) values (p_caso_id, p_tipo, left(p_nombre, 200), v_ruta);
  return v_ruta;
end $fn$;
revoke all on function public.autorizar_subida_cliente(text, text, uuid, text, text) from public;
grant execute on function public.autorizar_subida_cliente(text, text, uuid, text, text) to anon, authenticated;

-- 5) La carpeta "recepcion" solo acepta archivos con una autorización vigente
create or replace function public.subida_autorizada(p_nombre text)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from pas_subidas_cliente where ruta = p_nombre and estado = 'autorizada' and expira > now())
$fn$;
grant execute on function public.subida_autorizada(text) to anon, authenticated;

drop policy if exists cliente_sube_recepcion on storage.objects;
create policy cliente_sube_recepcion on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'recepcion' and public.subida_autorizada(name));

-- 6) Después de subir, el cliente confirma (solo si el archivo realmente está)
create or replace function public.confirmar_subida_cliente(p_ruta text)
returns boolean language plpgsql security definer set search_path = public as $fn$
begin
  update pas_subidas_cliente s set estado = 'subida'
   where s.ruta = p_ruta and s.estado = 'autorizada'
     and exists (select 1 from storage.objects o where o.bucket_id = 'recepcion' and o.name = p_ruta);
  return found;
end $fn$;
revoke all on function public.confirmar_subida_cliente(text) from public;
grant execute on function public.confirmar_subida_cliente(text) to anon, authenticated;

-- 7) Qué documentos ya mandó el cliente (para mostrarle "✓ Enviado")
create or replace function public.documentos_enviados_cliente(p_patente text, p_dni text, p_caso_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
begin
  if not cliente_es_dueno(p_patente, p_dni, p_caso_id) then
    return '[]'::jsonb;
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('tipo', tipo, 'nombre', nombre_original, 'creado', creado) order by creado desc)
                     from pas_subidas_cliente where caso_id = p_caso_id and estado in ('subida', 'guardada')), '[]'::jsonb);
end $fn$;
revoke all on function public.documentos_enviados_cliente(text, text, uuid) from public;
grant execute on function public.documentos_enviados_cliente(text, text, uuid) to anon, authenticated;

-- Control: tiene que mostrar la carpeta recepcion como privada
select id as carpeta, public, file_size_limit from storage.buckets where id = 'recepcion';

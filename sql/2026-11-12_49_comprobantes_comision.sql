-- SQL 49 · Comprobantes de pago de comisiones a los PAS (2026-11-12). Se puede volver a correr sin problema.
-- Cada transferencia que le hacés a un PAS queda como un "pago" con su comprobante (PDF o foto).
-- Un mismo pago puede cubrir varias comisiones: cada caso apunta a su pago con pas_casos.pago_comision_id.
-- El PAS ve, desde el portal, sus pagos y el comprobante de cada uno. No puede borrar ni cambiar nada.
-- Los archivos van a la carpeta privada "comprobantes" de Storage, en <pas_id>/<pago>/archivo.
-- Ojo: el SQL 07 borra todas las políticas de Storage al correrse; si alguna vez lo volvés a correr, corré este después.

create table if not exists public.pas_pagos_comision (
  id             uuid primary key default gen_random_uuid(),
  pas_id         integer not null,
  fecha          date not null default current_date,
  monto          numeric,
  archivo        text,   -- ruta dentro de la carpeta "comprobantes"
  nombre_archivo text,   -- nombre original, para mostrar
  nota           text,
  created_at     timestamptz not null default now()
);
create index if not exists pas_pagos_comision_pas_idx on public.pas_pagos_comision (pas_id, fecha desc);

alter table public.pas_casos add column if not exists pago_comision_id uuid
  references public.pas_pagos_comision (id) on delete set null;
create index if not exists pas_casos_pago_comision_idx on public.pas_casos (pago_comision_id);

-- Permisos de la tabla: vos todo; cada PAS, solo leer los suyos
alter table public.pas_pagos_comision enable row level security;
drop policy if exists admin_todo on public.pas_pagos_comision;
create policy admin_todo on public.pas_pagos_comision
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));
drop policy if exists pas_ve_sus_pagos on public.pas_pagos_comision;
create policy pas_ve_sus_pagos on public.pas_pagos_comision
  for select to authenticated
  using (pas_id::text = (select public.mi_pas_id()));

-- Carpeta privada de comprobantes (máximo 10 MB, PDF o imagen)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Vos ya podés todo en Storage (política admin_archivos del SQL 07). El PAS solo puede ver su carpeta.
drop policy if exists pas_ve_comprobantes on storage.objects;
create policy pas_ve_comprobantes on storage.objects
  for select to authenticated
  using (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = (select public.mi_pas_id()));

-- Control: la carpeta tiene que decir public = false y tienen que aparecer las dos políticas nuevas
select id as carpeta, public, file_size_limit from storage.buckets where id = 'comprobantes';
select tablename, policyname, cmd from pg_policies
 where policyname in ('pas_ve_sus_pagos', 'pas_ve_comprobantes', 'admin_todo') and tablename in ('pas_pagos_comision', 'objects');

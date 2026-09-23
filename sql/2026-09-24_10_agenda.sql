-- Etapa 14: agenda de cada caso (mediaciones, audiencias, vencimientos, reuniones).
-- Solo crea una tabla nueva; no toca nada existente. Se puede volver a correr sin problema.

create table if not exists public.pas_eventos (
  id           uuid primary key default gen_random_uuid(),
  caso_id      uuid not null references public.pas_casos(id) on delete cascade,
  tipo         text not null default 'mediacion',   -- mediacion | audiencia | vencimiento | reunion | otro
  inicio       timestamptz not null,
  duracion_min integer not null default 60,
  link         text,                                -- Zoom / Meet / Teams
  lugar        text,
  notas        text,
  created_at   timestamptz not null default now()
);
create index if not exists pas_eventos_inicio_idx on public.pas_eventos (inicio);
create index if not exists pas_eventos_caso_idx on public.pas_eventos (caso_id);

-- Seguridad: igual que el resto de las tablas, solo el administrador
alter table public.pas_eventos enable row level security;
drop policy if exists admin_todo on public.pas_eventos;
create policy admin_todo on public.pas_eventos
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

-- Control
select count(*) as eventos from public.pas_eventos;

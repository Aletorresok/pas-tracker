-- SQL 37 · Bandeja de novedades judiciales (PJN / MEV) — versión liviana (BORRADOR, OPCIONAL, 2026-09-29).
-- Al implementarlo: copiar a sql/AAAA-MM-DD_37_novedades_judiciales.sql. Se puede volver a correr sin problema.
--
-- NO es scraping. Es la "bandeja de entrada matutina" de Lex-Doctor/IUSNET pero alimentada por:
--   · lo que pegás a mano (texto del despacho / cédula copiado de la MEV o del PJN), o
--   · (fase 2, si se decide) los mails de aviso de notificación electrónica que lleguen a Gmail.
-- Cada novedad se valida antes de tocar el expediente: "Integrar" → deja nota en la Bitácora y, si se elige
-- una actuación del catálogo (SQL 33), crea el plazo con la fecha de notificación. "Descartar" la archiva.
-- expedientes.numero_normalizado sirve para enganchar solo la novedad con su expediente.

alter table public.expedientes add column if not exists portal         text check (portal is null or portal in ('pjn', 'mev', 'otro'));
alter table public.expedientes add column if not exists url_portal     text;  -- link directo al expediente en el PJN / MEV
alter table public.expedientes add column if not exists numero_normalizado text
  generated always as (regexp_replace(coalesce(numero, ''), '[^0-9/]', '', 'g')) stored;
create index if not exists expedientes_numero_norm_idx on public.expedientes (numero_normalizado);

create table if not exists public.novedades_judiciales (
  id                 uuid primary key default gen_random_uuid(),
  expediente_id      uuid references public.expedientes(id) on delete cascade,  -- vacío = sin asignar todavía
  fuente             text not null default 'manual' check (fuente in ('manual', 'mail', 'pjn', 'mev')),
  fecha              date not null default current_date,      -- fecha del despacho / notificación
  tipo               text,                                     -- despacho | cedula | notificacion | otro
  texto              text not null,
  url                text,
  hash               text unique,                              -- md5(fuente + texto) para no cargar dos veces lo mismo
  estado             text not null default 'nueva' check (estado in ('nueva', 'integrada', 'descartada')),
  plazo_id           uuid references public.plazos(id) on delete set null, -- plazo creado al integrarla
  created_at         timestamptz not null default now(),
  resuelta_en        timestamptz
);
create index if not exists novedades_estado_idx on public.novedades_judiciales (estado, created_at desc);

create or replace function public.novedad_hash() returns trigger language plpgsql as $fn$
begin
  if new.hash is null then new.hash := md5(new.fuente || '|' || coalesce(new.expediente_id::text, '') || '|' || new.texto); end if;
  return new;
end $fn$;
drop trigger if exists trg_novedad_hash on public.novedades_judiciales;
create trigger trg_novedad_hash before insert on public.novedades_judiciales
  for each row execute function public.novedad_hash();

alter table public.novedades_judiciales enable row level security;
drop policy if exists admin_todo on public.novedades_judiciales;
create policy admin_todo on public.novedades_judiciales for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Control
select (select count(*) from information_schema.tables where table_name = 'novedades_judiciales') as tabla_1,
       (select count(*) from information_schema.columns where table_name = 'expedientes'
          and column_name in ('portal', 'url_portal', 'numero_normalizado')) as columnas_3;

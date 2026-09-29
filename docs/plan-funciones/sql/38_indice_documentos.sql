-- SQL 38 · Índice de texto de los documentos (búsqueda dentro de PDFs y fotos) (BORRADOR, OPCIONAL, 2026-09-29).
-- Al implementarlo: copiar a sql/AAAA-MM-DD_38_indice_documentos.sql. Se puede volver a correr sin problema.
--
-- Los archivos siguen en la carpeta local (no se suben). El navegador extrae el texto (pdf.js; tesseract.js para
-- fotos/escaneos) y guarda SOLO el texto acá, para que el buscador Ctrl+K encuentre "póliza 44532" en un PDF.
-- Se reindexa un archivo cuando cambian su tamaño o su fecha de modificación.

create table if not exists public.documentos_texto (
  id             uuid primary key default gen_random_uuid(),
  caso_id        uuid references public.pas_casos(id) on delete cascade,
  expediente_id  uuid references public.expedientes(id) on delete cascade,
  ruta           text not null,                 -- ruta relativa dentro de la carpeta del caso
  nombre         text not null,
  tamanio        bigint,
  modificado     timestamptz,
  origen         text not null default 'pdf' check (origen in ('pdf', 'ocr')),
  texto          text not null default '',
  tsv            tsvector generated always as (to_tsvector('spanish', coalesce(nombre, '') || ' ' || coalesce(texto, ''))) stored,
  indexado_en    timestamptz not null default now(),
  check ((caso_id is null) <> (expediente_id is null))
);
create unique index if not exists documentos_texto_unico on public.documentos_texto
  (coalesce(caso_id, expediente_id), ruta);
create index if not exists documentos_texto_tsv_idx on public.documentos_texto using gin (tsv);

alter table public.documentos_texto enable row level security;
drop policy if exists admin_todo on public.documentos_texto;
create policy admin_todo on public.documentos_texto for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Búsqueda para Ctrl+K: devuelve el archivo y un fragmento con lo encontrado resaltado entre « »
create or replace function public.buscar_documentos(p_q text, p_limite int default 20)
returns table (id uuid, caso_id uuid, expediente_id uuid, nombre text, ruta text, fragmento text, rango real)
language sql stable security invoker set search_path = public as $$
  select d.id, d.caso_id, d.expediente_id, d.nombre, d.ruta,
         ts_headline('spanish', d.texto, q, 'StartSel=«,StopSel=»,MaxWords=18,MinWords=6,MaxFragments=1'),
         ts_rank(d.tsv, q)
    from documentos_texto d, websearch_to_tsquery('spanish', p_q) q
   where d.tsv @@ q
   order by ts_rank(d.tsv, q) desc
   limit p_limite
$$;
grant execute on function public.buscar_documentos(text, int) to authenticated;

-- Control
select (select count(*) from information_schema.tables where table_name = 'documentos_texto') as tabla_1;

-- Checklist de documentación manual: vos tildás en la ficha qué documentación ya tenés.
-- Se guarda en el caso como { "DNI": "2026-09-24", "DENUNCIA": "2026-09-20", ... } (tipo → fecha en que lo tildaste).
-- Solo agrega una columna. Se puede volver a correr sin problema.
alter table public.pas_casos add column if not exists documentacion jsonb not null default '{}'::jsonb;

select count(*) as casos from public.pas_casos;

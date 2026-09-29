-- SQL 36 · Resultado por caso/expediente + liquidaciones guardadas (BORRADOR, 2026-09-29).
-- Al implementarlo: copiar a sql/AAAA-MM-DD_36_finanzas_caso.sql. Se puede volver a correr sin problema.
--
-- 1) gastos: marcar si el gasto se le recupera a alguien (cliente / compañía / costas) y cuándo se recuperó.
-- 2) resultado_casos: vista con honorarios, gastos y neto de cada caso PAS (lo usa la pestaña Montos y Análisis).
-- 3) liquidaciones: el resultado de la calculadora de intereses guardado en un caso o expediente, para poder
--    insertarlo en un escrito con {{liquidacion}} (modelos del SQL 32).

alter table public.gastos add column if not exists recuperable   boolean not null default false;
alter table public.gastos add column if not exists recuperar_de  text check (recuperar_de is null or recuperar_de in ('cliente', 'compania', 'costas'));
alter table public.gastos add column if not exists recuperado_en date;

create or replace view public.resultado_casos with (security_invoker = true) as
select c.id as caso_id,
       c.asegurado, c.compania_aseguradora, c.pas_id, c.estado,
       coalesce(c.monto_cobro_yo, c.monto_honorarios, 0)                                   as honorarios,
       (c.fecha_cobro_honorarios is not null or c.estado_honorarios = 'COBRADO')           as honorarios_cobrados,
       coalesce(c.monto_comision_pas, 0)                                                    as comision_pas,
       coalesce(g.total, 0)                                                                 as gastos,
       coalesce(g.por_recuperar, 0)                                                         as gastos_por_recuperar,
       coalesce(c.monto_cobro_yo, c.monto_honorarios, 0) - coalesce(c.monto_comision_pas, 0)
         - coalesce(g.total, 0) + coalesce(g.recuperado, 0)                                 as neto,
       case when c.fecha_derivacion is not null and c.fecha_cobro_honorarios is not null
            then c.fecha_cobro_honorarios - c.fecha_derivacion end                          as dias_hasta_cobro
  from public.pas_casos c
  left join (
    select caso_id,
           sum(monto)                                                        as total,
           sum(monto) filter (where recuperable and recuperado_en is null)   as por_recuperar,
           sum(monto) filter (where recuperable and recuperado_en is not null) as recuperado
      from public.gastos where caso_id is not null group by caso_id
  ) g on g.caso_id = c.id;

create table if not exists public.liquidaciones (
  id             uuid primary key default gen_random_uuid(),
  caso_id        uuid references public.pas_casos(id) on delete cascade,
  expediente_id  uuid references public.expedientes(id) on delete cascade,
  titulo         text not null default 'Liquidación',
  capital        numeric not null,
  desde          date not null,
  hasta          date not null,
  metodo         text not null,                -- tasa_activa_bna | ipc | ipc_mas_3 | icl (utils/intereses.js → METODOS)
  resultado      numeric not null,             -- capital + intereses / actualizado
  detalle        jsonb not null default '{}'::jsonb, -- tramos, índices usados, avisos ("el IPC de agosto no se publicó")
  texto          text not null,                -- el mismo "Copiar texto" de la calculadora
  created_at     timestamptz not null default now(),
  check ((caso_id is null) <> (expediente_id is null)),
  check (hasta >= desde)
);
create index if not exists liquidaciones_caso_idx on public.liquidaciones (caso_id, created_at desc);
create index if not exists liquidaciones_exp_idx  on public.liquidaciones (expediente_id, created_at desc);

alter table public.liquidaciones enable row level security;
drop policy if exists admin_todo on public.liquidaciones;
create policy admin_todo on public.liquidaciones for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Control
select (select count(*) from information_schema.columns where table_name = 'gastos'
          and column_name in ('recuperable', 'recuperar_de', 'recuperado_en')) as columnas_3,
       (select count(*) from information_schema.views where table_name = 'resultado_casos') as vista_1,
       (select count(*) from information_schema.tables where table_name = 'liquidaciones') as tabla_1;

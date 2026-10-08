-- SQL 48 · plazos_publicos() suma % cobrado y % ofrecido (2026-10-08). Requiere el SQL 45 y el 47.
-- Se puede volver a correr sin problema. La usan /reclamo, la vista del cliente y la demo del portal (/portal/demo),
-- que ahora muestra las estadísticas reales del estudio en lugar de números inventados.
-- Igual que antes: medianas por compañía, cada dato solo con 3 casos o más (nada de un caso puntual).
-- Los % se miden sobre la base del reclamo: en concurrencia, la parte del tercero (50% si no se cargó otra);
-- las franquicias quedan afuera (se pagan enteras). Más de 150% se toma como error de carga.

create or replace function public.plazos_publicos()
returns jsonb language sql stable security definer set search_path = public as $fn$
  with b as (
    select compania_aseguradora as cia, fecha_inicio_reclamo::date as inicio, fecha_ofrecimiento::date as ofrec, fecha_cobro::date as cobro,
           monto_ofrecimiento, monto_cobro_asegurado, coalesce(instancia_ofrecimiento, 'administrativa') as instancia,
           case when tipo_reclamo = 'franquicia' then null
                when tipo_reclamo = 'concurrencia' then monto_reclamado * coalesce(porcentaje_culpa, 50) / 100
                else monto_reclamado end as base
      from pas_casos
     where coalesce(compania_aseguradora, '') <> '' and estado <> 'desistido'
  ), d as (
    select cia,
           case when ofrec - inicio between 0 and 730 then ofrec - inicio end as oferta,
           case when cobro - inicio between 0 and 730 then cobro - inicio end as dcobro,
           case when base > 0 and monto_cobro_asegurado > 0 and monto_cobro_asegurado / base <= 1.5 then monto_cobro_asegurado / base * 100 end as pct_cobrado,
           case when base > 0 and monto_ofrecimiento > 0 and monto_ofrecimiento / base <= 1.5 and instancia = 'administrativa' then monto_ofrecimiento / base * 100 end as pct_adm,
           case when base > 0 and monto_ofrecimiento > 0 and monto_ofrecimiento / base <= 1.5 and instancia = 'mediacion' then monto_ofrecimiento / base * 100 end as pct_med
      from b
  ), r as (
    select cia, count(oferta) n1, count(dcobro) n2, count(pct_cobrado) n3, count(pct_adm) n4, count(pct_med) n5,
           round(percentile_cont(0.5) within group (order by oferta)) as dias_oferta,
           round(percentile_cont(0.5) within group (order by dcobro)) as dias_cobro,
           round(percentile_cont(0.5) within group (order by pct_cobrado)) as pct_cobrado,
           round(percentile_cont(0.5) within group (order by pct_adm)) as pct_ofrecido_adm,
           round(percentile_cont(0.5) within group (order by pct_med)) as pct_ofrecido_med
      from d group by cia
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'compania', cia,
           'dias_oferta', case when n1 >= 3 then dias_oferta end,
           'dias_cobro', case when n2 >= 3 then dias_cobro end,
           'pct_cobrado', case when n3 >= 3 then pct_cobrado end,
           'pct_ofrecido_adm', case when n4 >= 3 then pct_ofrecido_adm end,
           'pct_ofrecido_med', case when n5 >= 3 then pct_ofrecido_med end) order by cia), '[]'::jsonb)
    from r where n1 >= 3 or n2 >= 3 or n3 >= 3 or n4 >= 3 or n5 >= 3
$fn$;
revoke all on function public.plazos_publicos() from public;
grant execute on function public.plazos_publicos() to anon, authenticated;

-- Control: una fila por compañía con datos públicos
select x->>'compania' as compania, x->>'dias_oferta' as dias_oferta, x->>'dias_cobro' as dias_cobro,
       x->>'pct_cobrado' as pct_cobrado, x->>'pct_ofrecido_adm' as pct_adm, x->>'pct_ofrecido_med' as pct_med
  from jsonb_array_elements(public.plazos_publicos()) x;

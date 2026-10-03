-- 45 · Instancia de cada ofrecimiento y tipo de reclamo (2026-10-03). Se puede volver a correr sin problema.
--   · Cada oferta dice en qué instancia se hizo: administrativa (por defecto), mediación o juicio.
--   · El caso guarda la instancia de su último ofrecimiento (la sigue la app desde el historial de ofertas).
--   · Tipo de reclamo del caso: culpa del tercero (por defecto), concurrencia (con el % de responsabilidad del
--     tercero, 50 si se deja vacío) o franquicia. Análisis lo usa para no deformar el % ofrecido y cobrado.
--   · La compañía tiene una "instancia habitual": las ofertas nuevas de esa compañía ya vienen marcadas así.
--   · plazos_companias (cuadro del portal) suma los datos que necesita: montos, instancia, tipo y pagos.
-- Correr en el SQL Editor de Supabase.

-- 1) Columnas nuevas ─────────────────────────────────────────────────────
alter table public.pas_ofertas  add column if not exists instancia text not null default 'administrativa';
alter table public.pas_casos    add column if not exists instancia_ofrecimiento text not null default 'administrativa';
alter table public.pas_casos    add column if not exists tipo_reclamo text not null default 'culpa_tercero';
alter table public.pas_casos    add column if not exists porcentaje_culpa numeric;  -- solo concurrencia: % a cargo del tercero (vacío = 50)
alter table public.pas_companias add column if not exists instancia_habitual text;  -- vacío = administrativa

alter table public.pas_ofertas  drop constraint if exists pas_ofertas_instancia_chk;
alter table public.pas_ofertas  add constraint pas_ofertas_instancia_chk check (instancia in ('administrativa', 'mediacion', 'juicio'));
alter table public.pas_casos    drop constraint if exists pas_casos_instancia_chk;
alter table public.pas_casos    add constraint pas_casos_instancia_chk check (instancia_ofrecimiento in ('administrativa', 'mediacion', 'juicio'));
alter table public.pas_casos    drop constraint if exists pas_casos_tipo_reclamo_chk;
alter table public.pas_casos    add constraint pas_casos_tipo_reclamo_chk check (tipo_reclamo in ('culpa_tercero', 'concurrencia', 'franquicia'));
alter table public.pas_casos    drop constraint if exists pas_casos_porcentaje_culpa_chk;
alter table public.pas_casos    add constraint pas_casos_porcentaje_culpa_chk check (porcentaje_culpa is null or (porcentaje_culpa > 0 and porcentaje_culpa <= 100));
alter table public.pas_companias drop constraint if exists pas_companias_instancia_chk;
alter table public.pas_companias add constraint pas_companias_instancia_chk check (instancia_habitual is null or instancia_habitual in ('administrativa', 'mediacion', 'juicio'));

-- 2) Carga inicial: lo que antes se adivinaba por las fechas queda escrito ───
--    Solo toca filas que siguen en 'administrativa' (no pisa lo que ya se marcó a mano si se vuelve a correr).
--    Oferta hecha desde la fecha de inicio del juicio → juicio; desde la fecha de mediación → mediación.
update public.pas_ofertas o set instancia = case
         when c.fecha_inicio_juicio is not null and o.fecha >= c.fecha_inicio_juicio then 'juicio'
         else 'mediacion' end
  from public.pas_casos c
 where c.id = o.caso_id and o.instancia = 'administrativa'
   and ((c.fecha_inicio_juicio is not null and o.fecha >= c.fecha_inicio_juicio)
     or (c.fecha_mediacion is not null and o.fecha >= c.fecha_mediacion));

-- Río Uruguay: el convenio es en mediación. Instancia habitual y todas sus ofertas a mediación (las de juicio quedan).
insert into public.pas_companias (compania, instancia_habitual)
select distinct compania_aseguradora, 'mediacion' from public.pas_casos where compania_aseguradora ilike '%uruguay%'
on conflict (compania) do update set instancia_habitual = 'mediacion';
update public.pas_ofertas o set instancia = 'mediacion'
  from public.pas_casos c
 where c.id = o.caso_id and o.instancia = 'administrativa' and c.compania_aseguradora ilike '%uruguay%';

-- El caso: la instancia de su última oferta; sin historial, por fechas/estado (Río Uruguay, mediación)
update public.pas_casos c set instancia_ofrecimiento = u.instancia
  from (select distinct on (caso_id) caso_id, instancia from public.pas_ofertas order by caso_id, fecha desc, creado desc) u
 where u.caso_id = c.id and c.instancia_ofrecimiento = 'administrativa' and u.instancia <> 'administrativa';
update public.pas_casos c set instancia_ofrecimiento = case
         when c.fecha_inicio_juicio is not null or c.estado = 'en_juicio' then 'juicio'
         else 'mediacion' end
 where c.instancia_ofrecimiento = 'administrativa'
   and coalesce(c.monto_ofrecimiento, 0) > 0
   and not exists (select 1 from public.pas_ofertas o where o.caso_id = c.id)
   and (c.fecha_inicio_juicio is not null or c.estado = 'en_juicio'
     or c.fecha_mediacion is not null or c.estado = 'en_mediacion'
     or c.compania_aseguradora ilike '%uruguay%');

-- 3) Cuadro del portal: datos de todas las compañías, sin nombres ni patentes ─
create or replace function public.plazos_companias()
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
           'compania_aseguradora', compania_aseguradora,
           'estado', estado,
           'fecha_inicio_reclamo', fecha_inicio_reclamo,
           'fecha_ofrecimiento', fecha_ofrecimiento,
           'fecha_aceptacion', fecha_aceptacion,
           'fecha_firma', fecha_firma,
           'fecha_pago', fecha_pago,
           'plazo_pago', plazo_pago,
           'fecha_cobro', fecha_cobro,
           'monto_reclamado', monto_reclamado,
           'monto_ofrecimiento', monto_ofrecimiento,
           'monto_cobro_asegurado', monto_cobro_asegurado,
           'instancia_ofrecimiento', instancia_ofrecimiento,
           'tipo_reclamo', tipo_reclamo,
           'porcentaje_culpa', porcentaje_culpa)), '[]'::jsonb)
    from pas_casos
   where auth.uid() is not null
$fn$;
revoke all on function public.plazos_companias() from public;
grant execute on function public.plazos_companias() to authenticated;

-- Control: cuántos casos y ofertas quedaron en cada instancia, y la instancia habitual de Río Uruguay
select 'caso' as que, instancia_ofrecimiento as instancia, count(*) from public.pas_casos group by 2
union all
select 'oferta', instancia, count(*) from public.pas_ofertas group by 2
union all
select 'habitual ' || compania, instancia_habitual, 1 from public.pas_companias where instancia_habitual is not null
order by 1, 2;

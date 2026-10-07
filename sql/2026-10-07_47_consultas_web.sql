-- SQL 47 · Consultas de la web (página pública /reclamo) y plazos públicos por compañía (2026-10-07).
-- Se puede volver a correr sin problema.
--   · consultas: lo que deja alguien que no es cliente en el formulario. Solo el administrador la lee.
--   · nueva_consulta(): la única forma de escribir desde la página (sin cuenta), con validación y freno anti-spam.
--   · plazos_publicos(): medianas de días por compañía, solo con 3 casos o más (no muestra nada de un caso puntual).

create table if not exists public.consultas (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  nombre            text not null,
  telefono          text not null,
  patente           text,
  fecha_siniestro   date,
  compania_tercero  text,
  lesiones          boolean not null default false,
  relato            text,
  ref               text,                       -- de dónde vino (link con ?ref=)
  estado            text not null default 'nueva' check (estado in ('nueva', 'contactada', 'caso', 'descartada')),
  caso_id           uuid,                       -- el caso que se creó a partir de la consulta
  nota              text,
  atendida_en       timestamptz
);
create index if not exists consultas_estado_idx on public.consultas (estado, created_at desc);
alter table public.consultas enable row level security;
drop policy if exists admin_todo on public.consultas;
create policy admin_todo on public.consultas for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create or replace function public.nueva_consulta(p_nombre text, p_telefono text, p_patente text, p_fecha date,
  p_compania text, p_lesiones boolean, p_relato text, p_ref text)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  v_tel text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  v_id uuid;
begin
  if length(trim(coalesce(p_nombre, ''))) < 2 or length(p_nombre) > 80 then raise exception 'nombre_invalido'; end if;
  if length(v_tel) < 8 or length(v_tel) > 15 then raise exception 'telefono_invalido'; end if;
  -- Freno: el mismo teléfono, 3 por día; en total, 40 por hora
  if (select count(*) from consultas where regexp_replace(telefono, '\D', '', 'g') = v_tel and created_at > now() - interval '1 day') >= 3
     or (select count(*) from consultas where created_at > now() - interval '1 hour') >= 40 then
    raise exception 'demasiadas_consultas';
  end if;
  insert into consultas (nombre, telefono, patente, fecha_siniestro, compania_tercero, lesiones, relato, ref)
  values (left(trim(p_nombre), 80), v_tel, nullif(left(upper(regexp_replace(coalesce(p_patente, ''), '[^A-Za-z0-9]', '', 'g')), 10), ''),
          case when p_fecha between current_date - 3650 and current_date then p_fecha end,
          nullif(left(trim(coalesce(p_compania, '')), 80), ''), coalesce(p_lesiones, false),
          nullif(left(trim(coalesce(p_relato, '')), 1000), ''), nullif(left(trim(coalesce(p_ref, '')), 60), ''))
  returning id into v_id;
  return v_id;
end $fn$;
revoke all on function public.nueva_consulta(text, text, text, date, text, boolean, text, text) from public;
grant execute on function public.nueva_consulta(text, text, text, date, text, boolean, text, text) to anon, authenticated;

create or replace function public.plazos_publicos()
returns jsonb language sql stable security definer set search_path = public as $fn$
  with d as (
    select compania_aseguradora as cia,
           case when fecha_ofrecimiento::date - fecha_inicio_reclamo::date between 0 and 730 then fecha_ofrecimiento::date - fecha_inicio_reclamo::date end as oferta,
           case when fecha_cobro::date - fecha_inicio_reclamo::date between 0 and 730 then fecha_cobro::date - fecha_inicio_reclamo::date end as cobro
      from pas_casos
     where coalesce(compania_aseguradora, '') <> '' and estado <> 'desistido' and fecha_inicio_reclamo is not null
  ), r as (
    select cia, count(oferta) as n_oferta, count(cobro) as n_cobro,
           round(percentile_cont(0.5) within group (order by oferta)) as dias_oferta,
           round(percentile_cont(0.5) within group (order by cobro)) as dias_cobro
      from d group by cia
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'compania', cia,
           'dias_oferta', case when n_oferta >= 3 then dias_oferta end,
           'dias_cobro', case when n_cobro >= 3 then dias_cobro end) order by cia), '[]'::jsonb)
    from r where n_oferta >= 3 or n_cobro >= 3
$fn$;
revoke all on function public.plazos_publicos() from public;
grant execute on function public.plazos_publicos() to anon, authenticated;

-- Control: tiene que dar 1, true y la cantidad de compañías con datos públicos
select (select count(*) from information_schema.tables where table_name = 'consultas') as tabla_1,
       (select relrowsecurity from pg_class where relname = 'consultas') as rls_activo,
       (select jsonb_array_length(public.plazos_publicos())) as companias_con_plazos;

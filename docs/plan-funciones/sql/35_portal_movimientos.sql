-- SQL 35 · Movimientos visibles para el cliente + vista del cliente de EXPEDIENTES (etapa 7 del plan ATG Lex)
-- (BORRADOR, 2026-09-29). Al implementarlo: copiar a sql/AAAA-MM-DD_35_portal_movimientos.sql. Re-ejecutable.
--
-- 1) acciones.visible_cliente + texto_cliente: en la Bitácora se tilda "Mostrar al cliente" y se escribe (opcional)
--    cómo lo va a leer ("Presentamos el reclamo" en vez de "Carta a Sancor con doc. completa").
--    Lo ven: el cliente (vista por patente + DNI, o por DNI + código en expedientes) y el PAS (portal).
-- 2) movimientos_cliente(patente, dni, caso_id): los movimientos visibles de SU caso PAS.
-- 3) consultar_expediente_cliente(dni, codigo): lo que ve el cliente de un expediente con visible_cliente = true.
--    Mismo freno que los casos: 5 intentos fallidos en 15 minutos (tabla pas_cliente_intentos).

alter table public.acciones add column if not exists visible_cliente boolean not null default false;
alter table public.acciones add column if not exists texto_cliente   text;
create index if not exists acciones_visibles_idx on public.acciones (caso_id, fecha desc) where visible_cliente;

-- El PAS ve en el portal los movimientos visibles de sus casos (solo lectura)
drop policy if exists pas_ve_movimientos on public.acciones;
create policy pas_ve_movimientos on public.acciones for select to authenticated
  using (visible_cliente and exists (
    select 1 from public.pas_casos c where c.id::text = acciones.caso_id and c.pas_id::text = (select public.mi_pas_id())));

-- 2) Casos PAS
create or replace function public.movimientos_cliente(p_patente text, p_dni text, p_caso_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
begin
  if not cliente_es_dueno(p_patente, p_dni, p_caso_id) then return null; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('fecha', a.fecha, 'texto', coalesce(nullif(a.texto_cliente, ''), a.descripcion))
                     order by a.fecha desc)
      from (select * from acciones where caso_id = p_caso_id::text and visible_cliente order by fecha desc limit 30) a
  ), '[]'::jsonb);
end $fn$;
revoke all on function public.movimientos_cliente(text, text, uuid) from public;
grant execute on function public.movimientos_cliente(text, text, uuid) to anon, authenticated;

-- 3) Expedientes
create or replace function public.consultar_expediente_cliente(p_dni text, p_codigo text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_codigo text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
  v_dni    text := regexp_replace(coalesce(p_dni, ''), '\D', '', 'g');
  v_clave  text := 'EXP:' || v_codigo;          -- se reusa pas_cliente_intentos.patente como clave del freno
  e        expedientes%rowtype;
begin
  if length(v_codigo) < 4 or length(v_dni) < 7 then return null; end if;
  if (select count(*) from pas_cliente_intentos where patente = v_clave and creado > now() - interval '15 minutes') >= 5 then
    raise exception 'demasiados_intentos';
  end if;

  select * into e from expedientes
   where upper(codigo_cliente) = v_codigo and visible_cliente
     and regexp_replace(coalesce(cliente_dni, ''), '\D', '', 'g') = v_dni;
  if not found then
    insert into pas_cliente_intentos (patente) values (v_clave);
    return null;
  end if;

  return jsonb_build_object(
    'caratula',       e.caratula,
    'juzgado',        e.juzgado,
    'numero',         e.numero,
    'estado',         e.estado,
    'fecha_inicio',   e.fecha_inicio,
    'mensaje',        e.mensaje_cliente,
    'mensaje_fecha',  e.mensaje_cliente_fecha,
    'movimientos', coalesce((
        select jsonb_agg(jsonb_build_object('fecha', a.fecha, 'texto', coalesce(nullif(a.texto_cliente, ''), a.descripcion))
                         order by a.fecha desc)
          from (select * from acciones where caso_id = e.id::text and visible_cliente order by fecha desc limit 30) a), '[]'::jsonb),
    'proximos', coalesce((
        select jsonb_agg(jsonb_build_object('tipo', ev.tipo, 'inicio', ev.inicio, 'lugar', ev.lugar, 'link', ev.link) order by ev.inicio)
          from pas_eventos ev
         where ev.expediente_id = e.id and ev.inicio >= now() - interval '2 hours'
           and ev.tipo in ('mediacion', 'audiencia', 'reunion')), '[]'::jsonb)
  );
end $fn$;
revoke all on function public.consultar_expediente_cliente(text, text) from public;
grant execute on function public.consultar_expediente_cliente(text, text) to anon, authenticated;

-- Control
select (select count(*) from information_schema.columns where table_name = 'acciones'
          and column_name in ('visible_cliente', 'texto_cliente')) as columnas_2,
       (select count(*) from pg_proc where proname in ('movimientos_cliente', 'consultar_expediente_cliente')) as funciones_2;

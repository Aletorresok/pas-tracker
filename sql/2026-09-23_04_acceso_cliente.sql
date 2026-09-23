-- Etapa 8: acceso del cliente con patente + últimos 3 números del DNI.
-- Ejecutar una sola vez en Supabase → SQL Editor. Se puede volver a correr sin problema.

-- 1) Fecha del mensaje al cliente: se completa sola cada vez que cambia el mensaje
alter table public.pas_casos add column if not exists mensaje_cliente_fecha timestamptz;

create or replace function public.pas_casos_fecha_mensaje()
returns trigger language plpgsql as $$
begin
  if coalesce(new.mensaje_cliente, '') <> '' and
     ((tg_op = 'INSERT' and new.mensaje_cliente_fecha is null) or (tg_op = 'UPDATE' and new.mensaje_cliente is distinct from old.mensaje_cliente)) then
    new.mensaje_cliente_fecha := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_pas_casos_fecha_mensaje on public.pas_casos;
create trigger trg_pas_casos_fecha_mensaje
  before insert or update of mensaje_cliente on public.pas_casos
  for each row execute function public.pas_casos_fecha_mensaje();

-- 2) Registro de intentos fallidos (para frenar a quien pruebe DNIs al azar)
create table if not exists public.pas_cliente_intentos (
  patente text not null,
  creado  timestamptz not null default now()
);
create index if not exists pas_cliente_intentos_idx on public.pas_cliente_intentos (patente, creado);
alter table public.pas_cliente_intentos enable row level security; -- sin políticas: nadie la lee desde afuera

-- 3) Consulta del cliente: devuelve solo lo que el cliente puede ver, y solo si patente y DNI coinciden
create or replace function public.consultar_caso_cliente(p_patente text, p_dni text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patente text := upper(regexp_replace(coalesce(p_patente, ''), '[^A-Za-z0-9]', '', 'g'));
  v_dni     text := right(regexp_replace(coalesce(p_dni, ''), '\D', '', 'g'), 3);
  v_casos   jsonb;
begin
  if length(v_patente) < 5 or length(v_dni) <> 3 then
    return '[]'::jsonb;
  end if;

  -- Más de 5 intentos fallidos en 15 minutos para esa patente: se bloquea un rato
  if (select count(*) from pas_cliente_intentos
      where patente = v_patente and creado > now() - interval '15 minutes') >= 5 then
    raise exception 'demasiados_intentos';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id,
           'asegurado', c.asegurado,
           'patente', c.patente,
           'compania_aseguradora', c.compania_aseguradora,
           'estado', c.estado,
           'fecha_derivacion', c.fecha_derivacion,
           'fecha_inicio_reclamo', c.fecha_inicio_reclamo,
           'fecha_ofrecimiento', c.fecha_ofrecimiento,
           'fecha_pago', c.fecha_pago,
           'fecha_ultimo_movimiento', c.fecha_ultimo_movimiento,
           'monto_ofrecimiento', c.monto_ofrecimiento,
           'monto_cobro_asegurado', c.monto_cobro_asegurado,
           'mensaje_cliente', c.mensaje_cliente,
           'mensaje_cliente_fecha', c.mensaje_cliente_fecha
         ) order by c.fecha_derivacion desc nulls last), '[]'::jsonb)
    into v_casos
    from pas_casos c
   where upper(regexp_replace(coalesce(c.patente::text, ''), '[^A-Za-z0-9]', '', 'g')) = v_patente
     and right(regexp_replace(coalesce(c.dni_asegurado::text, ''), '\D', '', 'g'), 3) = v_dni;

  if jsonb_array_length(v_casos) = 0 then
    insert into pas_cliente_intentos (patente) values (v_patente);
    delete from pas_cliente_intentos where creado < now() - interval '1 day';
  end if;

  return v_casos;
end $$;

revoke all on function public.consultar_caso_cliente(text, text) from public;
grant execute on function public.consultar_caso_cliente(text, text) to anon, authenticated;

-- 4) Control: casos en curso que todavía no tienen DNI cargado (el cliente no va a poder entrar)
select count(*) as casos_en_curso_sin_dni
  from public.pas_casos
 where estado not in ('cobrado', 'desistido')
   and coalesce(regexp_replace(dni_asegurado::text, '\D', '', 'g'), '') !~ '\d{3}';

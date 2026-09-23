-- Notificaciones en el celular / la PC (Web Push).
-- Crea tres tablas nuevas; no toca datos existentes. Se puede volver a correr sin problema.

-- 1) Cada dispositivo donde activaste las notificaciones (lo guarda la app al tocar "Activar")
create table if not exists public.pas_push_suscripciones (
  endpoint     text primary key,
  p256dh       text not null,
  auth         text not null,
  user_id      uuid default auth.uid(),
  dispositivo  text,
  creado       timestamptz not null default now()
);
alter table public.pas_push_suscripciones enable row level security;
drop policy if exists admin_todo on public.pas_push_suscripciones;
create policy admin_todo on public.pas_push_suscripciones
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- 2) Avisos ya enviados (para no mandar el mismo dos veces). Solo la usa la función "notificar".
create table if not exists public.pas_avisos (
  clave   text primary key,
  creado  timestamptz not null default now()
);
alter table public.pas_avisos enable row level security;

-- 3) Configuración interna de la función (sus claves VAPID, que genera sola la primera vez). Sin permisos para la app.
create table if not exists public.pas_config (
  clave  text primary key,
  valor  text not null
);
alter table public.pas_config enable row level security;

-- Control
select count(*) as tablas from information_schema.tables
 where table_schema = 'public' and table_name in ('pas_push_suscripciones', 'pas_avisos', 'pas_config');

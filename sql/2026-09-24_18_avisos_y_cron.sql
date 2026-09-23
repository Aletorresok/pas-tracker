-- Disparadores de las notificaciones (reemplazan a los "Database Webhooks" del panel, que no estaban habilitados)
-- y el recordatorio diario de la agenda. Antes de correrlo: reemplazar TU-PROYECTO por el código del proyecto
-- (Settings → Data API → Project URL) en los DOS lugares. Se puede volver a correr sin problema.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Avisa a la función "notificar" (casos nuevos del portal y documentación del cliente). La llamada sale en segundo plano.
create or replace function public.avisar_notificar() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  perform net.http_post(
    url     := 'https://TU-PROYECTO.supabase.co/functions/v1/notificar',
    body    := jsonb_build_object('type', TG_OP, 'table', TG_TABLE_NAME, 'record', to_jsonb(new),
                                  'old_record', case when TG_OP = 'UPDATE' then to_jsonb(old) end),
    headers := '{"Content-Type": "application/json"}'::jsonb);
  return new;
end $fn$;

drop trigger if exists aviso_caso_nuevo on public.pas_casos;
create trigger aviso_caso_nuevo after insert on public.pas_casos
  for each row when (new.origen = 'portal') execute function public.avisar_notificar();

drop trigger if exists aviso_documentacion on public.pas_subidas_cliente;
create trigger aviso_documentacion after update of estado on public.pas_subidas_cliente
  for each row when (new.estado = 'subida' and old.estado is distinct from 'subida')
  execute function public.avisar_notificar();

-- Recordatorio diario de la agenda de mañana: 9:00 hs Argentina (12:00 UTC)
select cron.unschedule('agenda_de_manana') where exists (select 1 from cron.job where jobname = 'agenda_de_manana');
select cron.schedule('agenda_de_manana', '0 12 * * *', $cron$
  select net.http_post(
    url     := 'https://TU-PROYECTO.supabase.co/functions/v1/notificar',
    body    := '{"tipo":"agenda"}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb)
$cron$);

-- Control: 2 avisos y 1 tarea
select (select count(*) from pg_trigger where tgname in ('aviso_caso_nuevo', 'aviso_documentacion')) as avisos,
       (select count(*) from cron.job where jobname = 'agenda_de_manana') as tareas;

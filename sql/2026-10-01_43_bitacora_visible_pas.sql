-- SQL 43 · Qué ve el PAS de la bitácora (2026-10-01). Se puede volver a correr sin problema.
-- Regla: el PAS ve los cambios de etapa ("Pasó de … a …") y los movimientos que cargás a mano.
-- Lo automático es interno: "Hecho: …", reiteraciones, ofertas, agenda, escritos y PDF generados,
-- carpetas y archivos renombrados (y todo lo de expedientes). Cada movimiento se puede cambiar en la Bitácora.
-- La columna arranca en "interno": lo automático nuevo queda oculto aunque nadie se acuerde de marcarlo.

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'acciones' and column_name = 'visible_pas') then
    alter table public.acciones add column visible_pas boolean not null default false;
    -- Clasificación de lo que ya está cargado (solo la primera vez: después se respeta lo que marques)
    update public.acciones set visible_pas = true
     where not (
       coalesce(descripcion, '') like '% → %'                    -- archivos renombrados al guardarlos en la carpeta
       or coalesce(descripcion, '') ~* '^(Hecho: |Carpeta creada|PDF generado|Escrito: |Escrito de representación generado|Se reiteró el reclamo|Se agendó |Ofrecimiento de |Contraoferta a |Se rechazó el ofrecimiento|Se aceptó el ofrecimiento|Expediente creado|Plazo: |Cumplido: |Presentado: |Escrito pendiente: |Pasó a )'
     );
  end if;
end $$;

-- El PAS solo lee los movimientos visibles de sus casos (el administrador sigue viendo todo con su propia política)
drop policy if exists pas_ve_movimientos on public.acciones;
create policy pas_ve_movimientos on public.acciones
  for select to authenticated using (
    acciones.visible_pas and exists (
      select 1 from public.pas_casos c
       where c.id::text = acciones.caso_id::text
         and c.pas_id::text = (select public.mi_pas_id())));

-- Control: cuántos ve el PAS y cuántos son internos
select visible_pas, count(*) from public.acciones group by visible_pas order by visible_pas;

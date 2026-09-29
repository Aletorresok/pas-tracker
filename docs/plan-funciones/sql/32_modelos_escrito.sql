-- SQL 32 · Modelos de escritos con variables (BORRADOR del plan de funciones, 2026-09-29).
-- Al implementarlo: copiar a sql/AAAA-MM-DD_32_modelos_escrito.sql. Se puede volver a correr sin problema.
--
-- 1) modelos_escrito: plantillas propias (reclamo, reiteración, aceptación, intimación, mediación, judiciales...).
--    Sintaxis del cuerpo (la interpreta src/utils/plantillas.js):
--      {{asegurado}}, {{compania.razon_social}}, {{hoy_largo}}...  → variable (ver docs/plan-funciones/PLAN.md, "Variables")
--      {{? monto_ofrecido | Monto ofrecido | monto}}                → pregunta al generar (clave | etiqueta | tipo texto|monto|fecha)
--      {{#si nro_siniestro}} ... {{/si}}                            → el bloque aparece solo si la variable tiene valor
--      # Título   /   **negrita**   /   1. ítem de lista            → formato mínimo para el PDF/Word
-- 2) escritos_generados: historial (qué modelo, para qué caso/expediente, texto final). Se ve en la Bitácora.
-- 3) pas_ajustes 'estudio': datos del abogado que hoy están fijos en generarEscrito.js.
-- Todo solo administrador (es_admin()).

create table if not exists public.modelos_escrito (
  id          uuid primary key default gen_random_uuid(),
  clave       text unique,                          -- id estable de los modelos base (para no duplicarlos al re-correr)
  titulo      text not null,
  categoria   text not null default 'otro'
                check (categoria in ('reclamo', 'seguimiento', 'acuerdo', 'intimacion', 'mediacion', 'judicial', 'cliente', 'otro')),
  ambito      text not null default 'caso' check (ambito in ('caso', 'expediente', 'ambos')),
  cuerpo      text not null default '',
  firma       text not null default 'estudio' check (firma in ('estudio', 'cliente', 'ambos', 'ninguna')),
  membrete    boolean not null default true,        -- pie con logo (pdfMembrete.js)
  orden       integer not null default 100,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists modelos_escrito_cat_idx on public.modelos_escrito (categoria, orden);

create or replace function public.tocar_updated_at() returns trigger language plpgsql as $fn$
begin new.updated_at := now(); return new; end $fn$;
drop trigger if exists trg_modelos_updated on public.modelos_escrito;
create trigger trg_modelos_updated before update on public.modelos_escrito
  for each row execute function public.tocar_updated_at();

create table if not exists public.escritos_generados (
  id             uuid primary key default gen_random_uuid(),
  modelo_id      uuid references public.modelos_escrito(id) on delete set null,
  caso_id        uuid references public.pas_casos(id) on delete cascade,
  expediente_id  uuid references public.expedientes(id) on delete cascade,
  titulo         text not null,
  cuerpo_final   text not null,                     -- texto ya completado (lo que salió en el PDF/Word)
  respuestas     jsonb not null default '{}'::jsonb, -- lo que se contestó en las preguntas {{? ...}}
  formato        text not null default 'pdf' check (formato in ('pdf', 'docx', 'texto')),
  archivo        text,                               -- nombre del archivo guardado en la carpeta
  created_at     timestamptz not null default now(),
  check (caso_id is null or expediente_id is null)
);
create index if not exists escritos_generados_caso_idx on public.escritos_generados (caso_id, created_at desc);
create index if not exists escritos_generados_exp_idx  on public.escritos_generados (expediente_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['modelos_escrito', 'escritos_generados'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists admin_todo on public.%I', t);
    execute format('create policy admin_todo on public.%I for all to authenticated
                      using ((select public.es_admin())) with check ((select public.es_admin()))', t);
  end loop;
end $$;

-- 3) Datos del estudio (hoy fijos en src/utils/generarEscrito.js)
insert into public.pas_ajustes (clave, valor) values ('estudio', jsonb_build_object(
  'abogado',     'Alexis Torres Gaveglio',
  'matriculas',  'T°142 F°636 C.P.A.C.F. y L° IV F° 20 del C.A.M.G.R.',
  'condicion_fiscal', 'responsable monotributo',
  'cuit',        '20-39340318-8',
  'domicilio',   'Pte. Saenz Peña 943, Depto 76 piso 7, CABA',
  'mail',        '',
  'telefono',    ''
)) on conflict (clave) do nothing;

-- Modelos base (editables desde Herramientas → Modelos; re-correr no pisa lo editado)
insert into public.modelos_escrito (clave, titulo, categoria, ambito, firma, orden, cuerpo) values
('reclamo_extrajudicial', 'Reclamo extrajudicial (tercero)', 'reclamo', 'caso', 'ambos', 10,
$t$# RECLAMO EXTRAJUDICIAL
**{{compania.razon_social}}**
{{#si compania.cuit}}CUIT {{compania.cuit}}{{/si}}
{{#si compania.domicilio}}Domicilio: {{compania.domicilio}}{{/si}}
Reclamo de Terceros

{{estudio.abogado}}, abogado, inscripto al {{estudio.matriculas}}, {{estudio.condicion_fiscal}} CUIT {{estudio.cuit}}, en representación de {{asegurado_mayus}}, DNI {{dni}}, constituyendo domicilio en {{estudio.domicilio}}, vengo a iniciar formal reclamo por el siniestro ocurrido el día {{fecha_siniestro}}{{#si patente}}, en el que resultó dañado el vehículo dominio {{patente}}{{/si}}.

**I. Acompaña:**
{{documental}}
$t$),
('pedido_respuesta', 'Pedido de respuesta', 'seguimiento', 'caso', 'estudio', 20,
$t$Ref.: Siniestro {{#si nro_siniestro}}N° {{nro_siniestro}}{{/si}} · {{asegurado}} · Dominio {{patente}}

De mi consideración:

Me dirijo a Uds. en representación de {{asegurado}}, en relación al reclamo presentado el {{fecha_inicio_reclamo}} por el siniestro ocurrido el {{fecha_siniestro}}. A la fecha no hemos recibido respuesta, por lo que solicito se sirvan informar el estado del trámite y, en su caso, formular el ofrecimiento correspondiente.

Sin otro particular, saludo a Uds. atentamente.
$t$),
('reiteracion', 'Reiteración de reclamo', 'seguimiento', 'caso', 'estudio', 30,
$t$Ref.: Siniestro {{#si nro_siniestro}}N° {{nro_siniestro}}{{/si}} · {{asegurado}} · Dominio {{patente}}

De mi consideración:

Reitero el reclamo presentado el {{fecha_inicio_reclamo}} y el pedido de respuesta del {{fecha_reclamo}}, que a la fecha no han sido contestados. Solicito se expidan dentro de los próximos {{? dias_respuesta | Días para responder | texto}} días, bajo apercibimiento de iniciar la mediación prejudicial obligatoria y las acciones legales que correspondan, con costas.

Saludo a Uds. atentamente.
$t$),
('aceptacion_ofrecimiento', 'Aceptación de ofrecimiento', 'acuerdo', 'caso', 'ambos', 40,
$t$Ref.: Siniestro {{#si nro_siniestro}}N° {{nro_siniestro}}{{/si}} · {{asegurado}} · Dominio {{patente}}

De mi consideración:

En representación de {{asegurado}}, DNI {{dni}}, acepto el ofrecimiento de {{? monto_aceptado | Monto aceptado | monto}} ({{monto_aceptado_letras}}) formulado por esa compañía en concepto de indemnización total por los daños derivados del siniestro del {{fecha_siniestro}}. Solicito se me indiquen los pasos para la firma del convenio y el plazo de pago, que no podrá exceder el previsto en el art. 49 de la Ley 17.418.

Datos para la transferencia: {{? datos_transferencia | CBU / alias y titular | texto}}

Saludo a Uds. atentamente.
$t$),
('reconsideracion', 'Pedido de reconsideración del ofrecimiento', 'acuerdo', 'caso', 'estudio', 50,
$t$Ref.: Siniestro {{#si nro_siniestro}}N° {{nro_siniestro}}{{/si}} · {{asegurado}} · Dominio {{patente}}

De mi consideración:

Recibimos el ofrecimiento de {{monto_ofrecimiento}}, que no cubre los daños reclamados ({{monto_reclamado}}). Solicito su reconsideración teniendo en cuenta {{? fundamento | Fundamento (presupuesto, privación de uso, etc.) | texto}}.

Saludo a Uds. atentamente.
$t$),
('intimacion_pago', 'Intimación de pago (acuerdo incumplido)', 'intimacion', 'caso', 'estudio', 60,
$t$Ref.: Siniestro {{#si nro_siniestro}}N° {{nro_siniestro}}{{/si}} · {{asegurado}} · Dominio {{patente}}

Habiéndose acordado el pago de {{monto_acordado}} ({{monto_acordado_letras}}) con fecha {{fecha_aceptacion}}, a la fecha no se ha efectivizado. INTIMO a que en el plazo de tres (3) días hábiles abonen la suma acordada con más sus intereses, bajo apercibimiento de iniciar las acciones judiciales correspondientes y de efectuar la denuncia ante la Superintendencia de Seguros de la Nación, con costas.
$t$),
('solicitud_mediacion', 'Nota al cliente: pasamos a mediación', 'cliente', 'caso', 'ninguna', 70,
$t$Hola {{asegurado_nombre}}:

Te cuento que {{compania}} no hizo una oferta razonable, así que el próximo paso es la mediación prejudicial (es obligatoria antes de un juicio). No tenés que pagar nada ahora. Te vamos a avisar la fecha y, si es virtual, te mandamos el link.

Cualquier duda, escribime.
$t$),
('liquidacion_cliente', 'Nota al cliente con la liquidación', 'cliente', 'ambos', 'ninguna', 80,
$t$Hola {{asegurado_nombre}}:

Te paso cómo queda la cuenta:

{{liquidacion}}

Monto acordado: {{monto_acordado}}
Honorarios: {{monto_honorarios}}
Te queda: {{monto_cobro_asegurado}}
$t$),
('escrito_judicial_base', 'Escrito judicial (encabezado)', 'judicial', 'expediente', 'estudio', 90,
$t$**{{? objeto | Objeto del escrito (SUMILLA) | texto}}**

Señor Juez:

{{estudio.abogado}}, abogado, {{estudio.matriculas}}, por la {{rol_cliente}} en autos "{{caratula}}" (Expte. N° {{numero}}), que tramitan ante el {{juzgado}}{{#si secretaria}}, {{secretaria}}{{/si}}, constituyendo domicilio en {{estudio.domicilio}}, a V.S. respetuosamente digo:

{{? cuerpo | Cuerpo del escrito | texto}}

Proveer de conformidad,
SERÁ JUSTICIA.
$t$)
on conflict (clave) do nothing;

-- Control
select (select count(*) from public.modelos_escrito where clave is not null) as modelos_base_9,
       (select count(*) from public.pas_ajustes where clave = 'estudio') as estudio_1,
       (select count(*) from pg_policies where tablename in ('modelos_escrito', 'escritos_generados')) as politicas_2;

-- SQL 33 · Plazos condicionados: catálogo de actuaciones → plazo automático, y avisos (BORRADOR, 2026-09-29).
-- Al implementarlo: copiar a sql/AAAA-MM-DD_33_plazos_condicionados.sql. Se puede volver a correr sin problema.
--
-- La idea: en vez de cargar "15 días hábiles" a mano, se elige qué pasó ("Me notificaron el traslado de la demanda")
-- y la fecha; la app arma el plazo con los días, el cómputo y la clase del catálogo, y lo calcula con el motor
-- que ya existe (utils/plazos.js + calendarioJudicial.js). El aviso sale en el resumen diario (función notificar).
--
-- ⚠️ Los días del catálogo son los usuales de cada código, pero CADA FILA NACE CON verificado = false:
--    la app muestra "Revisar norma" hasta que la confirmes en Herramientas → Plazos → Catálogo.

create table if not exists public.tipos_plazo (
  id                 uuid primary key default gen_random_uuid(),
  clave              text unique,                    -- id estable de los precargados
  nombre             text not null,                  -- "Contestar la demanda"
  disparador         text not null,                  -- "Notificación del traslado de la demanda"
  dias               integer not null check (dias > 0),
  computo            text not null default 'habiles' check (computo in ('habiles', 'corridos')),
  clase              text not null default 'fatal' check (clase in ('fatal', 'ordinatorio', 'propio')),
  jurisdiccion       text not null default 'todas' check (jurisdiccion in ('todas', 'CABA', 'PBA', 'Federal')),
  fuero              text,                           -- vacío = cualquiera; si no, igual a expedientes.fuero
  ambito             text not null default 'expediente' check (ambito in ('caso', 'expediente', 'ambos')),
  norma              text,                           -- "art. 338 CPCCN"
  avisar_dias_antes  integer not null default 2 check (avisar_dias_antes >= 0),
  siguiente_clave    text,                           -- al cumplirlo, sugerir este otro (ej. apelación → agravios)
  verificado         boolean not null default false,
  activo             boolean not null default true,
  orden              integer not null default 100
);
create index if not exists tipos_plazo_busqueda_idx on public.tipos_plazo (ambito, jurisdiccion, orden);

alter table public.tipos_plazo enable row level security;
drop policy if exists admin_todo on public.tipos_plazo;
create policy admin_todo on public.tipos_plazo for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Plazos: de qué actuación salió, cuándo avisar y si ya se avisó
alter table public.plazos add column if not exists tipo_plazo_id     uuid references public.tipos_plazo(id) on delete set null;
alter table public.plazos add column if not exists avisar_dias_antes integer not null default 2;
alter table public.plazos add column if not exists avisado_en        date;          -- último día en que salió en el aviso
alter table public.plazos add column if not exists jurisdiccion      text;          -- copia de la del expediente al crear (para recalcular)
create index if not exists plazos_vence_pend_idx on public.plazos (vence) where estado = 'pendiente';

-- Catálogo inicial (verificado = false en todos)
insert into public.tipos_plazo (clave, nombre, disparador, dias, computo, clase, jurisdiccion, fuero, ambito, norma, siguiente_clave, orden) values
-- Nación / CABA (CPCCN)
('cpccn_contestacion',   'Contestar la demanda (ordinario)',       'Notificación del traslado de la demanda', 15, 'habiles', 'fatal', 'CABA',  'Civil y Comercial', 'expediente', 'art. 338 CPCCN', null, 10),
('cpccn_sumarisimo',     'Contestar la demanda (sumarísimo)',      'Notificación del traslado de la demanda',  5, 'habiles', 'fatal', 'CABA',  'Civil y Comercial', 'expediente', 'art. 498 CPCCN', null, 11),
('cpccn_traslado',       'Contestar un traslado o vista',          'Notificación del traslado',                5, 'habiles', 'fatal', 'CABA',  null,                'expediente', 'art. 150 CPCCN', null, 12),
('cpccn_revocatoria',    'Revocatoria',                            'Notificación de la providencia',           3, 'habiles', 'fatal', 'CABA',  null,                'expediente', 'art. 239 CPCCN', null, 13),
('cpccn_aclaratoria',    'Aclaratoria',                            'Notificación de la resolución',            3, 'habiles', 'fatal', 'CABA',  null,                'expediente', 'art. 166 inc. 2 CPCCN', null, 14),
('cpccn_apelacion',      'Apelar',                                 'Notificación de la sentencia o resolución', 5, 'habiles', 'fatal', 'CABA', null,                'expediente', 'art. 244 CPCCN', 'cpccn_agravios', 15),
('cpccn_fundar_relacion','Fundar apelación concedida en relación', 'Notificación de la concesión del recurso', 5, 'habiles', 'fatal', 'CABA',  null,                'expediente', 'art. 246 CPCCN', null, 16),
('cpccn_agravios',       'Expresar agravios (libremente)',         'Notificación del auto que pone los autos en la oficina', 10, 'habiles', 'fatal', 'CABA', null, 'expediente', 'art. 259 CPCCN', null, 17),
('cpccn_contesta_agr',   'Contestar agravios',                     'Notificación del traslado de los agravios', 10, 'habiles', 'fatal', 'CABA', null,               'expediente', 'art. 265 CPCCN', null, 18),
('cpccn_alegato',        'Alegar',                                 'Notificación de la puesta de autos para alegar', 6, 'habiles', 'fatal', 'CABA', null,        'expediente', 'art. 482 CPCCN', null, 19),
('cpccn_ref',            'Recurso extraordinario federal',         'Notificación de la sentencia definitiva',  10, 'habiles', 'fatal', 'todas', null,                'expediente', 'art. 257 CPCCN', null, 20),
('cpccn_queja',          'Queja por recurso denegado',             'Notificación de la denegatoria',           5, 'habiles', 'fatal', 'CABA',  null,                'expediente', 'art. 282 CPCCN', null, 21),
-- Provincia de Buenos Aires (CPCCBA)
('cpccba_contestacion',  'Contestar la demanda (ordinario)',       'Notificación del traslado de la demanda', 15, 'habiles', 'fatal', 'PBA',   'Civil y Comercial', 'expediente', 'art. 354 CPCCBA', null, 30),
('cpccba_traslado',      'Contestar un traslado o vista',          'Notificación del traslado',                5, 'habiles', 'fatal', 'PBA',   null,                'expediente', 'art. 150 CPCCBA', null, 31),
('cpccba_revocatoria',   'Revocatoria',                            'Notificación de la providencia',           3, 'habiles', 'fatal', 'PBA',   null,                'expediente', 'art. 239 CPCCBA', null, 32),
('cpccba_apelacion',     'Apelar',                                 'Notificación de la sentencia o resolución', 5, 'habiles', 'fatal', 'PBA',  null,                'expediente', 'art. 244 CPCCBA', 'cpccba_agravios', 33),
('cpccba_agravios',      'Expresar agravios (libremente)',         'Notificación de la providencia de autos',  10, 'habiles', 'fatal', 'PBA',   null,                'expediente', 'art. 254 CPCCBA', null, 34),
('cpccba_inaplicabilidad','Recurso de inaplicabilidad de ley',     'Notificación de la sentencia de Cámara',   10, 'habiles', 'fatal', 'PBA',   null,                'expediente', 'art. 279 CPCCBA', null, 35),
-- Laboral CABA (Ley 18.345)
('lab_nac_contestacion', 'Contestar la demanda (laboral)',         'Notificación del traslado de la demanda', 10, 'habiles', 'fatal', 'CABA',  'Laboral',           'expediente', 'art. 71 Ley 18.345', null, 40),
('lab_nac_apelacion',    'Apelar (laboral)',                       'Notificación de la sentencia',             6, 'habiles', 'fatal', 'CABA',  'Laboral',           'expediente', 'art. 116 Ley 18.345', null, 41),
-- Seguros (casos PAS): plazos de la compañía, para controlar
('seg_art56',            'La compañía debe pronunciarse',          'Recepción de la denuncia / información complementaria', 30, 'corridos', 'propio', 'todas', null, 'caso', 'art. 56 Ley 17.418', null, 60),
('seg_art49',            'La compañía debe pagar',                 'Crédito fijado / convenio firmado',        15, 'corridos', 'propio', 'todas', null,                'caso', 'art. 49 Ley 17.418', null, 61),
('seg_intimacion',       'Vence la intimación',                    'Recepción de la carta documento',          3, 'habiles', 'propio', 'todas', null,                'caso', 'plazo fijado en la intimación', null, 62)
on conflict (clave) do nothing;

-- Pendientes que tienen que salir en el aviso de HOY (lo usa la función notificar; también sirve para Hoy).
-- dias_restantes es en días corridos (el chip de la app los muestra en hábiles).
create or replace view public.plazos_para_avisar with (security_invoker = true) as
select p.id, p.titulo, p.vence, p.clase, p.caso_id, p.expediente_id,
       coalesce(e.caratula, c.asegurado) as de,
       (p.vence - (now() at time zone 'America/Argentina/Buenos_Aires')::date) as dias_restantes
  from public.plazos p
  left join public.expedientes e on e.id = p.expediente_id
  left join public.pas_casos   c on c.id = p.caso_id
 where p.estado = 'pendiente' and p.tipo = 'plazo' and p.vence is not null
   and p.vence <= (now() at time zone 'America/Argentina/Buenos_Aires')::date + p.avisar_dias_antes;

-- Control
select (select count(*) from public.tipos_plazo) as catalogo_23,
       (select count(*) from information_schema.columns where table_name = 'plazos'
          and column_name in ('tipo_plazo_id', 'avisar_dias_antes', 'avisado_en', 'jurisdiccion')) as columnas_4;

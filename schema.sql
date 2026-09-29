-- ATG Lex (antes PAS Tracker) · Esquema de Supabase (esquema public)
-- PAS Tracker · Esquema de Supabase (esquema public)
-- Regenerado el 2026-09-23 desde information_schema de la base de producción
-- y actualizado a mano con los SQL 09 a 15 (2026-09-24):
-- columnas, tipos, NOT NULL y valores por defecto son los reales.
-- No incluye claves primarias/foráneas ni índices (no se exportaron);
-- las marcadas "-- PK?" son las probables según el uso.
--
-- Seguridad (ver sql/):
--   · RLS activado en TODAS las tablas (2026-09-23_06_activar_rls.sql).
--     Política admin_todo: el administrador (tabla pas_admins, función es_admin()) puede todo.
--     Portal: cada PAS ve/deriva solo sus pas_casos, ve sus acciones, su pas_portal_users y su pas_lista.
--   · Funciones: es_admin(), mi_pas_id(), plazos_companias(), consultar_caso_cliente(patente, dni),
--     cliente_es_dueno, autorizar_subida_cliente, subida_autorizada, confirmar_subida_cliente,
--     documentos_enviados_cliente, extras_cliente, eliminar_caso(caso_id), restaurar_caso(papelera_id) (SQL 26).
--   · Trigger trg_pas_casos_fecha_mensaje completa mensaje_cliente_fecha.
--   · Trigger trg_auditar (SQL 31) en pas_casos, expedientes, plazos, pas_eventos, gastos, pas_ofertas y pas_companias:
--     registra en auditoria cada alta, cambio (solo los campos que cambiaron) y borrado. Función historial_de(tabla, id).
--   · Storage: 'adjuntos' (público por link; subida solo a <pas_id>/ propio) y 'recepcion'
--     (privado; lo que sube el cliente, con autorización de 15 minutos).
--   · Copias de seguridad: esquemas backup_20260922, backup_20260924 (limpieza, SQL 15) y backup_fechas (SQL 16).
-- ============================================================


-- ── Casos ────────────────────────────────────────────────────

create table public.pas_casos (
  id                        uuid not null default gen_random_uuid(),   -- PK?
  pas_id                    integer not null,       -- PAS que derivó (pas_contactos.id / pas_manuales.id)
  caso_id                   bigint not null,        -- número legible (Date.now() al crear)
  asegurado                 text,
  dni_asegurado             text,                   -- el cliente entra con patente + últimos 3 dígitos
  estado                    text,                   -- doc_pendiente | iniciado | reclamado | con_ofrecimiento | en_mediacion | en_juicio | esperando_pago | cobrado | desistido
  nota                      text,
  nro_siniestro             text,
  fecha_siniestro           date,                   -- era texto hasta el SQL 16
  ubicacion                 text,
  presupuesto               numeric,
  tercero_nombre            text,
  tercero_dni               text,
  tercero_contacto          text,                   -- ⚠ el portal guarda acá el teléfono del asegurado
  vehiculo                  text,
  motor                     text,
  chasis                    text,
  vehiculo_tercero          text,
  dominio_tercero           text,
  relato                    text,
  comentarios               text,
  fecha_derivacion          date,
  fecha_contacto_asegurado  date,
  fecha_inicio_reclamo      date,
  fecha_ultimo_movimiento   date,
  monto_ofrecimiento        numeric,
  monto_cobro_asegurado     numeric,
  monto_cobro_yo            numeric,
  monto_comision_pas        numeric,
  created_at                timestamp without time zone default now(),
  carpeta_path              text,
  primer_ofrecimiento       numeric,
  segundo_ofrecimiento      numeric,
  fecha_carga               date,
  fecha_reclamo             date,
  fecha_ultimo_reclamo      date,
  fecha_ofrecimiento        date,
  fecha_reconsideracion     date,
  fecha_aceptacion          date,
  fecha_firma               date,
  fecha_pago                date,
  fecha_cobro               date,
  fecha_mediacion           date,
  fecha_inicio_juicio       date,
  monto_acordado            numeric,
  plazo_pago                integer,
  porcentaje_honorarios     numeric,
  monto_honorarios          numeric,
  estado_honorarios         text not null default 'NO_FACTURADO'::text,
  fecha_factura             date,
  fecha_cobro_honorarios    date,
  compania_aseguradora      text,                   -- reemplazó a "compania" (borrada 2026-09-23)
  monto_reclamado           numeric,                -- era texto hasta 2026-09-23
  proxima_accion            text,
  mensaje_cliente           text,                   -- lo ven el PAS (portal) y el cliente
  patente                   text,                   -- reemplazó a "dominio" (borrada 2026-09-23)
  proxima_accion_vence      date,
  mensaje_cliente_fecha     timestamp with time zone, -- la completa un trigger
  origen                    text,                   -- 'portal' | 'estudio' (SQL 09)
  revisado_en               timestamp with time zone, -- cuándo lo tomaste; vacío = sin revisar (SQL 09)
  telefono_asegurado        text,                   -- SQL 09
  documentacion             jsonb not null default '{}'::jsonb  -- checklist manual {TIPO: 'YYYY-MM-DD'} (SQL 12)
);

-- Movimientos / bitácora de cada caso
create table public.acciones (
  id           uuid not null default gen_random_uuid(),   -- PK?
  caso_id      text not null,          -- pas_casos.id (uuid guardado como texto)
  tipo         text not null,
  descripcion  text,
  fecha        timestamp with time zone not null default now(),
  created_at   timestamp with time zone not null default now()
);

-- Agenda: mediaciones, audiencias, etc. (SQL 10; el PAS lee las de sus casos, SQL 13)
create table public.pas_eventos (
  id            uuid primary key default gen_random_uuid(),
  caso_id       uuid not null references public.pas_casos(id) on delete cascade,
  tipo          text not null default 'mediacion', -- mediacion | audiencia | vencimiento | reunion | otro
  inicio        timestamp with time zone not null,
  duracion_min  integer,
  link          text,
  lugar         text,
  notas         text
);

-- Lo que sube el cliente desde su vista (SQL 11): autorizada → subida → guardada
create table public.pas_subidas_cliente (
  id              uuid primary key default gen_random_uuid(),
  caso_id         uuid not null references public.pas_casos(id) on delete cascade,
  tipo            text not null,
  nombre_original text,
  ruta            text not null unique,
  estado          text not null default 'autorizada',
  creado          timestamp with time zone not null default now(),
  expira          timestamp with time zone not null default now() + interval '15 minutes'
);

-- Notificaciones push (SQL 17): dispositivos activados y avisos ya enviados (los usa la función "notificar")
create table public.pas_push_suscripciones (
  endpoint     text primary key,
  p256dh       text not null,
  auth         text not null,
  user_id      uuid default auth.uid(),
  dispositivo  text,
  creado       timestamp with time zone not null default now()
);
create table public.pas_avisos (
  clave   text primary key,             -- caso:<id> | subida:<caso>:<media hora> | agenda:<evento>:<fecha>
  creado  timestamp with time zone not null default now()
);

-- Configuración interna de la función "notificar" (sus claves VAPID). RLS sin políticas (SQL 17)
create table public.pas_config (
  clave  text primary key,
  valor  text not null
);

-- Margen de "reclamo quieto" por compañía; '*' = general (SQL 14)
create table public.pas_margen_companias (
  compania  text primary key,
  dias      integer not null check (dias between 1 and 365)
);

-- Papelera de casos (SQL 26): copia completa del caso eliminado; se recupera con restaurar_caso(id).
-- La llenan eliminar_caso(caso_id) y la vacía el cron 'vaciar_papelera' a los 30 días.
create table public.pas_papelera (
  id            uuid primary key default gen_random_uuid(),
  caso_id       uuid not null,
  pas_id        text,
  asegurado     text,
  patente       text,
  compania      text,
  datos         jsonb not null,   -- { caso, acciones, eventos, ofertas, contactos, plazos, subidas, expedientes }
  eliminado_en  timestamptz not null default now()
);

-- Herramientas (SQL 27). Además: pas_casos.domicilio_asegurado/cp_/localidad_/provincia_asegurado
-- y pas_companias.domicilio/cp/localidad/provincia (los completa la carta documento).
-- ipc = variación mensual % (fecha = primer día del mes); icl = valor diario; tasa_activa_bna = TNA % desde esa fecha
create table public.indices (
  serie        text not null check (serie in ('ipc', 'icl', 'tasa_activa_bna')),
  fecha        date not null,
  valor        numeric not null,
  actualizado  timestamptz not null default now(),
  primary key (serie, fecha)
);
create table public.modelos_carta (
  id      uuid primary key default gen_random_uuid(),
  titulo  text not null,
  texto   text not null,
  creado  timestamptz not null default now()
);
create table public.pas_ajustes (      -- clave 'remitente_estudio': datos de remitente para las cartas
  clave        text primary key,
  valor        jsonb not null,
  actualizado  timestamptz not null default now()
);


-- ── Prospección de PAS ───────────────────────────────────────

-- PAS importados desde Excel (~51 mil)
create table public.pas_contactos (
  id           text not null,          -- PK?  ⚠ texto; en el resto de las tablas pas_id es integer
  nombre       text not null,
  mail         text,
  telefonos    text,                   -- separados por coma
  contacto     text,
  respuesta    text,
  seguimiento  text,
  prioridad    text default 'otros'::text   -- agendado | multi | sin_tel | otros
);

-- Cada contacto registrado con un PAS
create table public.pas_historial (
  id          uuid not null default gen_random_uuid(),   -- PK?
  pas_id      integer not null,
  fecha       date,                    -- era texto hasta el SQL 16
  resultados  jsonb,                   -- tipos de respuesta viejos (ya no se muestran)
  nota        text,
  ts          bigint,                  -- Date.now()
  created_at  timestamp without time zone default now()
);

-- PAS que derivan casos
create table public.pas_derivadores (
  pas_id      integer not null,        -- PK?
  activo      boolean default true,
  created_at  timestamp without time zone default now()
);

-- PAS descartados
create table public.pas_descartados (
  pas_id  integer not null,            -- PK?
  activo  boolean default true
);

-- PAS cargados a mano (no vienen del Excel)
create table public.pas_manuales (
  id          text not null,           -- PK?
  nombre      text not null,
  mail        text,
  telefonos   jsonb default '[]'::jsonb,
  created_at  timestamp with time zone default now()
);


-- ── Portal de productores ────────────────────────────────────

-- Ficha del PAS que ve el portal
create table public.pas_lista (
  id           integer not null default nextval('pas_lista_id_seq'::regclass),   -- PK?
  pas_id       integer not null,
  nombre       text,
  mail         text,
  telefonos    text[],
  contacto     text,
  respuesta    text,
  seguimiento  text,
  prioridad    text
);

-- Usuario de Supabase Auth ↔ PAS
create table public.pas_portal_users (
  id          uuid not null default gen_random_uuid(),   -- PK?
  user_id     uuid,                    -- auth.users.id
  pas_id      integer not null,
  created_at  timestamp without time zone default now()
);


-- ── Seguridad ────────────────────────────────────────────────

-- Administradores de la app (sql/2026-09-23_05)
create table public.pas_admins (
  user_id  uuid not null               -- PK, references auth.users(id) on delete cascade
);

-- Intentos fallidos de la vista del cliente (sql/2026-09-23_04)
create table public.pas_cliente_intentos (
  patente  text not null,
  creado   timestamp with time zone not null default now()
);

-- Auditoría de cambios (sql/2026-09-29_31). Solo lectura para el administrador; escribe el trigger auditar().
create table public.auditoria (
  id         bigint generated always as identity primary key,
  tabla      text        not null,
  fila_id    text        not null,
  operacion  text        not null,                    -- INSERT | UPDATE | DELETE
  cambios    jsonb       not null default '{}'::jsonb, -- UPDATE: {campo: [antes, despues]} · INSERT/DELETE: fila completa
  usuario    uuid,                                     -- auth.uid(); vacío = sistema
  rol        text        not null default 'sistema',   -- admin | pas | cliente | sistema
  en         timestamp with time zone not null default now()
);

-- Modelos de escritos (sql/2026-09-29_32). Solo administrador. Sintaxis del cuerpo en src/utils/plantillas.js.
create table public.modelos_escrito (
  id          uuid primary key default gen_random_uuid(),
  clave       text unique,                 -- id estable de los 9 modelos base (no se pueden eliminar, sí editar/desactivar)
  titulo      text not null,
  categoria   text not null default 'otro', -- reclamo | seguimiento | acuerdo | intimacion | mediacion | judicial | cliente | otro
  ambito      text not null default 'caso', -- caso | expediente | ambos
  cuerpo      text not null default '',
  firma       text not null default 'estudio', -- cliente | estudio | ambos | ninguna
  membrete    boolean not null default true,
  orden       integer not null default 100,
  activo      boolean not null default true,
  created_at  timestamp with time zone not null default now(),
  updated_at  timestamp with time zone not null default now()  -- trigger trg_modelos_updated
);

-- Historial de escritos generados (sql/2026-09-29_32)
create table public.escritos_generados (
  id             uuid primary key default gen_random_uuid(),
  modelo_id      uuid,                      -- modelos_escrito.id (on delete set null)
  caso_id        uuid,                      -- pas_casos.id (cascade)
  expediente_id  uuid,                      -- expedientes.id (cascade)
  titulo         text not null,
  cuerpo_final   text not null,
  respuestas     jsonb not null default '{}'::jsonb,
  formato        text not null default 'pdf', -- pdf | docx | texto
  archivo        text,
  created_at     timestamp with time zone not null default now()
);
-- pas_ajustes clave 'estudio': datos del abogado para los escritos (Herramientas → Mis datos).

-- Catálogo de actuaciones → plazo (sql/2026-09-29_33). Solo administrador. Los precargados nacen verificado = false.
create table public.tipos_plazo (
  id                 uuid primary key default gen_random_uuid(),
  clave              text unique,           -- id estable de los 23 precargados
  nombre             text not null,         -- "Contestar la demanda"
  disparador         text not null,         -- "Notificación del traslado de la demanda"
  dias               integer not null,
  computo            text not null default 'habiles',   -- habiles | corridos
  clase              text not null default 'fatal',     -- fatal | ordinatorio | propio
  jurisdiccion       text not null default 'todas',     -- todas | CABA | PBA | Federal
  fuero              text,                  -- vacío = cualquiera
  ambito             text not null default 'expediente', -- caso | expediente | ambos
  norma              text,
  avisar_dias_antes  integer not null default 2,
  siguiente_clave    text,                  -- al cumplirlo, sugerir este
  verificado         boolean not null default false,
  activo             boolean not null default true,
  orden              integer not null default 100
);
-- plazos (SQL 33): + tipo_plazo_id, avisar_dias_antes (default 2), avisado_en (date), jurisdiccion.
-- Vista plazos_para_avisar (security_invoker): pendientes con vence <= hoy + avisar_dias_antes; la usa la función notificar.

-- Calendario suscribible (sql/2026-09-29_34). Solo administrador; la función "calendario" lo lee con service role.
-- No entra en la copia de seguridad semanal: el token es un secreto (se regenera desde la app).
create table public.calendario_tokens (
  token        text primary key,            -- 64 caracteres al azar; va en la URL del calendario
  nombre       text not null default 'Mi calendario',
  incluir      jsonb not null,              -- {"eventos": bool, "plazos": bool, "acciones": bool, "escritos": bool}
  activo       boolean not null default true,
  creado       timestamp with time zone not null default now(),
  ultimo_uso   timestamp with time zone     -- última vez que Google (u otro) leyó el calendario
);
-- Función nuevo_token_calendario(p_incluir jsonb): solo administrador; apaga los anteriores y devuelve el token nuevo.

-- acciones (sql/2026-09-29_35): + visible_cliente boolean not null default false, + texto_cliente text (cómo lo lee el cliente).
-- Funciones (anon): movimientos_cliente(patente, dni, caso_id) → novedades del caso; consultar_expediente_cliente(dni, codigo)
-- → vista del cliente de un expediente visible. La política pas_ve_movimientos (SQL 06) sigue igual.

-- gastos (sql/2026-09-29_36): + recuperable boolean not null default false, + recuperar_de text (cliente | compania | costas), + recuperado_en date.
-- Vista resultado_casos (security_invoker): honorarios, comision_pas, gastos, gastos_por_recuperar, neto y dias_hasta_cobro por caso.
create table public.liquidaciones (
  id             uuid primary key default gen_random_uuid(),
  caso_id        uuid,                       -- pas_casos.id (cascade); o
  expediente_id  uuid,                       -- expedientes.id (cascade)
  titulo         text not null default 'Liquidación',
  capital        numeric not null,
  desde          date not null,
  hasta          date not null,
  metodo         text not null,              -- clave de utils/intereses.js (METODOS)
  resultado      numeric not null,
  detalle        jsonb not null default '{}'::jsonb,
  texto          text not null,              -- el "Copiar texto" de la calculadora; lo usa {{liquidacion}}
  created_at     timestamp with time zone not null default now()
);

-- expedientes (sql/2026-09-29_37): + portal text (pjn | mev | otro), + url_portal text,
-- + numero_normalizado text generado (solo dígitos y "/" del número) con índice, para enganchar las novedades.
create table public.novedades_judiciales (
  id             uuid primary key default gen_random_uuid(),
  expediente_id  uuid,                       -- expedientes.id (cascade); vacío = sin asignar
  fuente         text not null default 'manual', -- manual | mail | pjn | mev
  fecha          date not null default current_date,
  tipo           text,                       -- despacho | cedula | notificacion | otro
  texto          text not null,
  url            text,
  hash           text unique,                -- md5(fuente|expediente_id|texto), trigger trg_novedad_hash: no se carga dos veces
  estado         text not null default 'nueva', -- nueva | integrada | descartada
  plazo_id       uuid,                       -- plazos.id (set null): el plazo creado al integrarla
  created_at     timestamp with time zone not null default now(),
  resuelta_en    timestamp with time zone
);

-- ============================================================
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
--     documentos_enviados_cliente, extras_cliente.
--   · Trigger trg_pas_casos_fecha_mensaje completa mensaje_cliente_fecha.
--   · Storage: 'adjuntos' (público por link; subida solo a <pas_id>/ propio) y 'recepcion'
--     (privado; lo que sube el cliente, con autorización de 15 minutos).
--   · Copias de seguridad: esquemas backup_20260922 y backup_20260924 (limpieza del SQL 15).
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
  fecha_siniestro           text,                   -- ⚠ fecha guardada como texto (YYYY-MM-DD)
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
  fecha_derivacion          text,                   -- ⚠ texto
  fecha_contacto_asegurado  text,                   -- ⚠ texto
  fecha_inicio_reclamo      text,                   -- ⚠ texto
  fecha_ultimo_movimiento   text,                   -- ⚠ texto
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

-- Margen de "reclamo quieto" por compañía; '*' = general (SQL 14)
create table public.pas_margen_companias (
  compania  text primary key,
  dias      integer not null check (dias between 1 and 365)
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
  fecha       text,                    -- ⚠ texto
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

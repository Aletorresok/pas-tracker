-- ============================================================
-- PAS Tracker · Esquema de Supabase (esquema public)
-- Regenerado el 2026-09-23 desde information_schema de la base de producción:
-- columnas, tipos, NOT NULL y valores por defecto son los reales.
-- No incluye claves primarias/foráneas ni índices (no se exportaron);
-- las marcadas "-- PK?" son las probables según el uso.
--
-- Seguridad (ver sql/):
--   · RLS activado en TODAS las tablas (2026-09-23_06_activar_rls.sql).
--     Política admin_todo: el administrador (tabla pas_admins, función es_admin()) puede todo.
--     Portal: cada PAS ve/deriva solo sus pas_casos, ve sus acciones, su pas_portal_users y su pas_lista.
--   · Funciones: es_admin(), mi_pas_id(), plazos_companias(), consultar_caso_cliente(patente, dni).
--   · Trigger trg_pas_casos_fecha_mensaje completa mensaje_cliente_fecha.
--   · Storage: solo existe el bucket 'adjuntos' (público por link; subida solo a <pas_id>/ propio).
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
  recordatorio              text,                   -- sin uso
  notas_log                 jsonb default '[]'::jsonb,  -- bitácora vieja (hoy se usa la tabla acciones)
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
  mensaje_cliente_fecha     timestamp with time zone  -- la completa un trigger
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

-- Recordatorios (obsoletos: ya no se muestran)
create table public.pas_recordatorios (
  pas_id              integer not null,
  fecha_recordatorio  text
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


-- ── Tablas que la app NO usa (de una versión anterior; solo accesibles para el administrador) ──

create table public.aseguradoras (
  id             uuid not null default gen_random_uuid(),
  nombre_social  text not null,
  created_at     timestamp with time zone default timezone('utc'::text, now())
);

create table public.casos (
  id                 text not null,
  caratula           text,
  fuero              text,
  juzgado            text,
  secretaria         text,
  expediente         text,
  cliente            text,
  cliente_tel        text,
  contraparte        text,
  abogado_contrario  text,
  estado_expediente  text,
  fecha_inicio       date,
  notas              text
);

create table public.gestiones_judiciales (
  id                         uuid not null default gen_random_uuid(),
  apellido_nombre_asegurado  text not null,
  dni_asegurado              text not null,
  fecha_del_siniestro        date not null,
  aseguradora_id             uuid,
  estado                     text default 'Iniciado'::text,
  created_at                 timestamp with time zone default timezone('utc'::text, now())
);

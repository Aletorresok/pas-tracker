-- ============================================================
-- PAS Tracker - Schema de Supabase
-- Generado desde el código fuente (storage.js, hooks, components)
-- ============================================================

-- PAS importados desde Excel
CREATE TABLE pas_contactos (
  id            BIGINT PRIMARY KEY,
  nombre        TEXT,
  mail          TEXT,
  telefonos     TEXT,          -- teléfonos separados por coma
  contacto      TEXT,
  respuesta     TEXT,
  seguimiento   TEXT,
  prioridad     TEXT           -- agendado | multi | sin_tel
);

-- Log de contactos realizados a cada PAS
CREATE TABLE pas_historial (
  pas_id        BIGINT NOT NULL REFERENCES pas_contactos(id),
  fecha         TEXT,
  resultados    JSONB DEFAULT '[]',  -- array de keys de RESULTADOS_CONTACTO
  nota          TEXT,
  ts            BIGINT NOT NULL,     -- timestamp (Date.now())
  PRIMARY KEY (pas_id, ts)
);

-- Casos legales (tabla principal, ~45 campos)
CREATE TABLE pas_casos (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id                   BIGINT,
  pas_id                    BIGINT NOT NULL,

  -- Datos del asegurado
  asegurado                 TEXT,
  dni_asegurado             TEXT,

  -- Estado y seguimiento
  estado                    TEXT,    -- doc_pendiente|iniciado|reclamado|con_ofrecimiento|en_mediacion|en_juicio|esperando_pago|cobrado|desistido
  estado_honorarios         TEXT DEFAULT 'NO_FACTURADO',  -- NO_FACTURADO|FACTURADO|COBRADO
  nota                      TEXT,
  notas_log                 TEXT,
  comentarios               TEXT,
  recordatorio              TEXT,

  -- Compañía y siniestro
  compania                  TEXT,
  nro_siniestro             TEXT,
  ubicacion                 TEXT,
  relato                    TEXT,

  -- Vehículo asegurado
  vehiculo                  TEXT,
  dominio                   TEXT,
  motor                     TEXT,
  chasis                    TEXT,

  -- Tercero
  tercero_nombre            TEXT,
  tercero_dni               TEXT,
  tercero_contacto          TEXT,
  vehiculo_tercero          TEXT,
  dominio_tercero           TEXT,

  -- Montos
  presupuesto               NUMERIC,
  monto_ofrecimiento        NUMERIC,
  monto_cobro_asegurado     NUMERIC,
  monto_cobro_yo            NUMERIC,
  monto_comision_pas        NUMERIC,
  monto_acordado            NUMERIC,
  monto_honorarios          NUMERIC,
  primer_ofrecimiento       NUMERIC,
  segundo_ofrecimiento      NUMERIC,
  porcentaje_honorarios     NUMERIC,
  plazo_pago                TEXT,

  -- Fechas
  fecha_siniestro           TEXT,
  fecha_derivacion          TEXT,
  fecha_contacto_asegurado  TEXT,
  fecha_inicio_reclamo      TEXT,
  fecha_ultimo_movimiento   TEXT,
  fecha_carga               TEXT,
  fecha_reclamo             TEXT,
  fecha_ultimo_reclamo      TEXT,
  fecha_ofrecimiento        TEXT,
  fecha_reconsideracion     TEXT,
  fecha_aceptacion          TEXT,
  fecha_firma               TEXT,
  fecha_pago                TEXT,
  fecha_cobro               TEXT,
  fecha_mediacion           TEXT,
  fecha_inicio_juicio       TEXT,
  fecha_factura             TEXT,
  fecha_cobro_honorarios    TEXT,

  -- Archivos
  carpeta_path              TEXT
);

-- PAS marcados como derivadores (pueden tener casos)
CREATE TABLE pas_derivadores (
  pas_id        BIGINT PRIMARY KEY REFERENCES pas_contactos(id),
  activo        BOOLEAN DEFAULT TRUE
);

-- Recordatorios de seguimiento
CREATE TABLE pas_recordatorios (
  pas_id              BIGINT PRIMARY KEY REFERENCES pas_contactos(id),
  fecha_recordatorio  TEXT
);

-- PAS descartados/archivados
CREATE TABLE pas_descartados (
  pas_id        BIGINT PRIMARY KEY REFERENCES pas_contactos(id),
  activo        BOOLEAN DEFAULT TRUE
);

-- PAS creados manualmente (no vienen de Excel)
CREATE TABLE pas_manuales (
  id            TEXT PRIMARY KEY,   -- UUID generado en frontend
  nombre        TEXT,
  mail          TEXT,
  telefonos     TEXT,
  contacto      TEXT,
  respuesta     TEXT,
  seguimiento   TEXT
);

-- Mapeo usuario de portal → PAS
CREATE TABLE pas_portal_users (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id),
  pas_id        BIGINT NOT NULL
);

-- Info de PAS para el portal
CREATE TABLE pas_lista (
  pas_id        BIGINT PRIMARY KEY,
  nombre        TEXT,
  mail          TEXT,
  telefonos     TEXT
);

-- Timeline de acciones por caso
CREATE TABLE acciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id       BIGINT NOT NULL,
  descripcion   TEXT,
  fecha         TEXT,
  tipo          TEXT
);

# ATG Lex (antes PAS Tracker) - CLAUDE.md

## Comandos

- `npm run dev` — Inicia Vite dev server (HMR)
- `npm run build` — Build de producción (dist/)
- `npm run preview` — Preview del build de producción
- Requiere `.env` (ver `.env.example`): credenciales de Supabase y EmailJS vía `import.meta.env`.

## Stack

- React 18 + Vite 5 + React Router 6 (JavaScript, sin TypeScript)
- Supabase (PostgreSQL + Auth + Realtime)
- jsPDF (generación de escritos), XLSX (import Excel)
- Inline styles + tokens de color como variables CSS en `src/index.css` (sin Tailwind). No usar hex en componentes: `T.*`, `COLORES.*`, `var(--x)` y `alpha()` de `utils/theme.js`.

## Arquitectura

### Rutas
- `/` → App.jsx (PIN gate → 6 tabs: dashboard, casos, contactos, contactados, clientes, portal-usuarios)
- `/portal/*` → Portal.jsx (login Supabase Auth → PortalHome para PAS)

### Estructura de archivos
```
src/
  App.jsx              — Container principal, PIN "3934", tabs, backup
  Portal.jsx           — Rutas del portal PAS (auth Supabase)
  CasoUnificado.jsx    — Modal detalle de caso (info, montos, honorarios, fechas, timeline, archivos, auto-save)
  supabase.js          — Cliente Supabase
  components/
    TabDashboard.jsx   — Dashboard financiero con embudo de estados
    TabCasos.jsx       — Vista global de todos los casos (búsqueda, filtros, edición)
    TabContactos.jsx   — PAS no contactados
    TabContactados.jsx — PAS contactados con historial
    TabClientes.jsx    — Casos agrupados por PAS derivador
    TabPortalUsuarios.jsx — Gestión de usuarios del portal
    ContactModal.jsx   — Modal para registrar resultado de contacto
    PASCard.jsx        — Card individual de PAS
    CarpetaLocal.jsx   — Gestión de archivos del caso
    caso/              — Sub-secciones del detalle de caso
    portal/            — Componentes del portal PAS
  hooks/
    usePASData.js      — Carga inicial de todas las tablas
    useRealtimeSync.js — Listeners realtime Supabase
  utils/
    storage.js         — CRUD Supabase (upsert/insert/delete)
    formatters.js      — Formato de fechas, montos, teléfonos
    theme.js           — Colores y theme centralizado (COLORES + THEME)
    generarEscrito.js  — Generación de PDF con datos del caso
    carpeta.js         — Operaciones de archivos/carpetas
    categorizarArchivo.js — Categorización automática de docs
  constants.js         — Estados, resultados, tipos de doc
```

### Tablas Supabase
- `pas_contactos` — Lista de PAS (import Excel)
- `pas_historial` — Log de contactos por PAS
- `pas_casos` — Casos con 40+ campos (estado, montos, fechas, honorarios)
- `pas_derivadores` — PAS marcados como derivadores
- `pas_recordatorios` — Recordatorios de seguimiento
- `pas_descartados` — PAS archivados
- `pas_manuales` — PAS creados manualmente
- `pas_portal_users` — Mapeo usuario portal → PAS
- `pas_lista` — Info PAS para portal
- `acciones` — Timeline de acciones por caso

En `pas_casos` usar siempre `patente` y `compania_aseguradora` (las columnas `dominio` y `compania` son legacy, no usarlas).
Migraciones SQL manuales en `sql/` (se corren a mano en el SQL Editor de Supabase). Mantener `Context.md` actualizado con cada cambio.

### Estado global
No hay Redux/Zustand. Estado en hooks de React + Supabase realtime.
`usePASData()` carga las 7 tablas al montar. Cambios se persisten con `saveStorage()` y se sincronizan via realtime.

### Flujo de datos de un caso
```
PAS (contacto) → derivador → caso creado → estados:
doc_pendiente → iniciado → reclamado → con_ofrecimiento → en_mediacion → en_juicio → esperando_pago → cobrado | desistido
```

## Convenciones

- Archivos JSX en español (nombres de variables, funciones, comentarios)
- Colores: tokens en `src/index.css`; temas por `data-theme` (claro/oscuro) y `data-accent` (dorado/marino/borgona/grafito) en `<html>`
- Componentes base en `src/components/ui/` (Icono, Boton, EstadoPill, BarraAvance). Sin emojis en la interfaz.
- Modo oscuro y acento en `ThemeContext` (sigue al sistema si el usuario no eligió)
- Estilos inline como objetos JS en cada componente
- Inserts grandes se splitean en chunks de 200 rows
- UUIDs con fallback para navegadores viejos
- Auto-backup a localStorage en cada cambio de casos
- Auto-save con debounce (2.5s) en CasoUnificado

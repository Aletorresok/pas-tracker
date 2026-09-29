# ATG Lex (antes PAS Tracker) - CLAUDE.md

## Comandos

- `npm run dev` — Inicia Vite dev server (HMR)
- `npm run build` — Build de producción (dist/)
- `npm run preview` — Preview del build de producción
- Requiere `.env` (ver `.env.example`): credenciales de Supabase y EmailJS vía `import.meta.env`.

## Stack

- React 18 + Vite 5 + React Router 6 (JavaScript, sin TypeScript)
- Supabase (PostgreSQL + Auth + Realtime)
- jsPDF (generación de escritos), XLSX (import Excel), @dnd-kit (drag-and-drop)
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
- `pas_companias` — Ficha única de cada compañía (clave = nombre corto de `compania_aseguradora`): razón social, CUIT, domicilio (`domicilio`, `cp`, `localidad`, `provincia`; es el legal y el de notificar; las columnas `legal_*` no se usan), mail/teléfono general, honorarios %, plazo de pago
- `pas_compania_contactos` — Contactos por compañía (siniestros, estudio gestor, analista, mediación, facturación)

Los datos de una compañía se leen siempre del directorio (`utils/companias.js`: `useDirectorio`, `fichaDe`, `nombreLegal`, `domicilioDe`) y la ficha se abre desde cualquier lado con `abrirCompania(nombre)`.

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

## Filosofía de interfaz (aplicar en todo lo nuevo)

**Aspecto**: redondo, con aire, que responde al tacto. Radios solo con tokens `var(--r-xs|sm|md|lg|xl|pill)` (nunca números); elevación `--sh-1` (reposo) / `--sh-2` (hover) / `--sh-3` (levantado o ventana); movimiento `--ease` y `--spring`. Clases comunes en `index.css`: `.tarjeta`, `.tarjeta-lift`, `.lift`, `.panel-vidrio`, `.chip` / `.chips` (filtros con conteo), `.segmentado` (cambiar de vista).

**Interacción** — las mismas tres reglas en todas las pantallas:
1. **Tocar** un ítem lo abre (ficha o detalle).
2. **Click derecho** (mantener apretado en Android, tecla Menú / Shift+F10) abre sus acciones. Menú único (`MenuHost` en `main.jsx`); se engancha con `{...propsMenu(() => items)}`. Los ítems de cada entidad salen de `utils/menus.js` (`itemsCaso`, `itemsExpediente`, `itemsPAS`): no armar menús a mano en cada pantalla.
3. **Arrastrar** solo donde mover significa algo: reordenar listas personales (`ui/ListaOrdenable`, Hoy) o cambiar de etapa (`ui/TableroEtapas`, Casos y Expedientes). Todo tablero ofrece también "Mover a" en el menú (alternativa sin arrastre).

**Carga**: cada pestaña se importa con `lazy()` en `App.jsx`; librerías pesadas (xlsx, jsPDF, pdf.js, pdf-lib) con `await import()` en el momento de usarlas. React, Supabase y dnd-kit van en archivos aparte (`vite.config.js`).

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

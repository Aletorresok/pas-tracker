# PAS Tracker

Sistema de gestión de casos legales para seguros (siniestros) en Argentina. Permite gestionar contactos de Productores de Seguros (PAS), trackear casos desde la derivación hasta el cobro, y ofrecer un portal donde los PAS ven el estado de sus casos.

## Tech Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18.3 + React Router 6 |
| Build | Vite 5.4 |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime) |
| Desktop | Electron 32 (portable .exe) |
| PDF | jsPDF 2.5 |
| Excel | XLSX 0.18 |
| Estilos | Inline CSS-in-JS (sin framework CSS) |
| Lenguaje | JavaScript ES6+ (sin TypeScript) |

## Setup

```bash
npm install
npm run dev        # Dev server (localhost:5173)
npm run start      # Dev + Electron
npm run dist       # Build + .exe portable
```

Requiere `.env` con las variables de Supabase (ver `src/supabase.js`).

## Estructura del proyecto

```
src/
├── App.jsx                 # App principal: PIN gate, 5 tabs, backup
├── Portal.jsx              # Portal PAS: auth + rutas
├── CasoUnificado.jsx       # Modal detalle de caso
├── supabase.js             # Clientes Supabase (principal + agendalegal)
├── constants.js            # Estados, resultados, tipos de doc
│
├── components/
│   ├── TabDashboard.jsx    # KPIs, gráfico mensual, casos inactivos
│   ├── TabClientes.jsx     # Lista PAS + sus casos, crear/editar caso
│   ├── TabContactos.jsx    # PAS sin contactar, filtros, paginación
│   ├── TabContactados.jsx  # PAS ya contactados, filtro por resultado
│   ├── TabPortalUsuarios   # Gestión de usuarios del portal
│   ├── ContactModal.jsx    # Registrar resultado de contacto
│   ├── PASCard.jsx         # Card de PAS individual
│   ├── CarpetaLocal.jsx    # Archivos vinculados al caso
│   ├── caso/               # Secciones del detalle: Info, Montos, Honorarios, Fechas, Timeline
│   └── portal/             # LoginScreen, PortalHome, PortalCasoCard
│
├── hooks/
│   ├── usePASData.js       # Carga todas las tablas al iniciar
│   └── useRealtimeSync.js  # Subscripciones realtime de Supabase
│
└── utils/
    ├── storage.js          # CRUD contra Supabase (upsert/insert/delete)
    ├── sync.js             # Sync casos → AgendaLegal (DB separada)
    ├── formatters.js       # Formato: fechas, montos ($), teléfonos
    ├── generarEscrito.js   # Genera PDF escrito con datos del caso
    ├── carpeta.js          # Operaciones con carpeta local de archivos
    └── categorizarArchivo.js # Auto-categoriza docs (DNI, DENUNCIA, etc.)
```

## Módulos principales

### 1. Gestión de contactos (TabContactos + TabContactados)

Importa un Excel con listado de PAS. Cada PAS tiene nombre, mail, teléfonos. Se clasifican por prioridad:
- **Agendado**: 1 teléfono
- **Multi**: 2+ teléfonos
- **Sin tel**: sin número

Al contactar, se registra el resultado (positivo/negativo/neutro/no respondió/número incorrecto/volver a contactar) en `pas_historial`. Si se marca "volver a contactar", se crea un recordatorio.

### 2. Gestión de casos (TabClientes + CasoUnificado)

Cada PAS derivador puede tener múltiples casos. Un caso pasa por 9 estados:

```
doc_pendiente → iniciado → reclamado → con_ofrecimiento → en_mediacion → en_juicio → esperando_pago → cobrado
                                                                                                    → desistido
```

El detalle de caso (CasoUnificado) tiene secciones:
- **Info**: asegurado, patente, compañía, siniestro
- **Montos**: monto reclamado, ofrecido, cobrado
- **Honorarios**: porcentaje, estado facturación (NO_FACTURADO/FACTURADO/COBRADO)
- **Fechas**: siniestro, inicio, mediación, sentencia
- **Timeline**: log de acciones (tabla `acciones`)
- **Archivos**: upload, categorización automática (DNI, DENUNCIA, CERTIFICADO, etc.)

### 3. Dashboard (TabDashboard)

- KPIs: total cobrado, comisiones, pendiente, acordado, en gestión
- Gráfico de barras: facturación mensual últimos 12 meses
- Lista de casos inactivos (>7 días sin actividad)
- Estado de honorarios por caso

### 4. Portal PAS (Portal.jsx + portal/)

Ruta separada `/portal`. Login con email/password (Supabase Auth). Cada PAS ve solo sus propios casos con estado actualizado en tiempo real. Incluye tracking de comisiones y caso demo para nuevos usuarios.

### 5. Generación de escritos (generarEscrito.js)

Genera PDF con jsPDF pre-rellenado con datos del caso. Se guarda en la carpeta vinculada al caso.

### 6. Sync con AgendaLegal (sync.js)

Exporta casos a una segunda base de datos Supabase (AgendaLegal) con mapeo de estados:
- `esperando_pago` → "Sentenciado"
- `cobrado` → "Finalizado"

## Base de datos (Supabase)

10 tablas principales:

| Tabla | Propósito |
|-------|-----------|
| `pas_contactos` | PAS importados de Excel |
| `pas_historial` | Log de contactos (fecha, resultados[], nota) |
| `pas_casos` | Casos con ~40 campos |
| `pas_derivadores` | Flag derivador activo |
| `pas_recordatorios` | Fecha de seguimiento |
| `pas_descartados` | PAS archivados |
| `pas_manuales` | PAS creados a mano |
| `pas_portal_users` | Mapeo auth user → PAS |
| `pas_lista` | Info PAS para portal |
| `acciones` | Timeline de acciones por caso |

## Autenticación

- **App principal**: PIN hardcodeado ("3934"), persiste en sessionStorage
- **Portal**: Supabase Auth (email/password), RLS por usuario

## Patrones técnicos

- Estado en React hooks (sin Redux/Zustand), persistido en Supabase
- Realtime via `supabase.channel().on('postgres_changes', ...)` 
- Inserts masivos en chunks de 200 rows
- Auto-backup a `localStorage.pastracker_autobackup` en cada cambio
- Backup manual descarga JSON con todas las tablas
- Paginación de 40 items por página en contactos
- Deploy web en Vercel, desktop como .exe portable con Electron Builder

PAS-Tracker — Documento de Contexto General🛠️ Stack TecnológicoFrontend: React 18.3, React Router 6, Vite 5.4.  Backend & DB: Supabase (PostgreSQL, Auth, Realtime).  Desktop: Electron 32 (empaquetado portable .exe).  Librerías clave: jsPDF (reportes/escritos), XLSX (lectura de planillas).  Estilos: Inline CSS-in-JS + index.css (temas claro/oscuro).  📂 Arquitectura de Directorios y Componentessrc/
├── main.jsx                 # Punto de entrada de React con react-router-dom[cite: 41, 55].
├── App.jsx                  # Orquestador admin (PIN gate '3934', 6 tabs, backups, Excel)[cite: 41, 51].
├── Portal.jsx               # Contenedor de la ruta /portal con sesión Supabase Auth[cite: 41, 56].
├── CasoUnificado.jsx        # Modal maestro de expediente (auto-save 2.5s, realtime)[cite: 41, 52].
├── supabase.js              # Cliente e instanciación de Supabase[cite: 41, 57].
├── constants.js             # Mapeo de estados, resultados de contacto, tipos de doc[cite: 41, 53].
│
├── components/
│   ├── TabDashboard.jsx     # KPIs financieros, embudo de ventas, inactividad[cite: 14, 41, 49].
│   ├── TabCasos.jsx         # Vista global de expedientes, filtros y búsqueda[cite: 16, 41].
│   ├── TabContactos.jsx     # Prospectos sin contactar por prioridad[cite: 18, 41, 49].
│   ├── TabContactados.jsx   # Historial de seguimiento a PAS[cite: 17, 41, 49].
│   ├── TabClientes.jsx      # Casos agrupados por PAS derivador[cite: 19, 41, 49].
│   ├── TabPortalUsuarios.jsx# Gestión de credenciales de acceso al portal.
│   ├── ContactModal.jsx     # Modal para registrar resultado de contacto e historial[cite: 13, 41].
│   ├── PASCard.jsx          # Tarjeta visual individual de PAS[cite: 15, 41].
│   ├── CarpetaLocal.jsx     # File System Access API para vincular carpetas locales[cite: 11, 41, 46].
│   ├── GraficoCompanias.jsx # Analítica por aseguradora[cite: 14].
│   │
│   ├── caso/                # Subcomponentes del expediente:
│   │   ├── SeccionInfo.jsx      # Datos básicos (Asegurado, Aseguradora, Estado)[cite: 30].
│   │   ├── SeccionMontos.jsx    # Desglose de importes del reclamo[cite: 31].
│   │   ├── SeccionHonorarios.jsx# Estado de facturación y alertas[cite: 29].
│   │   ├── SeccionFechas.jsx    # Ciclo de fechas del reclamo/juicio[cite: 28].
│   │   ├── SeccionTimeline.jsx  # Bitácora de acciones del caso[cite: 32].
│   │   ├── CompaniaSelector.jsx # Selector + alta de aseguradoras (localStorage)[cite: 26].
│   │   └── EstadoSelector.jsx   # Botones táctiles de estados con emojis[cite: 27].
│   │
│   └── portal/              # Módulos para el acceso de productores:
│       ├── LoginScreen.jsx          # Formulario de autenticación por email/pass[cite: 22].
│       ├── PortalHome.jsx           # Dashboard del PAS (sus casos en tiempo real)[cite: 24].
│       ├── PortalCasoCard.jsx       # Tarjeta de caso con PipelineBar e historial[cite: 23].
│       └── CambiarPasswordModal.jsx # Actualización de clave[cite: 21].
│
├── hooks/
│   ├── usePASData.js        # Carga paginada (chunks 1000) de las 7 tablas de DB[cite: 41, 58].
│   └── useRealtimeSync.js   # Subscripciones en tiempo real con Supabase[cite: 41].
│
└── utils/
    ├── storage.js           # Operaciones CRUD contra tablas de Supabase[cite: 38, 41].
    ├── formatters.js        # Formatos de $, fechas, teléfonos y link a WhatsApp[cite: 36, 41].
    ├── theme.js             # Definición de colores y estilos globales[cite: 39, 41].
    ├── carpeta.js           # Subida y descarga de archivos en Supabase Storage[cite: 33, 41].
    ├── categorizarArchivo.js# Normalización (DNI_1.pdf, FOTOS_2.jpg)[cite: 34, 41].
    ├── generarEscrito.js    # Creación e impresión del escrito extrajudicial en PDF[cite: 37, 41].
    └── exportarCasoPDF.js   # Generación del reporte resumen del expediente[cite: 35].
🗄️ Esquema de Base de Datos (Supabase)pas_contactos: Base importada de Excel.  pas_historial: Registro de llamadas y prospectado.  pas_casos: Expedientes con ~40 campos (montos, fechas, honorarios).  pas_derivadores: Flag de productores activos.  pas_recordatorios: Fechas agendadas para volver a llamar.  pas_descartados: Productores archivados.  pas_manuales: PAS ingresados a mano.  pas_portal_users: Mapeo entre Auth User y pas_id.  pas_lista: Info para perfil de portal.  acciones: Timeline de bitácora vinculada a cada caso[cite: 41, 49].🔄 Flujo de Trabajo PrincipalCaptación: Carga masiva por Excel en TabContactos.  Derivación: El PAS derivador genera un caso (TabClientes).  Gestión: El expediente pasa por sus 9 estados (doc_pendiente → cobrado/desistido).  Documentación: Carga/categorización de archivos remotos o carpetas del disco real vía CarpetaLocal.  Portal PAS: El productor ingresa a /portal y consulta únicamente el avance de sus expedientes vinculados.  🚀 Pendientes / Roadmap de RefactorizaciónCrear ThemeContext / Zustand: Evitar prop-drilling de darkMode y Th.  Modal Manager en App.jsx: Simplificar los múltiples useState de modales por un orquestador unificado.  Optimizar CasoUnificado.jsx: Aislar la lógica de File System Access / Supabase Storage en un subcomponente dedicado (CasoFileManager).  Seguridad API: Mover llamados a servicios de IA desde generarEscrito.js hacia Edge Functions de Supabase.  
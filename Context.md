# PAS-Tracker — Documento de Contexto General

## 🛠️ Stack Tecnológico
*   **Frontend:** React 18.3, React Router 6, Vite 5.4.
*   **Backend & DB:** Supabase (PostgreSQL, Auth, Realtime, Storage).
*   **Desktop:** Electron 32 (empaquetado portable .exe).
*   **Librerías clave:** jsPDF (reportes/escritos), XLSX (lectura de planillas), EmailJS (Notificaciones por correo).
*   **Estilos:** Inline CSS-in-JS + index.css (temas claro/oscuro).

## 📂 Arquitectura de Directorios y Componentes
*   `src/components/CasoUnificado.jsx`: Contenedor principal refactorizado y optimizado que gestiona el estado del expediente y delega la interfaz en subcomponentes modulares.
*   `src/components/caso/`: Directorio de subcomponentes específicos del expediente:
    *   `CasoProximaAccion.jsx`: Módulo de input/textarea para la gestión interna de notas de seguimiento.
    *   `ModalGenerarEscrito.jsx`: Modal aislado para la parametrización y generación del PDF de escritos legales.
    *   `CasoDocumentos.jsx`: Visualización de archivos locales y adjuntos.
    *   `CasoFooter.jsx`: Botoneras de acciones rápidas, exportación y guardado.
*   `src/components/TabDashboard.jsx`: Dashboard general con métricas agrupadas, embudo, próximos pagos, cobros pendientes y el panel operativo central "Mis Pendientes de Gestión".
*   `src/components/portal/NuevoCasoModal.jsx`: Formulario de derivación de casos desde el portal PAS con subida a Supabase Storage y aviso vía EmailJS.

## 🗄️ Esquema de Base de Datos (Supabase)
*   **pas_casos:** Expedientes con ~40 campos (montos, fechas, honorarios). Incluye `proxima_accion` (texto interno) y `updated_at` (actualización automatizada).
*   **acciones:** Timeline de bitácora vinculada a cada caso vía `caso_id`. Posee un **Trigger (`trigger_actualizar_fecha_caso`)** que actualiza el campo `updated_at` de `pas_casos` de manera automática en cada INSERT/UPDATE.
*   pas_contactos / pas_historial / pas_recordatorios: Gestión de prospección y llamadas.
*   pas_derivadores / pas_descartados / pas_manuales / pas_lista: Gestión de productores y exclusiones de Excel.
*   pas_portal_users: Mapeo entre Auth User y pas_id.
*   **Storage (Buckets):** `adjuntos` (Público, recibe archivos subidos por los PAS).

## 🔄 Flujo de Trabajo Principal
*   **Captación:** Carga masiva por Excel en TabContactos (filtrando descartados automáticamente).
*   **Derivación PAS:** El PAS deriva un caso desde `/portal` (botón Nuevo Caso). La app sube los archivos a Supabase Storage y notifica por mail vía EmailJS.
*   **Gestión:** El expediente avanza por sus estados. Monitoreo y operación centralizada de pendientes privados directamente desde `TabDashboard`.
*   **Portal PAS:** El productor ingresa a `/portal`, ve sus métricas, sus casos en curso, y un panel analítico.

## ✅ LOGROS RECIENTES (Última Sesión)
*   **Base de Datos Automatizada:** Trigger en PostgreSQL que sincroniza automáticamente la fecha `updated_at` del caso al registrarse movimientos en la bitácora.
*   **Gestor de Tareas Integrado:** Incorporación y visualización del campo `proxima_accion` en `TabDashboard` bajo la grilla "📝 Mis Pendientes de Gestión".
*   **Refactorización Completa de `CasoUnificado.jsx`:** Extracción de lógicas y vistas complejas a componentes dedicados (`ModalGenerarEscrito`, `CasoDocumentos`, `CasoFooter`, `CasoProximaAccion`), reduciendo drásticamente el tamaño del archivo principal y mejorando la mantenibilidad.
*   **Limpieza de Dashboard:** Eliminación definitiva de la vista de "Casos Inactivos (+15 días)" para simplificar la interfaz operativa.

## 🚀 ROADMAP PRIORIZADO (Próximos Pasos)
1.  **Rediseño Visual (UI/UX):** Actualizar `utils/theme.js` para migrar hacia una paleta de colores más moderna, tipografías balanceadas y contrastes suaves (estilo Slate/Zinc).
2.  **Módulo IA (Resúmenes Automáticos):** Integrar API de IA (Gemini/OpenAI) para generar resúmenes profesionales del estado del expediente a pedido.
3.  **Auditoría y Refactorización de Archivos Extensos (>250 líneas):** Planificar la modularización progresiva de módulos pesados identificados:
    *   `TabClientes.jsx` (440 líneas)
    *   `App.jsx` (476 líneas)
    *   `TabDashboard.jsx` (425 líneas)
    *   `CarpetaLocal.jsx` (365 líneas)
    *   `CasoDetalleComponents.jsx` (283 líneas)
    *   `Storage.js` (210 líneas)
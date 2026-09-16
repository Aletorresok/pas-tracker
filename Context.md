# PAS-Tracker — Documento de Contexto General

## 🛠️ Stack Tecnológico
*   **Frontend:** React 18.3, React Router 6, Vite 5.4.
*   **Backend & DB:** Supabase (PostgreSQL, Auth, Realtime, Storage).
*   **Desktop:** Electron 32 (empaquetado portable .exe).
*   **Librerías clave:** jsPDF (reportes/escritos), XLSX (lectura de planillas), EmailJS (Notificaciones por correo).
*   **Estilos:** Inline CSS-in-JS + index.css (temas claro/oscuro).

## 📂 Arquitectura de Directorios y Componentes
*(Mantener el árbol de carpetas anterior, destacando:)*
*   `src/components/portal/NuevoCasoModal.jsx`: Formulario de derivación de casos desde el portal PAS con subida a Supabase Storage y aviso vía EmailJS.
*   `src/components/TabDashboard.jsx`: Dashboard con métricas agrupadas, embudo, próximos pagos y detección de casos inactivos (+15 días).

## 🗄️ Esquema de Base de Datos (Supabase)
*   pas_contactos: Base importada de Excel.
*   pas_historial: Registro de llamadas y prospectado.
*   pas_casos: Expedientes con ~40 campos (montos, fechas, honorarios).
*   pas_derivadores: Flag de productores activos.
*   pas_recordatorios: Fechas agendadas para volver a llamar.
*   pas_descartados: Productores archivados (A excluir en la carga de Excel).
*   pas_manuales: PAS ingresados a mano.
*   pas_portal_users: Mapeo entre Auth User y pas_id.
*   pas_lista: Info para perfil de portal.
*   acciones: Timeline de bitácora vinculada a cada caso.
*   **Storage (Buckets):** `adjuntos` (Público, recibe archivos subidos por los PAS).

## 🔄 Flujo de Trabajo Principal
*   **Captación:** Carga masiva por Excel en TabContactos (filtrando descartados automáticamente).
*   **Derivación PAS:** El PAS deriva un caso desde `/portal` (botón Nuevo Caso). La app sube los archivos a Supabase Storage y notifica por mail a Atglexsolutions@gmail.com vía EmailJS.
*   **Gestión:** El expediente avanza por sus estados. Monitoreo de inactividad de expedientes desde TabDashboard.
*   **Documentación Local:** Gestión de PDFs de la carpeta local con File System Access API.
*   **Portal PAS:** El productor ingresa a `/portal`, ve sus métricas, sus casos en curso, y un panel analítico.

## ✅ LOGROS RECIENTES (Última Sesión)
*   Se optimizó el Dashboard de Admin con grilla compacta, alerta de Casos Inactivos (+15 días sin movimientos) y sumatoria de cobros próximos.
*   Se reordenó el Portal de PAS (casos arriba, analítica abajo).
*   Se excluyó a los "Descartados" del mapeo de datos de Excel (`usePASData.js`).
*   Se implementó formulario de derivación con subida de documentos a la nube y alertas al mail.

## 🚀 ROADMAP PRIORIZADO (Próximos Pasos)
1.  **Desguazar `CasoUnificado.jsx`:** Limpiar el código y dividirlo en subcomponentes más pequeños para facilitar el mantenimiento.
2.  **Módulo IA (Resúmenes Automáticos):** Integrar API de IA (Gemini/OpenAI) para generar resúmenes profesionales del estado del expediente a pedido del PAS o cliente.
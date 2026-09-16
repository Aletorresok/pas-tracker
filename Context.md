# PAS-Tracker — Documento de Contexto General

## 🛠️ Stack Tecnológico
*   **Frontend:** React 18.3, React Router 6, Vite 5.4.
*   **Backend & DB:** Supabase (PostgreSQL, Auth, Realtime, *Storage - Próximamente*).
*   **Desktop:** Electron 32 (empaquetado portable .exe).
*   **Librerías clave:** jsPDF (reportes/escritos), XLSX (lectura de planillas), *EmailJS (Notificaciones - Próximamente)*.
*   **Estilos:** Inline CSS-in-JS + index.css (temas claro/oscuro).

## 📂 Arquitectura de Directorios y Componentes
*(Mantener el árbol de carpetas que ya tenías)*

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

## 🔄 Flujo de Trabajo Principal
*   **Captación:** Carga masiva por Excel en TabContactos (filtrando descartados).
*   **Derivación:** El PAS derivador genera un caso (TabClientes).
*   **Gestión:** El expediente pasa por sus 9 estados.
*   **Documentación Local:** Carga/categorización de archivos remotos o carpetas del disco real vía CarpetaLocal.
*   **Portal PAS:** El productor ingresa a `/portal`, ve sus casos arriba de todo, y las métricas secundarias debajo.

## 🚀 ROADMAP PRIORIZADO (Nuevos Objetivos)
1.  **Victorias Rápidas (UI y Filtros):** 
    *   Invertir el orden en `/portal` (Casos arriba, Gráficos de aseguradoras abajo).
    *   Filtrar `pas_descartados` en `usePASData.js` para que no vuelvan a cargar al leer el Excel.
2.  **Desguace de `CasoUnificado.jsx`:** Limpiar el código y dividirlo en subcomponentes para que sea más fácil de mantener.
3.  **Módulo IA (Resúmenes de Casos):** Integrar API de IA (Gemini/OpenAI) para generar resúmenes de expedientes a pedido del PAS o para enviar al cliente.
4.  **Módulo Subida PAS:** Permitir a los PAS subir documentación al portal (Supabase Storage) con alerta automática por correo a Atglexsolutions@gmail.com (vía EmailJS).
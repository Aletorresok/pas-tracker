# PAS-Tracker — Documento de Contexto General

## 🛠️ Stack Tecnológico
*   **Frontend:** React 18.3, React Router 6, Vite 5.4[cite: 1].
*   **Backend & DB:** Supabase (PostgreSQL, Auth, Realtime, Storage)[cite: 1].
*   **Desktop:** Electron 32 (empaquetado portable .exe)[cite: 1].
*   **Librerías clave:** jsPDF (reportes/escritos), XLSX (lectura de planillas), EmailJS (Notificaciones por correo)[cite: 1].
*   **Estilos:** Inline CSS-in-JS + index.css (temas claro/oscuro)[cite: 1].

## 📂 Arquitectura de Directorios y Componentes
*(Mantener el árbol de carpetas anterior, destacando:)*
*   `src/components/portal/NuevoCasoModal.jsx`: Formulario de derivación de casos desde el portal PAS con subida a Supabase Storage y aviso vía EmailJS[cite: 1].
*   `src/components/TabDashboard.jsx`: Dashboard con métricas agrupadas, embudo, próximos pagos, detección precisa de casos inactivos (vía base de datos) y el nuevo panel privado "Mis Pendientes de Gestión"[cite: 1].
*   `src/components/CasoUnificado.jsx`: Componente principal de visualización/edición de expedientes individuales (Próximo a refactorizar)[cite: 1].

## 🗄️ Esquema de Base de Datos (Supabase)
*   **pas_casos:** Expedientes con ~40 campos (montos, fechas, honorarios). Ahora incluye `proxima_accion` (texto interno) y `updated_at` (actualización automatizada)[cite: 1].
*   **acciones:** Timeline de bitácora vinculada a cada caso vía `caso_id`. Posee un **Trigger (`trigger_actualizar_fecha_caso`)** que actualiza el campo `updated_at` de `pas_casos` de manera automática en cada INSERT/UPDATE[cite: 1].
*   pas_contactos / pas_historial / pas_recordatorios: Gestión de prospección y llamadas[cite: 1].
*   pas_derivadores / pas_descartados / pas_manuales / pas_lista: Gestión de productores y exclusiones de Excel[cite: 1].
*   pas_portal_users: Mapeo entre Auth User y pas_id[cite: 1].
*   **Storage (Buckets):** `adjuntos` (Público, recibe archivos subidos por los PAS)[cite: 1].

## 🔄 Flujo de Trabajo Principal
*   **Captación:** Carga masiva por Excel en TabContactos (filtrando descartados automáticamente)[cite: 1].
*   **Derivación PAS:** El PAS deriva un caso desde `/portal` (botón Nuevo Caso). La app sube los archivos a Supabase Storage y notifica por mail vía EmailJS[cite: 1].
*   **Gestión:** El expediente avanza por sus estados. Monitoreo de inactividad de expedientes y pendientes privados directamente desde TabDashboard[cite: 1].
*   **Portal PAS:** El productor ingresa a `/portal`, ve sus métricas, sus casos en curso, y un panel analítico[cite: 1].

## ✅ LOGROS RECIENTES (Última Sesión)
*   **Base de Datos Automatizada:** Se creó un Trigger en PostgreSQL que sincroniza automáticamente la fecha `updated_at` del caso cada vez que se agrega un movimiento en su bitácora.
*   **Gestor de Tareas Integrado:** Se agregó la columna `proxima_accion` a `pas_casos` para uso interno exclusivo del administrador.
*   **Mejoras en el Dashboard:** 
    *   Se corrigió el error de cálculo en los Casos Inactivos (+15 días) utilizando el nuevo `updated_at`.
    *   Se implementó la grilla "📝 Mis Pendientes de Gestión", que filtra y ordena automáticamente los casos que requieren atención.

## 🚀 ROADMAP PRIORIZADO (Próximos Pasos)
1.  **Desguazar `CasoUnificado.jsx`:** Limpiar el código y dividirlo en subcomponentes más pequeños para facilitar el mantenimiento. (Acá se deberá incluir el input/textarea para editar `proxima_accion` en la interfaz)[cite: 1].
2.  **Módulo IA (Resúmenes Automáticos):** Integrar API de IA (Gemini/OpenAI) para generar resúmenes profesionales del estado del expediente a pedido del PAS o cliente[cite: 1].
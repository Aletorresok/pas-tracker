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
*   **pas_casos:** Expedientes con ~40 campos (montos, fechas, honorarios). Incluye `proxima_accion` (texto interno) y `updated_at` (actualización automatizada — ⚠️ la columna NO aparece en el esquema real exportado el 2026-09-22, verificar).
    *   Columnas canónicas: **`patente`** (reemplaza a `dominio`) y **`compania_aseguradora`** (reemplaza a `compania`). Las viejas siguen existiendo en la DB con un trigger puente (`trg_pas_casos_sync_columnas_viejas`) hasta que se borren.
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

## 📝 Registro de Cambios

### 2026-09-22 — Rama `claude/kind-carson-68fvrx`
*   **Variables de entorno:** `src/supabase.js` y `src/utils/portalStorageUtils.js` leen credenciales de `import.meta.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY`). Plantilla en `.env.example`. Hay que cargarlas en `.env` local **y** en Vercel antes de deployar.
*   **Unificación de columnas:** todo el frontend lee/escribe solo `patente` y `compania_aseguradora`. Se eliminaron los parches `c.compania || c.compania_aseguradora` y la sincronización manual `patente`↔`dominio` (CasoUnificado, SeccionInfo, NuevoCasoModal, PortalCliente, PortalHome, GraficoCompanias, TabCasos, dashboard, PDFs, storage.js).
*   **SQL en `sql/`:** `2026-09-22_01_backup.sql` (copia todas las tablas al esquema `backup_20260922`) y `2026-09-22_02_unificar_columnas.sql` (copia `dominio`→`patente`, `compania`→`compania_aseguradora` + trigger puente). **Orden de deploy: backup → migración SQL → recién ahí publicar el código.**
    *   ✅ **Ejecutado en producción el 2026-09-22:** backup verificado (pas_casos 95, acciones 664, pas_contactos 51048, pas_historial 828, pas_manuales 2), diagnóstico sin conflictos, migración con 0 filas pendientes y trigger puente activo. Las tablas del esquema `backup_20260922` tienen RLS activado.
    *   ✅ **Variables de entorno cargadas en Vercel** (proyecto `pas-tracker2.0`, conectado a `Aletorresok/pas-tracker`) para Production y Preview.
    *   ✅ **Publicado en producción** vía PR #1 (https://github.com/Aletorresok/pas-tracker/pull/1). Uso real: la app se usa solo desde Chrome (Vercel, `pas-tracker20.vercel.app`); no se corre localmente, así que no hace falta `.env` en la PC.
*   **Limpieza del repo:** se sacaron `dist-electron/` y `dist-electron.zip` del control de versiones (quedan en `.gitignore`).

### 2026-09-23 — Etapa 8: Vista del cliente (✅ publicada, PR #8)
*   **`PortalCliente` reescrito** (`/?vista=cliente`): encabezado ATG Lex Solutions; el cliente entra con **patente + últimos 3 números del DNI**; ve "Hola, {nombre}", la compañía, una **línea de tiempo de 5 pasos** en palabras simples (con fecha de cada paso y una explicación de qué está pasando ahora según el estado), el **mensaje del estudio con su fecha** y firma, el ofrecimiento / lo que va a cobrar, y un botón de **WhatsApp** a +54 9 11 3313-3259 con el mensaje ya escrito (incluye la patente). Pensado para celular; modo oscuro según el sistema.
*   **Seguridad:** la vista ya no lee la tabla `pas_casos` directamente. Usa la función `consultar_caso_cliente(patente, dni)` (`sql/2026-09-23_04_acceso_cliente.sql`, *security definer*) que solo devuelve los campos que ve el cliente y solo si patente y DNI coinciden. Tras **5 intentos fallidos en 15 minutos** para una patente, se bloquea un rato (tabla `pas_cliente_intentos`). Los links viejos `?caso=<id>` ya no muestran el caso: piden patente y DNI.
*   Nueva columna `pas_casos.mensaje_cliente_fecha`, que un trigger completa solo cada vez que cambia el mensaje al cliente. Los mensajes anteriores quedan sin fecha.
*   **Ficha del caso:** campo **DNI del asegurado** en Datos (antes no se podía editar); en Resumen, botón **"Copiar link del cliente"** (`/?vista=cliente&patente=…`) y aviso si falta el DNI. El modal "Generar escrito" completa el DNI solo y, si el caso no lo tenía, lo guarda.
*   **SQL `2026-09-23_04` ejecutado** (23/09; hubo que cambiar `$$` por `$fn$` porque el editor de Supabase cortaba la función). Resultado: **43 casos en curso sin DNI**.
*   **Para cargarlos rápido:** en Casos, chip **"Sin DNI"** (casos en curso sin al menos 3 números de DNI) y campo **DNI del asegurado** en la fila desplegable, con guardado automático.
*   **Escrito con DNI con puntos:** el DNI se carga sin puntos (38554155) y en el escrito sale `38.554.155` (7 dígitos: `5.123.456`); si no tiene 7 u 8 números queda como se escribió (`generarEscrito.formatearDni`).
*   Nota: mientras RLS siga apagado en `pas_casos`, la tabla sigue siendo legible con la clave pública; la función deja lista la vista del cliente para cuando se active RLS (tarea del PIN seguro).

### 2026-09-23 — Etapa 7: Portal PAS para celular + ajustes (✅ publicada junto con la etapa 6, PR #7)
*   **`PortalHome` rediseñado** (celular primero): encabezado ATG Lex Solutions con íconos; columna izquierda con resumen (tu comisión cobrada, próximo cobro, en curso / cobrados / total, lo que cobraron tus asegurados) y "Próximos cobros" con scroll; a la derecha pestañas **En curso / Cobrados / Todos**, buscador (si hay más de 5 casos) y tarjetas. Se quitaron los 9 filtros de estado y la columna fija "Futuros pagos". En celular todo va en una columna y hay un botón fijo **"+ Derivar caso"**; el formulario de derivar ocupa toda la pantalla.
*   **`PortalCasoCard` rediseñado**: nombre, compañía, patente, fecha de derivación, estado, **barra de 5 pasos** con nombres (Documentación → Reclamo → Negociación → Pago → Cobrado), mensaje del estudio y último movimiento. "Ver detalle" muestra montos (ofrecimiento, cobró el asegurado, tu comisión), fechas, movimientos y **Adjuntar documentación** (fotos o PDF) con aviso en la página en lugar de `alert()`.
*   `ui/BarraAvance.jsx` pasa a 5 pasos simples (`PASOS_SIMPLES`); también la usa la vista del cliente.
*   **Hoy**: "Para hacer" y "Cobros pendientes" ahora tienen **scroll propio** (sin "Ver las N"), a pedido del usuario.
*   **Filtros del portal** (pedido del usuario: con solo En curso / Cobrados / Todos no se podían ver los desistidos): pestañas **En curso / Cobrados / Desistidos / Todos** y, debajo, chips por estado con su cantidad (solo los estados presentes en la pestaña, ej. "En juicio 1"), con scroll horizontal en celular. Se quitó el estado viejo `filtrosEstados` que ya no se usaba.

### 2026-09-23 — Etapa 6: Prospección (✅ publicada, PR #7)
*   **Nueva pestaña "Prospección"** (`TabProspeccion`) reemplaza a Contactos y Contactados. Filtros: **Sin contactar** (lista paginada de `TabContactos`, con sub-filtros Todos / Con teléfono / Varios teléfonos / Sin teléfono), **Contactados** (con contacto, no derivan ni descartados), **Derivadores** y **Descartados** (`prospeccion/ListaContactados.jsx`, orden por contacto más reciente / hace más tiempo / nombre, "Mostrar más" de a 40).
*   **Decisión del usuario:** los tipos de respuesta (positivo, negativo, neutro, etc.) **quedaron viejos y no se usan más**. Registrar contacto (`ContactModal`) = fecha + cómo quedó: *Sigue en seguimiento*, *Deriva casos* o *Descartado*; `App.handleSaveContacto` guarda el contacto y actualiza `pas_derivadores` / `pas_descartados` según la elección. Los resultados viejos siguen en `pas_historial` pero no se muestran.
*   **`PASCard`** como fila compacta: nombre + etiqueta derivador/descartado, teléfono, "contactado hace N d · N veces"; WhatsApp gris que se pone verde al pasar el mouse. Al tocar: interruptores "Deriva casos" / "Descartado", mail, teléfonos (llamar o WhatsApp), fechas de contacto y "Registrar contacto". Sin marcas de recordatorios.
*   `usePASData` ahora también carga los contactos descartados (para la pestaña Descartados).
*   Menú: "Contactos" y "Contactados" pasan a "Prospección" (también en la barra del celular). Se eliminó `TabContactados.jsx`.

### 2026-09-23 — Etapa 5: Ficha del caso con pestañas (✅ publicada, PR #6)
*   **`CasoUnificado` reorganizado**: encabezado fijo con nombre, patente, compañía, PAS y fecha de derivación; indicador de guardado ("✓ Guardado / Sin guardar… / Guardando… / No se guardó · reintentar"); botones PDF y **Generar escrito** (principal); cerrar arriba a la derecha. Al cerrar con cambios pendientes, guarda antes.
*   **Línea de etapas** (`caso/EtapasCaso.jsx`): clic en una etapa cambia el estado; "Desistir"/"reactivar" aparte; "Deshacer" 6 s al pasar a Cobrado o Desistido.
*   **Pestañas**: Resumen (`caso/ResumenCaso.jsx`: próxima acción con plazo, mensaje al cliente, números del caso, últimos 3 movimientos con agregado rápido), Datos (`SeccionInfo` sin estado ni mensaje + `SeccionFechas`), Montos y honorarios (`SeccionMontos` con `CampoMonto` + `SeccionHonorarios`), Documentos (ahora con `ChecklistDocumental`, que existía pero no se mostraba), Bitácora (agregado rápido "movimiento de hoy + Enter"; "Con otra fecha…" abre el formulario). Todas las pestañas quedan montadas y ocultas para no perder la carpeta local vinculada.
*   Ya no aparece el aviso "✓ Caso guardado" en cada autoguardado (queda el indicador del encabezado). Se eliminó `CasoFooter.jsx`.
*   **Fix de guardado**: la ficha abierta desde Hoy o Casos (`CasoOverlay`) ya no vuelve a guardar **todos** los casos con `saveStorage` en cada autoguardado (podía pisar cambios hechos desde el portal); ahora solo actualiza la memoria con `handleCasoLocal` (que también hace el autobackup local). `TabClientes` todavía usa el guardado masivo.

### 2026-09-22 — Etapa 4: Casos en tabla con ficha desplegable (✅ publicada, PR #5)
*   **`TabCasos` reescrito**: buscador (asegurado, patente, PAS, compañía, siniestro), chips de filtro de una sola selección (Activos por defecto, Todos, y cada estado con su cantidad), tabla con columnas ordenables (Asegurado + patente, Estado, PAS, Compañía, Últ. mov., Monto). "Últ. mov." en ámbar si un caso activo lleva más de 30 días quieto. Monto mostrado = acordado → ofrecido → reclamado.
*   **Fila desplegable** (`casos/FilaExpandida.jsx`): clic en la fila la abre ahí mismo con estado (chips), próxima acción + plazo, mensaje al cliente y 4 montos (reclamado, ofrecido, mis honorarios, comisión PAS). **Guardado automático** a los 1,2 s, solo de los campos que cambiaron (`supabase.update().eq("id")`, no el upsert masivo), con indicador "Guardado / Guardando… / No se pudo guardar · reintentar". Al pasar a Cobrado o Desistido aparece "Deshacer" 6 s. La fila abierta no desaparece aunque su nuevo estado no entre en el filtro. "Abrir ficha completa" abre `CasoOverlay`; "Eliminar" pide confirmación.
*   `App.handleCasoLocal(pasId, caso)`: actualiza un caso solo en memoria (para ediciones ya guardadas en Supabase).
*   **Celular** (`hooks/useEsCelular.js`, corte 900 px): la tabla pasa a filas de dos líneas (nombre + monto, estado + compañía + último movimiento); la fila desplegada se apila en una columna.
*   `ui/CampoMonto.jsx`: campo de pesos con separador de miles; al enfocarlo selecciona todo para reemplazar el monto.
*   Pendiente para más adelante: usar la misma tabla dentro de cada PAS en "Clientes" (hoy sigue con tarjetas).

### 2026-09-22 — Etapa 3: Dashboard "Hoy" + pestaña Análisis (✅ publicada, PR #4)
*   **`src/utils/metricas.js`** (funciones puras): `aplanarCasos` (agrega `_pasId`/`_pasNombre`), `kpis`, `honorariosPorMes`, `cobrosPendientes`, `tareasPendientes`, `casosPorTramo` + `TRAMOS`.
*   **Dashboard "Hoy"** (`TabDashboard`): fila de 4 KPIs (honorarios del año con variación vs año anterior, por cobrar, en gestión, este mes vs mes anterior); **"Para hacer"** (`dashboard/ParaHacer.jsx`) = una sola lista ordenada por vencimiento que junta próximas acciones (con su plazo), cobros esperando pago (fecha estimada = firma + plazo de pago, o fecha de pago), honorarios facturados hace >30 días sin cobrar y recordatorios de contactos de la próxima semana. Clic en una tarea abre la ficha del caso encima (`caso/CasoOverlay.jsx`); los recordatorios llevan a Contactados.
*   **Ajustes pedidos por el usuario tras probar la vista previa:** los recordatorios de contactos (`pas_recordatorios`) **ya no se usan** (datos viejos en la tabla; la función se había abandonado), así que no aparecen en "Para hacer". Los cobros pendientes salen de "Para hacer" y tienen su **tarjeta compacta** en Hoy (`dashboard/CobrosResumen.jsx`, 6 filas, plazo + neto), además del detalle completo en Análisis (duplicado a propósito).
*   **Casos por etapa**: 5 tramos (Arranque, Reclamado, Negociación, Esperando pago, Cobrado) en tonos del color de acento de suave a pleno; desistidos aparte. Decisión: los 9 colores de estado no pasan el validador de color para daltonismo en un gráfico apilado, así que el tablero usa una escala ordinal de un solo tono + leyenda con números.
*   **Honorarios por mes** (`GraficoBarraMensual`): SVG al ancho real del contenedor (texto legible), eje con valores redondos, mes actual en acento, hover/clic muestra el monto; clic en un mes lista los casos cobrados ese mes.
*   **Nueva pestaña "Análisis"** (`TabAnalisis`): totales históricos, casos por estado, cobros pendientes en detalle, ranking de PAS y plazos por compañía. "Dashboard" pasa a llamarse "Hoy" en el menú.
*   **Plazos por compañía**: ya no es un gráfico de barras que mezclaba días y % en la misma escala; ahora son 3 números. Sin datos muestra un mensaje en lugar de cajas vacías.

### 2026-09-22 — Etapa 2: carga rápida + plazo en "Próxima acción" (✅ publicada, PR #3)
*   **Carga inicial liviana (`usePASData`)**: ya no descarga los ~51 mil `pas_contactos`. Trae el total (`count` head), las tablas chicas y **solo los contactos que se usan siempre** (con historial, casos, recordatorio o derivadores), pedidos por id en tandas de 150. Expone `totalContactos` y `agregarPas(p)`.
*   `traerTodo()` pagina de a 1000 (límite de Supabase por pedido): se usa para `pas_historial` y `pas_casos`, que antes se cortaban en silencio al pasar las 1000 filas (historial ya tenía 828).
*   **Pestaña Contactos**: consulta paginada a Supabase (40 por tanda, botón "Mostrar más"), búsqueda en el servidor por nombre/mail/teléfono con espera de 350 ms, orden por columna, conteos por vista = total en la base − contactados/descartados. Al contactar o marcar derivador, el contacto se suma a `pas` con `agregarPas`.
*   Fix: en Contactados, los filtros "Positivos" y "Negativos" buscaban `positivo`/`negativo` pero los resultados se guardan como `respondio_positivo`/`respondio_negativo` → nunca mostraban nada.
*   **Plazo de la próxima acción (pedido del usuario)**: nueva columna `pas_casos.proxima_accion_vence` (date) — SQL en `sql/2026-09-22_03_plazo_proxima_accion.sql`, ✅ **ejecutado en producción el 2026-09-22**. En la ficha: chips Hoy / 1 / 3 / 7 / 15 / 30 días o un número libre; muestra "Vence en N d" / "Vencido hace N d". El Dashboard ("Mis pendientes · por vencimiento") ordena del más vencido al más lejano; sin plazo al final. Si la columna todavía no existe, el guardado la omite para no romper. Helpers en `formatters.js`: `fechaLocalISO`, `fechaEnDias`, `diasHasta`, `describirPlazo` (fecha local, no UTC). Componente `ui/PlazoChip.jsx`.

### 2026-09-22 — Etapa 1 del rediseño: base visual, temas y bugs (✅ publicada, PR #2)
*   **Tokens de color en CSS:** `src/index.css` define `--bg, --card, --card2, --border, --border2, --text, --sub, --muted, --accent, --accent-ink, --on-accent, --ok, --warn, --bad, --info, --shadow`. `[data-theme="dark"]` y `[data-accent="marino|borgona|grafito"]` sobre `<html>` los redefinen. **Regla: no escribir colores hex en componentes**; usar `T.*` (de `THEME()`), `COLORES.*` o `var(--x)`. Para transparencias usar `alpha(color, pct)` de `utils/theme.js` (genera `color-mix`).
*   `utils/theme.js`: `THEME()` devuelve `var(--x)` (el parámetro dark quedó por compatibilidad); `COLORES` semánticos; `ACENTOS` (Dorado, Marino, Borgoña, Grafito); `alpha()`; `FONT` (escala).
*   `ThemeContext`: modo oscuro sigue al sistema si no hay elección guardada (`pas_tracker_dark_mode`); acento en `pas_tracker_acento`; expone `acento`, `setAcento`, `ACENTOS`. `index.html` aplica tema antes de pintar (sin parpadeo), carga IBM Plex Sans/Mono, `lang="es"`.
*   **Estados unificados:** `ESTADOS_CASO` y `estadoInfo` viven solo en `constants.js` (con campo `etapa` 0–7); `portalTheme.js` los re-exporta. Colores de estado en orden de avance, tonos medios válidos en claro y oscuro. Sin emojis.
*   **Componentes base nuevos** en `src/components/ui/`: `Icono.jsx` (íconos de línea SVG), `Boton.jsx` (primario/secundario/fantasma/peligro), `EstadoPill.jsx`, `BarraAvance.jsx` (portales; desistido no muestra avance).
*   **Navegación:** `SidebarNav` con íconos, menú "Apariencia y backup" (modo, color, backup). En ≤900 px pasa a **barra inferior** (Dashboard, Casos, Contactos, Clientes, Más). Layout con clases `.app-main`/`.app-content`; grillas inline de 3–4 columnas se reacomodan en celular vía CSS.
*   **Emojis eliminados** de la interfaz (títulos, botones, toasts); tamaños de letra mínimos 11 px.
*   **Bugs arreglados:** filtro seleccionado de Contactos en gris; colores de modo oscuro en modo claro; contenido visible sobre el encabezado fijo del caso; "Mis pendientes" ahora ordena por `fecha_ultimo_movimiento` (más antiguo primero); barra de avance de casos desistidos en portal PAS y vista cliente.
*   **Ficha del caso:** botonera sin colores arcoíris (una acción principal "Generar escrito"); en celular el modal ocupa toda la pantalla.
*   **Portal PAS:** encabezado con marca ATG Lex Solutions, botones con íconos, layout apilado en celular, columna "Futuros pagos" oculta si está vacía.

### 2026-09-22 — Propuesta de rediseño visual (APROBADA en líneas generales)
*   Documento (v2): https://claude.ai/artifact/3TGX6ipnw65AmWVFejXh3r (diagnóstico con capturas, maquetas de app, portal PAS y vista cliente, plan).
*   **Diagnóstico principal:** 73 colores hex de 3 paletas (theme.js dorado/marfil, índigo `#6366f1` + pizarra `#1e293b` heredados, `portalTheme.js` con otros colores de estado); 20 tamaños de fuente (algunos de 8–9 px); Inter declarada pero nunca cargada; emojis como íconos; Dashboard de 11 bloques apilados; casos en tarjetas; ficha del caso con 7 secciones apiladas; sin versión celular; 51.048 contactos cargados en 52 pedidos secuenciales al abrir.
*   **Bugs visuales detectados:** filtro seleccionado de Contactos sale gris (`VISTAS_C` sin `color`); colores de modo oscuro en modo claro (PASCard, FiltrosEstados, TabContactos); contenido que asoma sobre el encabezado fijo del modal del caso; "Mis pendientes" ordena por `updated_at` (columna inexistente); en el portal PAS un caso Desistido muestra la barra de avance completa (incluye el verde de Cobrado).
*   **Portal PAS:** layout de escritorio con dos columnas fijas (filtros + futuros pagos); inutilizable en celular; identidad violeta distinta a la app; "Plazos por compañía" usa datos de todos los PAS; `alert()` al subir documentación.
*   **Vista cliente (`?vista=cliente`):** 🔴 privacidad — con solo la patente se ve nombre del asegurado, compañía y montos. Sin marca del estudio ni contacto; etapas en lenguaje interno.
*   **Decisiones del usuario:**
    *   Un solo estilo visual basado en theme.js (se abandona el fondo azul pizarra). ✅
    *   Dashboard "Hoy" orientado a tareas por urgencia. ✅
    *   Casos en **tabla con fila desplegable** (edición rápida inline) + "Abrir ficha completa" con pestañas. ✅
    *   Campos editables en el lugar, sin modo edición, con autoguardado e indicador "Guardado"; "Deshacer" al cambiar a Cobrado/Desistido. (propuesto)
    *   Contactos + Contactados unificados en "Prospección". ✅
    *   **Temas de color:** dorado principal + Marino, Borgoña y Grafito (cada uno claro/oscuro), elegibles por el usuario. (propuesto a pedido)
    *   **App 100% funcional en celular** (barra de navegación inferior). ✅
    *   Rediseñar también el portal PAS y la vista del cliente. ✅
*   **Plan (8 etapas, un PR cada una, celular incluido en todas):** 1) base visual + temas + bugs, 2) carga rápida de contactos, 3) Dashboard "Hoy", 4) Casos en tabla con fila desplegable, 5) ficha del caso completa, 6) Prospección, 7) Portal PAS, 8) Vista del cliente (acceso con patente + DNI o link único).
*   **Respuestas del usuario (2026-09-22):**
    *   Marca en portal y vista cliente: **ATG Lex Solutions** (logo pendiente, por ahora iniciales "ATG").
    *   Contacto de clientes: WhatsApp **+54 9 11 3313-3259** — Dr. Alexis Torres Gaveglio.
    *   Acceso del cliente: **patente + últimos 3 dígitos del DNI** (`dni_asegurado`). Para que sea seguro de verdad hace falta una función en Supabase (RPC `security definer`) + RLS; se hace junto con la tarea de RLS.
    *   "Plazos por compañía" **se mantiene en el portal PAS** (sirve cuando el PAS no tuvo casos con esa compañía), pero sin mostrar cantidad de casos ni datos personales: solo promedios.
    *   Modo oscuro: sin preferencia → **por defecto sigue el tema del sistema**; el botón manual se mantiene y su elección queda guardada.

## ✅ LOGROS RECIENTES (Sesión anterior)
*   **Base de Datos Automatizada:** Trigger en PostgreSQL que sincroniza automáticamente la fecha `updated_at` del caso al registrarse movimientos en la bitácora.
*   **Gestor de Tareas Integrado:** Incorporación y visualización del campo `proxima_accion` en `TabDashboard` bajo la grilla "📝 Mis Pendientes de Gestión".
*   **Refactorización Completa de `CasoUnificado.jsx`:** Extracción de lógicas y vistas complejas a componentes dedicados (`ModalGenerarEscrito`, `CasoDocumentos`, `CasoFooter`, `CasoProximaAccion`), reduciendo drásticamente el tamaño del archivo principal y mejorando la mantenibilidad.
*   **Limpieza de Dashboard:** Eliminación definitiva de la vista de "Casos Inactivos (+15 días)" para simplificar la interfaz operativa.

    Mapeo

    📦 src[cite: 11]
 ├── 📄 App.jsx                 # Enrutador principal y layout base[cite: 17]
 ├── 📄 CasoUnificado.jsx       # Contenedor orquestador del expediente[cite: 17]
 ├── 📄 constants.js            # Variables y configuraciones globales estáticas[cite: 17]
 │
 ├── 📂 context[cite: 11]
 │    └── 📄 ThemeContext.jsx   # Proveedor de estado para tema claro/oscuro[cite: 17]
 │
 ├── 📂 hooks[cite: 11]
 │    ├── 📄 usePASData.js      # Fetching y mutación de datos (Supabase)[cite: 17]
 │    └── 📄 useRealtimeSync.js # Suscripciones en tiempo real para updates[cite: 17]
 │
 ├── 📂 utils[cite: 11]
 │    ├── 📄 carpeta.js         # Lógica de gestión de carpetas[cite: 17]
 │    ├── 📄 categorizarArchivo.js # Clasificación de adjuntos[cite: 17]
 │    ├── 📄 exportarCasoPDF.js # Generador de reportes[cite: 17]
 │    ├── 📄 formatters.js      # Formateo de fechas, monedas, etc.[cite: 17]
 │    ├── 📄 generarEscrito.js  # Lógica de redacción de escritos legales[cite: 17]
 │    ├── 📄 storage.js         # Conexión con Buckets de Supabase[cite: 17]
 │    └── 📄 theme.js           # Configuraciones de estilos y paletas[cite: 17]
 |    |__  portalStorageUtils.js #Centraliza la logica compartida de subida de archivos multiples a Supabase Storage y notifiaciones por EmailJS para el portal de PAS
 │
 └── 📂 components[cite: 11]
      │
      ├── 📁 Vistas Generales (Tabs)[cite: 15]
      │    ├── 📄 TabCasos.jsx          # Grilla de expedientes[cite: 15, 17]
      │    ├── 📄 TabClientes.jsx       # Gestión de directorio de clientes[cite: 15, 17]
      │    ├── 📄 TabContactados.jsx    # Prospección: contactados[cite: 15, 17]
      │    ├── 📄 TabContactos.jsx      # Prospección: directorio general[cite: 15, 17]
      │    ├── 📄 TabDashboard.jsx      # Métricas centrales y pendientes[cite: 15, 17]
      │    └── 📄 TabPortalUsuarios.jsx # Gestión de usuarios del portal[cite: 15, 17]
      │
      ├── 📁 Layout y Core[cite: 15]
      │    ├── 📄 AppHeader.jsx         # Cabecera principal[cite: 15, 17]
      │    ├── 📄 CarpetaLocal.jsx      # Gestión de archivos locales[cite: 15, 17]
      │    ├── 📄 casoDetalleComponents.jsx # Componentes secundarios del detalle[cite: 15, 17]
      │    ├── 📄 ContactModal.jsx      # Modal global de contactos[cite: 15, 17]
      │    ├── 📄 GraficoCompanias.jsx  # Chart global[cite: 15, 17]
      │    ├── 📄 LoginGate.jsx         # Protección de rutas / Login interno[cite: 15, 17]
      │    ├── 📄 PASCard.jsx           # Tarjeta de productor[cite: 15, 17]
      │    └── 📄 SidebarNav.jsx        # Navegación lateral[cite: 15, 17]
      │
      ├── 📂 caso                       # Módulos del Expediente[cite: 15]
      │    ├── 📄 ArchivoRow.jsx        # Fila de archivo[cite: 16]
      │    ├── 📄 CasoDocumentos.jsx    # Visor de adjuntos[cite: 16]
      │    ├── 📄 CasoFooter.jsx        # Acciones inferiores[cite: 16]
      │    ├── 📄 CasoProximaAccion.jsx # Input de notas internas[cite: 16]
      │    ├── 📄 ChecklistDocumental.jsx # Control de documentación[cite: 16]
      │    ├── 📄 CompaniaSelector.jsx  # Selector de aseguradora[cite: 16]
      │    ├── 📄 EscritoConfigModal.jsx# Opciones del escrito[cite: 16]
      │    ├── 📄 EstadoSelector.jsx    # Selector de estado del caso[cite: 16]
      │    ├── 📄 FiltrosEstados.jsx    # Filtrado de estados[cite: 16]
      │    ├── 📄 ModalGenerarEscrito.jsx # Parametrización de PDF[cite: 16]
      │    ├── 📄 PreviewModal.jsx      # Vista previa[cite: 16]
      │    ├── 📄 SeccionFechas.jsx     # Fragmento: fechas del caso[cite: 16]
      │    ├── 📄 SeccionHonorarios.jsx # Fragmento: honorarios[cite: 16]
      │    ├── 📄 SeccionInfo.jsx       # Fragmento: información básica[cite: 16]
      │    ├── 📄 SeccionMontos.jsx     # Fragmento: reclamo económico[cite: 16]
      │    ├── 📄 SeccionTimeline.jsx   # Fragmento: bitácora[cite: 16]
      │    └── 📄 Toast.jsx             # Notificaciones de UI[cite: 16]
      │
      ├── 📂 carpeta                    # Archivos locales[cite: 15]
      │    └── 📄 ArchivoLocalRow.jsx   # Componente de fila de archivo[cite: 16]
      │
      ├── 📂 clientes                   # Módulo de clientes[cite: 15]
      │    ├── 📄 ClienteCards.jsx      # Tarjetas de cliente[cite: 16]
      │    └── 📄 ModalesCliente.jsx    # Interacciones del cliente[cite: 16]
      │
      ├── 📂 dashboard                  # Componentes de Métricas[cite: 15]
      │    ├── 📄 CobrosPendientesCard.jsx # Control financiero[cite: 16]
      │    ├── 📄 GraficoBarraMensual.jsx  # Gráfico mensual[cite: 16]
      │    ├── 📄 MisPendientesCard.jsx # Panel operativo[cite: 16]
      │    ├── 📄 RankingPASCard.jsx    # Ranking de productores[cite: 16]
      │    └── 📄 StatCard.jsx          # Tarjeta estadística genérica[cite: 16]
      C:\Users\alexi\Desktop\mi-jsx\Pas-Tracker\src\components\dashboard\DashboardBadge.jsx
      │
      └── 📂 portal                     # Entorno Productores Asesores[cite: 15]
           ├── 📄 CambiarPasswordModal.jsx # Gestión de contraseñas[cite: 16]
           ├── 📄 LoginScreen.jsx       # Login específico del portal PAS[cite: 16]
           ├── 📄 NuevoCasoModal.jsx    # Formulario de derivación[cite: 16]
           ├── 📄 PortalCasoCard.jsx    # Tarjeta de caso en el portal[cite: 16]
           ├── 📄 PortalCliente.jsx     # Vista de cliente para el PAS[cite: 17]
           ├── 📄 PortalHome.jsx        # Dashboard principal del PAS[cite: 17]
           └── 📄 portalTheme.js        # Tema visual aislado para el portal[cite: 17]

 ### 📄 `src/App.jsx`
*   **Responsabilidad:** Es el Layout principal, enrutador manual de pestañas (Tabs) y gestor del estado global de la sesión. También actúa como interceptor de vistas externas (si detecta `?vista=cliente`, ignora la app y renderiza `PortalCliente`).
*   **Estados y Props Clave:** 
    *   Delega la carga de datos de Supabase completamente al hook `usePASData` (obtiene `pas`, `casos`, `historial`, etc.).
    *   Maneja el estado de navegación de la UI mediante `mainTab` (dashboard, casos, contactos, clientes, portal).
    *   Controla el bloqueo de la app (`unlocked`) mediante `sessionStorage` y `LoginGate`.
*   **Flujos Críticos:**
    *   **Captación por Excel:** Contiene la lógica principal de carga de Excel masiva (`handleFile`), usando la librería `xlsx` para parsear y hacer un `upsert` a la tabla `pas_contactos` en Supabase.
    *   **Copias de Seguridad:** Gestiona la lógica de autoguardado local (`autoBackup`) y la descarga/restauración de backups en formato `.json`.
*   **Dependencias Fuertes:** `usePASData` (datos), `ThemeContext` (estilos), y `XLSX` (parseo).

### 📄 `src/CasoUnificado.jsx`
*   **Responsabilidad:** Es el contenedor modal y "orquestador" principal del detalle de un expediente[cite: 20]. No renderiza mucha UI por sí mismo, sino que delega la visualización a sus subcomponentes (las diferentes "Secciones" y botones), encargándose exclusivamente de centralizar el estado y la comunicación con la base de datos[cite: 20].
*   **Estados y Props Clave:**
    *   Recibe el `caso` seleccionado por props y lo clona en un estado local `formData` masivo (con ~30 campos de base de datos) para su edición[cite: 20].
    *   Maneja los arrays de dependencias relacionales: `archivos` (documentos del caso) y `acciones` (bitácora de movimientos)[cite: 20].
*   **Flujos Críticos:**
    *   **Auto-Guardado (Debounce):** Escucha cualquier cambio en `formData` y, tras 2.5 segundos de inactividad, dispara automáticamente el `upsert` a Supabase filtrando solo las columnas válidas definidas en `PAS_CASOS_COLS`[cite: 20].
    *   **Sincronización Realtime:** Utiliza los hooks `useRealtimeSync` y `useRealtimeAcciones` para mantener la vista actualizada si ocurren cambios remotos en el expediente o su bitácora[cite: 20].
    *   **Generación PDF:** Orquesta tanto el reporte del caso (`exportarCasoPDF`) como la apertura del modal para escritos legales (`ModalGenerarEscrito`) pasándoles el contexto de los datos[cite: 20].
*   **Dependencias Fuertes:** Hooks de realtime (`useRealtimeSync.js`), utilidades de almacenamiento (`carpeta.js`, `categorizarArchivo.js`) y todos los submódulos de la carpeta `src/components/caso/`[cite: 20].

Markdown
### 📄 `src/constants.js`
*   **Responsabilidad:** Actúa como la única fuente de verdad (Single Source of Truth) para los diccionarios, estados del negocio y configuraciones globales estáticas de la interfaz[cite: 21].
*   **Estados y Props Clave:**
    *   `ESTADOS_CASO`: Define el ciclo de vida legal completo de un expediente (desde `doc_pendiente` hasta `cobrado` o `desistido`), asignando colores y emojis estandarizados para la UI[cite: 21].
    *   `RESULTADOS_CONTACTO` y `VISTAS_C`: Opciones de seguimiento y filtros para el embudo de prospección y llamadas a productores[cite: 21].
    *   `TIPOS_DOC` y `EXTENSIONES_VALIDAS`: Parámetros de validación y categorización de archivos adjuntos[cite: 21].
    *   `ESTADOS_HONORARIOS`: Diccionario para el flujo de facturación (`NO_FACTURADO`, `FACTURADO`, `COBRADO`)[cite: 21].
*   **Flujos Críticos:** No contiene lógica de negocio ni funciones. Es importado globalmente por los selectores (`EstadoSelector`, `CompaniaSelector`), badges y tablas para mantener la consistencia de los datos fijos en toda la app sin hardcodear *strings*.
*   **Dependencias Fuertes:** Ninguna (es un archivo independiente sin importaciones).

### 📄 `src/index.css`
*   **Responsabilidad:** Archivo de estilos globales de la aplicación[cite: 22]. Define las variables CSS base, reseteo de márgenes, tipografía (Inter), y estilos globales para el scrollbar, inputs y botones[cite: 22].
*   **Estados y Props Clave:** No aplica.
*   **Flujos Críticos:** Provee animaciones utilitarias globales (`@keyframes fadeIn` y `slideUp`) que se pueden usar como clases (`.fade-in`, `.slide-up`) en cualquier componente para transiciones suaves[cite: 22].
*   **Dependencias Fuertes:** Ninguna.

### 📄 `src/main.jsx`
*   **Responsabilidad:** Es el punto de entrada principal (Entry Point) de React[cite: 23]. Monta la aplicación en el DOM e inyecta los proveedores globales (Contextos y Routers)[cite: 23].
*   **Estados y Props Clave:** No maneja estado propio, pero envuelve la app con `ThemeProvider` para el tema global y `BrowserRouter` para la navegación[cite: 23].
*   **Flujos Críticos:**
    *   **Enrutamiento Base:** Define las dos rutas maestras de la aplicación: `/portal/*` (que renderiza `<Portal />` para productores) y `/*` (que renderiza `<App />` para el entorno interno/admin)[cite: 23].
*   **Dependencias Fuertes:** `react-router-dom`, `ThemeContext.jsx`, `App.jsx` y `Portal.jsx`[cite: 23].

### 📄 `src/Portal.jsx`
*   **Responsabilidad:** Es el Layout/Contenedor principal y protector de rutas para el módulo de Productores Asesores (PAS)[cite: 24]. Actúa como una aplicación paralela a `App.jsx`.
*   **Estados y Props Clave:** 
    *   `session`: Gestiona el estado de autenticación (si es `undefined` muestra carga, si es `null` muestra login, si hay datos muestra el portal)[cite: 24].
    *   `dark`: Maneja un estado local booleano para el tema claro/oscuro del portal[cite: 24].
*   **Flujos Críticos:**
    *   **Autenticación:** Utiliza `supabase.auth.getSession()` al montar y se suscribe a los cambios con `onAuthStateChange` para mantener la sesión viva o patear al usuario al `<LoginScreen />`[cite: 24].
*   **Dependencias Fuertes:** `supabase.js`, `LoginScreen.jsx` y `PortalHome.jsx`[cite: 24].

### 📄 `src/supabase.js`
*   **Responsabilidad:** Inicializa y exporta la instancia del cliente de Supabase (`createClient`) para que pueda ser importada y utilizada en toda la aplicación (base de datos, auth, storage)[cite: 25].
*   **Dependencias Fuertes:** `@supabase/supabase-js`[cite: 25].

### 📁 `src/assets/react.svg`
*   **Responsabilidad:** Archivo de recurso estático (gráfico vectorial) que contiene el logotipo estándar de React[cite: 26].
*   **Estados y Props Clave:** No aplica (es un archivo de imagen, no contiene lógica)[cite: 26].
*   **Flujos Críticos:** No aplica.
*   **Dependencias Fuertes:** Ninguna.

Aquí tienes el análisis de los componentes de esta tanda. Puedes copiar y pegar este bloque directamente en tu Context.md bajo la sección de "Contrato de Componentes".

Markdown
### 📄 `src/components/AppHeader.jsx`
*   **Responsabilidad:** Barra de navegación superior (Navbar) de la interfaz administrativa interna[cite: 27]. Controla el cambio entre las distintas pestañas principales y provee accesos rápidos a utilidades globales[cite: 27].
*   **Estados y Props Clave:** 
    *   Recibe el enrutamiento visual (`mainTab`, `setMainTab`) y las métricas de contacto (`pasCount`)[cite: 27].
    *   Maneja de forma local un dropdown (`showBackupMenu`) para la gestión de copias de seguridad[cite: 27].
*   **Flujos Críticos:** Permite al usuario alternar entre el tema claro/oscuro de la UI, descargar un backup manual (`.json`) y restaurar los datos[cite: 27].
*   **Dependencias Fuertes:** Consume el `ThemeContext` para los estilos y colores dinámicos[cite: 27].

### 📄 `src/components/CarpetaLocal.jsx`
*   **Responsabilidad:** Integra la "File System Access API" nativa del navegador para leer, vincular y modificar archivos directamente en una carpeta local del disco duro del usuario sin subirlos a un servidor[cite: 28].
*   **Estados y Props Clave:**
    *   Mantiene en estado el puntero al directorio del sistema (`dirHandle`) y la lista de archivos (`archivos`)[cite: 28].
*   **Flujos Críticos:**
    *   Permite crear una carpeta nueva en el disco (`crearYVincular`), pedir permisos de lectura/escritura (`verificarPermisoCarpeta`) y renombrar archivos automáticamente mediante expresiones regulares (`handleCategorizar`)[cite: 28].
*   **Dependencias Fuertes:** Utiliza extensivamente el archivo de utilidades `src/utils/carpeta.js` para las operaciones del sistema de archivos[cite: 28].

### 📄 `src/components/casoDetalleComponents.jsx`
*   **Responsabilidad:** Es un archivo de tipo "Barrel" (índice de exportación)[cite: 29]. Se encarga de agrupar y re-exportar varios subcomponentes de la carpeta `/caso` (`Toast`, `PreviewModal`, `ArchivoRow`, `ChecklistDocumental`) para que puedan ser importados en una sola línea desde otros archivos[cite: 29].

### 📄 `src/components/ContactModal.jsx`
*   **Responsabilidad:** Un modal sencillo para confirmar el registro rápido de un contacto o llamada con un Productor Asesor (PAS)[cite: 30].
*   **Estados y Props Clave:** Recibe los datos del PAS seleccionado (`pas`) y la función de guardado (`onSave`)[cite: 30].
*   **Flujos Críticos:** Al confirmar, inyecta un nuevo movimiento en el historial con la fecha actual[cite: 30].

### 📄 `src/components/GraficoCompanias.jsx`
*   **Responsabilidad:** Renderiza un panel analítico interactivo que calcula y grafica los promedios de rendimiento de las compañías aseguradoras (días hasta el ofrecimiento, días hasta el cobro y porcentaje de cobro)[cite: 31].
*   **Estados y Props Clave:** Recibe el array total de expedientes (`allCasos`) y mantiene en estado la aseguradora seleccionada para ver en detalle (`selectedComp`)[cite: 31].
*   **Flujos Críticos:** Realiza un procesamiento intensivo de fechas iterando todo el array de casos (usando `useMemo`) para obtener promedios matemáticos dinámicos descartando valores atípicos[cite: 31].

### 📄 `src/components/LoginGate.jsx`
*   **Responsabilidad:** Es una barrera de seguridad visual que bloquea el acceso a la aplicación interna (App.jsx) hasta que el usuario introduzca una clave[cite: 32].
*   **Estados y Props Clave:** Maneja el input de la contraseña (`pin`) y el estado de validación (`error`)[cite: 32].

### 📄 `src/components/TabClientes.jsx`
*   **Responsabilidad:** Renderiza la vista del directorio de clientes activos (Productores Asesores que han sido marcados como derivadores y PAS creados manualmente) y orquesta la visualización de sus expedientes agrupados[cite: 33].
*   **Estados y Props Clave:** 
    *   Recibe los diccionarios de `pas`, `casos`, `derivadores` y la lista de `pasManuales`[cite: 33].
    *   Maneja filtros locales (`busqueda`, `filtroEstado`, `ordenCasos`) y el estado de apertura de múltiples modales (`modalPas`, `modalNuevoPAS`, `casoDetalle`)[cite: 33].
*   **Flujos Críticos:** 
    *   Combina a los PAS provenientes del Excel (marcados como derivadores) con los PAS manuales en una única lista deduplicada (`clientes`)[cite: 33].
    *   Exporta la base de datos de expedientes a un archivo de Excel (`exportarExcel`) cruzando los datos del PAS con los del caso[cite: 33].
*   **Dependencias Fuertes:** Utiliza `XLSX` para la exportación y delega la UI en subcomponentes como `ClienteCard`, `NuevoCasoModal` y el orquestador maestro `CasoDetalle` (CasoUnificado)[cite: 33].

### 📄 `src/components/PASCard.jsx`
*   **Responsabilidad:** Es la tarjeta individual (con interfaz desplegable/acordeón) que representa a un Productor Asesor en las listas de prospección y contactos[cite: 34].
*   **Estados y Props Clave:** Recibe la entidad `pas`, su `historial` de contactos, estados booleanos (si es derivador o descartado), recordatorios, y las funciones de acción (`onContactar`, `onToggleDerivador`)[cite: 34].
*   **Flujos Críticos:** 
    *   Calcula el color de estado y los badges (etiquetas) basándose en el último movimiento registrado en el historial y en las fechas de recordatorio (vencido, hoy, futuro)[cite: 34].
    *   Genera dinámicamente enlaces para abrir WhatsApp con un saludo predeterminado (`waLink`)[cite: 34].
*   **Dependencias Fuertes:** Importa las constantes globales `RESULTADOS_CONTACTO` y utilidades de formato (`fmtDate`, `waLink`)[cite: 34].

### 📄 `src/components/SidebarNav.jsx`
*   **Responsabilidad:** Barra de navegación lateral fija (Sidebar) para la interfaz administrativa[cite: 35]. Controla el enrutamiento visual principal de la app[cite: 35].
*   **Estados y Props Clave:** Recibe el estado del router manual (`mainTab`, `setMainTab`), el contador total de PAS (`pasCount`) y funciones para manejo de backups[cite: 35].
*   **Flujos Críticos:** Permite saltar entre las diferentes vistas (Dashboard, Casos, Contactos, etc.), alternar el modo oscuro, y desplegar un menú contextual para descargar/restaurar backups JSON[cite: 35].
*   **Dependencias Fuertes:** Consume `ThemeContext` para la aplicación de estilos[cite: 35].

### 📄 `src/components/TabCasos.jsx`
*   **Responsabilidad:** Renderiza una grilla global que aplana y muestra todos los expedientes de todos los clientes en una sola vista, permitiendo búsquedas transversales[cite: 36].
*   **Estados y Props Clave:** Toma los diccionarios agrupados de `casos` y `pas`, y los transforma en un estado local computado (`allCasos`)[cite: 36].
*   **Flujos Críticos:** 
    *   Aplica algoritmos de ordenamiento múltiple (por último movimiento, orden alfabético, por estado lógico, o monto económico)[cite: 36].
    *   Permite la eliminación definitiva de un expediente local y remotamente (`handleDeleteCaso` utilizando `deleteCaso`)[cite: 36].
*   **Dependencias Fuertes:** Componente `FiltrosEstados`, el orquestador `CasoDetalle` y utilidades de parseo de fechas y monedas (`fmtMoney`, `diasDesde`)[cite: 36].
### 📄 `src/components/TabContactados.jsx`
*   **Responsabilidad:** Renderiza la lista de Productores Asesores (PAS) que ya poseen un historial de contactos previos registrado, permitiendo filtrar por resultado (positivos, negativos, pendientes, etc.)[cite: 37].
*   **Estados y Props Clave:**
    *   Maneja filtros locales por estado de respuesta (`filtroResp`), término de búsqueda (`busqueda`), paginación (`page`) y visualización de descartados (`mostrarDescartados`)[cite: 37].
    *   Recibe los arrays de `pas`, `historial`, `derivadores`, `descartados` y las funciones de callback para interactuar con los contactos[cite: 37].
*   **Flujos Críticos:** Filtra y pagina dinámicamente un subconjunto de la base de datos de PAS basándose en las interacciones guardadas en el historial[cite: 37].
*   **Dependencias Fuertes:** Componente visual `PASCard` y utilidades de formato[cite: 37].

### 📄 `src/components/TabContactos.jsx`
*   **Responsabilidad:** Gestiona la bandeja de prospección principal para los PAS que **aún no han sido contactados** (contactos en frío o base inicial cargada por Excel)[cite: 38].
*   **Estados y Props Clave:** 
    *   Maneja la vista activa (`vista`), el criterio de ordenamiento (`orden`), la búsqueda textual y la paginación[cite: 38].
    *   Recibe props de datos maestros y callbacks de gestión de llamadas[cite: 38].
*   **Flujos Críticos:** Filtra la lista por prioridades predefinidas (agendados, sin teléfono, etc.) y permite ordenar el listado alfabéticamente por nombre, mail o teléfono[cite: 38].
*   **Dependencias Fuertes:** Constantes globales `VISTAS_C`, componente `PASCard` y utilidades[cite: 38].

### 📄 `src/components/TabDashboard.jsx`
*   **Responsabilidad:** El panel analítico y operativo central de la aplicación. Agrupa métricas de cobros, embudo de casos, comisiones y pendientes de gestión[cite: 39].
*   **Estados y Props Clave:** 
    *   Procesa y aplana masivamente el array de expedientes (`allCasos`) mediante múltiples `useMemo` para calcular totales financieros y estadísticas[cite: 39].
    *   Maneja el estado del mes seleccionado para filtrar reportes detallados (`mesSeleccionado`)[cite: 39].
*   **Flujos Críticos:** 
    *   Genera gráficos de facturación de los últimos 12 meses, calcula variaciones interanuales/intermensuales y procesa la distribución visual de estados de expedientes[cite: 39].
    *   Calcula de forma automática los cobros pendientes basándose en los plazos legales de pago (`plazo_pago`)[cite: 39].
*   **Dependencias Fuertes:** Subcomponentes de la carpeta `/dashboard` (`StatCard`, `GraficoBarraMensual`, `MisPendientesCard`, `CobrosPendientesCard`, `RankingPASCard`), `GraficoCompanias`, constantes de estados y utilidades de formato[cite: 39].

### 📄 `src/components/TabPortalUsuarios.jsx`
*   **Responsabilidad:** Módulo administrativo para gestionar el acceso de los Productores Asesores (PAS) al portal web externo[cite: 40].
*   **Estados y Props Clave:** 
    *   Maneja el estado de carga de usuarios del portal (`portalUsers`), el estado del modal de creación de credenciales (`modal`) y los inputs de registro (`email`, `pwd`)[cite: 40].
*   **Flujos Críticos:** 
    *   Se comunica directamente con Supabase Auth (`supabase.auth.signUp`) para dar de alta cuentas de usuario y las vincula en la tabla relacional `pas_portal_users`[cite: 40].
    *   Permite copiar rápidamente al portapapeles la URL general de acceso al portal[cite: 40].
*   **Dependencias Fuertes:** Cliente de Supabase y el sistema de temas globales (`THEME`)[cite: 40].
Markdown
### 📄 `src/components/carpeta/ArchivoLocalRow.jsx`
*   **Responsabilidad:** Representa la fila visual individual de un archivo local obtenido directamente del disco del usuario, permitiendo su vista previa, categorización tipificada y renombrado[cite: 41].
*   **Estados y Props Clave:**
    *   Maneja estados locales de interfaz para la apertura del menú desplegable (`menuOpen`), el posicionamiento inteligente del menú (`dropUp` para evitar desbordes en pantalla), y el estado de edición de nombre (`renombrando`)[cite: 41].
    *   Recibe props clave como el objeto `archivo`, el puntero al directorio `dirHandle`, el tema `Th`, y callbacks para el manejo de eventos de UI y notificaciones[cite: 41].
*   **Flujos Críticos:** 
    *   Calcula automáticamente mediante el `getBoundingClientRect` si el menú desplegable debe expandirse hacia arriba o hacia abajo según el espacio disponible en el viewport[cite: 41].
    *   Permite renombrar y recategorizar archivos locales aplicando nombres normalizados según los tipos de documentos válidos[cite: 41].
*   **Dependencias Fuertes:** Importa funciones de manipulación de disco desde `src/utils/carpeta.js` y las constantes de tipos de documentos[cite: 41].
### 📄 `src/components/caso/ModalGenerarEscrito.jsx`
*   **Responsabilidad:** Modal de parametrización para la generación de escritos legales[cite: 42]. Permite ingresar el DNI del asegurado y seleccionar la documentación adicional a incluir (licencia, presupuesto, estudios médicos, carta de franquicia) antes de disparar la utilidad de redacción[cite: 42].
*   **Estados y Props Clave:** Maneja el estado local del DNI (`dniEscrito`) y un objeto con las opciones booleanas de documentos (`opcionesDoc`)[cite: 42]. Recibe callbacks de éxito/error y el manejador del directorio local[cite: 42].
*   **Flujos Críticos:** Invoca a la función externa `generarEscrito` pasándole el contexto completo del caso[cite: 42].
*   **Dependencias Fuertes:** Utilidad de negocio `generarEscrito.js`[cite: 42].

### 📄 `src/components/caso/ArchivoRow.jsx`
*   **Responsabilidad:** Renderiza la fila visual individual de un archivo adjunto del expediente, mostrando su nombre, tipo de extensión, y proveyendo botones de acción rápida para previsualizar (`PreviewModal`) o eliminar.
*   **Estados y Props Clave:** Maneja de forma local el estado booleano `showPreview` para alternar la apertura del visor modal del archivo.
*   **Dependencias Fuertes:** `PreviewModal.jsx` y utilidades de formato (`getExtension`).

### 📄 `src/components/caso/CasoDocumentos.jsx`
*   **Responsabilidad:** Contenedor de la sección de documentos del expediente[cite: 44]. Agrupa la integración de la carpeta local del sistema de archivos y el listado de archivos adjuntos del caso[cite: 44].
*   **Estados y Props Clave:** No maneja estado propio complejo; actúa como puente de props entre el contenedor principal `CasoUnificado` y los subcomponentes de archivos (`CarpetaLocal`, `ArchivoRow`)[cite: 44].
*   **Flujos Críticos:** Conecta de manera directa el manipulador de directorios del navegador (`dirHandleRef.current`) con la lógica del caso[cite: 44].
*   **Dependencias Fuertes:** `CarpetaLocal` y `ArchivoRow`[cite: 44].

### 📄 `src/components/caso/CasoFooter.jsx`
*   **Responsabilidad:** Barra de botones inferior del modal de detalle del caso[cite: 45]. Agrupa las acciones rápidas operativas de cierre y guardado[cite: 45].
*   **Estados y Props Clave:** Recibe estados de carga mediante props (`exportandoPDF`, `archivosActualizando`, `guardando`) para deshabilitar botones y mostrar indicadores visuales[cite: 45].
*   **Flujos Críticos:** Centraliza los disparadores para generar escritos, exportar el caso a PDF, recargar los archivos locales/remotos y forzar el guardado manual[cite: 45].
*   **Dependencias Fuertes:** Ninguna lógica propia; depende enteramente de las funciones provistas por `CasoUnificado`[cite: 45].

### 📄 `src/components/caso/CasoProximaAccion.jsx`
*   **Responsabilidad:** Módulo de input/textarea dedicado a la gestión interna de notas de seguimiento y notas de próxima acción para el expediente[cite: 46].
*   **Estados y Props Clave:** Controla el campo `proxima_accion` dentro del objeto `formData` del caso[cite: 46].
*   **Flujos Críticos:** Provee una interfaz rápida para apuntar tareas internas de administración que no se reflejan en reportes externos[cite: 46].
*   **Dependencias Fuertes:** Ninguna (componente puramente visual controlado por props)[cite: 46].

### 📄 `src/components/caso/ChecklistDocumental.jsx`
*   **Responsabilidad:** Componente de auditoría documental que verifica de forma automática si la cantidad y tipo de archivos adjuntos cumplen con los requisitos mínimos necesarios para iniciar un reclamo legal[cite: 47].
*   **Estados y Props Clave:** Procesa iterativamente el array de `archivos` comparando sus nombres con las constantes de tipos válidos y requeridos[cite: 47].
*   **Flujos Críticos:** Renderiza un indicador visual dinámico de estado ("Listo para iniciar reclamo" o lista de faltantes)[cite: 47].
*   **Dependencias Fuertes:** Constantes y utilidades de categorización (`TIPOS_DOC`, `DOCS_REQUERIDOS_RECLAMO`)[cite: 47].

### 📄 `src/components/caso/CompaniaSelector.jsx`
*   **Responsabilidad:** Selector desplegable avanzado (Dropdown con buscador interno) de compañías aseguradoras, acompañado de un hook personalizado (`useCompanias`)[cite: 48].
*   **Estados y Props Clave:** 
    *   `useCompanias`: Extrae y unifica las compañías existentes en los casos y las persiste en `localStorage`[cite: 48].
    *   Maneja estados locales de apertura (`open`), búsqueda de texto (`query`), y el modo de adición de una nueva compañía (`adding`, `nueva`)[cite: 48].
*   **Flujos Críticos:** Permite al usuario seleccionar una aseguradora existente o registrar dinámicamente una nueva compañía al listado global persistente[cite: 48].
*   **Dependencias Fuertes:** `localStorage` para la persistencia de aseguradoras customizadas[cite: 48].

### 📄 `src/components/caso/EscritoConfigModal.jsx`
*   **Responsabilidad:** Modal secundario de configuración de escritos extrajudiciales[cite: 49]. 
*   **Estados y Props Clave:** Gestiona un estado local de opciones de documentos y llama a `generarEscrito`[cite: 49].
*   **Flujos Críticos:** Duplica la funcionalidad de configuración de escritos[cite: 49].

### 📄 `src/components/caso/EstadoSelector.jsx`
*   **Responsabilidad:** Selector visual en formato de cuadrícula (grid) para cambiar el estado lógico de un expediente[cite: 50].
*   **Estados y Props Clave:** Recibe el estado actual (`value`) y la función disparadora de cambio (`onChange`)[cite: 50].
*   **Flujos Críticos:** Renderiza dinámicamente todos los estados posibles iterando sobre `ESTADOS_CASO`, aplicando estilos, emojis y colores personalizados según la selección[cite: 50].
*   **Dependencias Fuertes:** Constantes globales `ESTADOS_CASO`[cite: 50].

### 📄 `src/components/caso/FiltrosEstados.jsx`
*   **Responsabilidad:** Panel de filtrado múltiple por estado de caso para grillas generales[cite: 51].
*   **Estados y Props Clave:** Maneja un array de estados activos seleccionados (`filtrosEstados`)[cite: 51].
*   **Flujos Críticos:** Proveee botones de acción rápida para seleccionar únicamente casos activos, seleccionar todos o limpiar los filtros, calculando contadores numéricos en tiempo real basados en el total de casos[cite: 51].
*   **Dependencias Fuertes:** Constantes globales `ESTADOS_CASO`[cite: 51].
### 📄 `src/components/caso/SeccionFechas.jsx`
*   **Responsabilidad:** Renderiza la grilla de campos de fecha clave del expediente judicial o administrativo (derivación, inicio de reclamo, ofrecimiento, pago, cobro, mediación, juicio)[cite: 52].
*   **Estados y Props Clave:** Recibe el objeto `formData` y la función `onChange` para actualizar cada campo de fecha individualmente mediante inputs nativos de tipo `date`[cite: 52].
*   **Flujos Críticos:** Facilita la carga y modificación temporal de los hitos procesales del caso para el posterior cálculo de plazos y métricas[cite: 52].
*   **Dependencias Fuertes:** Ninguna (componente de interfaz controlado por props)[cite: 52].

### 📄 `src/components/caso/SeccionHonorarios.jsx`
*   **Responsabilidad:** Gestiona el control financiero y de facturación de los honorarios profesionales del caso[cite: 53].
*   **Estados y Props Clave:** Muestra alertas condicionales calculando los días transcurridos desde la emisión de la factura (`diasDesdeFactura`)[cite: 53].
*   **Flujos Críticos:** 
    *   Permite alternar entre los estados de honorarios definidos en `ESTADOS_HONORARIOS` (`NO_FACTURADO`, `FACTURADO`, `COBRADO`)[cite: 53].
    *   Calcula de forma automática alertas visuales si los honorarios permanecen facturados por más de 30 días sin cobrarse[cite: 53].
*   **Dependencias Fuertes:** Utilidades de fecha `diasDesde` y constantes globales `ESTADOS_HONORARIOS`[cite: 53].

### 📄 `src/components/caso/SeccionInfo.jsx`
*   **Responsabilidad:** Bloque central de información básica del expediente (asegurado, patente, compañía aseguradora, fecha de siniestro y estado)[cite: 54].
*   **Estados y Props Clave:** Sincroniza de manera bidireccional los campos `patente` y `dominio` para evitar inconsistencias de búsqueda[cite: 54].
*   **Flujos Críticos:** 
    *   Incluye un campo especializado de texto (`mensaje_cliente`) explícitamente diseñado para notas destinadas a ser visibles en el Portal del Cliente y Portal PAS[cite: 54].
    *   Integra el componente modular `EstadoSelector` y el buscador avanzado `CompaniaSelector`[cite: 54].
*   **Dependencias Fuertes:** `EstadoSelector.jsx` y `CompaniaSelector.jsx`[cite: 54].

### 📄 `src/components/caso/SeccionMontos.jsx`
*   **Responsabilidad:** Grilla numérica encargada de la registración de los montos económicos del reclamo[cite: 55].
*   **Estados y Props Clave:** Mapea un listado de campos numéricos clave: monto reclamado, ofrecimiento, cobro del asegurado, honorarios propios y comisión del PAS[cite: 55].
*   **Flujos Críticos:** Permite actualizar en tiempo real las cifras financieras que alimentan los cálculos de rendimiento y estadísticas generales del dashboard[cite: 55].
*   **Dependencias Fuertes:** Ninguna (componente estructurado por props)[cite: 55].

### 📄 `src/components/caso/SeccionTimeline.jsx`
*   **Responsabilidad:** Controla el historial de la bitácora de acciones y notas cronológicas vinculadas al expediente[cite: 56].
*   **Estados y Props Clave:** Maneja estados locales para la apertura del modal de creación/edición (`modalOpen`), la fecha seleccionada, la descripción y el ID del registro que se está editando (`editandoId`)[cite: 56].
*   **Flujos Críticos:** 
    *   Se comunica de forma directa con la tabla relacional `acciones` en Supabase para insertar, actualizar o eliminar eventos de la bitácora ordenados por fecha[cite: 56].
    *   Utiliza React Portal (`createPortal`) para renderizar el modal de edición flotante por encima de la interfaz principal de manera aislada[cite: 56].
*   **Dependencias Fuertes:** Cliente de Supabase y la utilidad de formato `formatoFecha`[cite: 56].

### 📄 `src/components/caso/Toast.jsx`
*   **Responsabilidad:** Sistema de notificaciones flotantes (Toasts) temporales para informar al usuario el éxito o fracaso de operaciones (guardados, errores, copias al portapapeles)[cite: 57].
*   **Estados y Props Clave:** Recibe el mensaje (`msg`), el tipo de alerta (`type`: success, error, info, warn) y una función de cierre (`onDismiss`)[cite: 57].
*   **Flujos Críticos:** Configura un temporizador mediante `useEffect` para auto-descartar la notificación de pantalla transcurridos 3.5 segundos[cite: 57].
*   **Dependencias Fuertes:** Ninguna[cite: 57].

### 📄 `src/components/caso/PreviewModal.jsx`
*   **Responsabilidad:** Visor modal de archivos adjuntos (imágenes o documentos PDF)[cite: 58].
*   **Estados y Props Clave:** Gestiona la creación y destrucción de una URL de objeto temporal (`URL.createObjectURL`) basada en el blob del archivo[cite: 58].
*   **Flujos Críticos:** Previene fugas de memoria en el navegador limpiando la URL temporal mediante la función de retorno del `useEffect` al cerrar el visor[cite: 58].
*   **Dependencias Fuertes:** Utilidad de formateo `getExtension`[cite: 58].

Markdown
### 📄 `src/components/clientes/ClienteCards.jsx`
*   **Responsabilidad:** Renderiza la tarjeta expansible de un Productor Asesor (PAS) cliente en la pestaña de clientes, junto con las sub-tarjetas individuales de cada expediente (`CasoCard`) que posee asociado[cite: 59].
*   **Estados y Props Clave:** Maneja estados locales de hover (`isHovered`, `isHoveredHeader`) para efectos visuales y despliegue del acordeón de casos (`expanded`)[cite: 59].
*   **Flujos Críticos:** Ordena y filtra dinámicamente los expedientes internos aplicando criterios múltiples (por último movimiento, orden alfabético o estado del caso) a través de la función auxiliar `sortCasos`[cite: 59].
*   **Dependencias Fuertes:** Constantes globales de estados y utilidades de formato de fechas y moneda[cite: 59].

### 📄 `src/components/clientes/ModalesCliente.jsx`
*   **Responsabilidad:** Agrupa los modales operativos para la creación de nuevos expedientes vinculados a un PAS (`NuevoCasoModal`) y la gestión/creación manual de nuevos productores (`NuevoPASModal`)[cite: 60].
*   **Estados y Props Clave:** Gestiona los campos de formularios locales para datos de asegurados, compañías, fechas de siniestro y derivación, así como los datos de contacto de un nuevo PAS manual[cite: 60].
*   **Flujos Críticos:** Genera identificadores únicos (UUIDs) y estructuras de datos normalizadas para inyectar nuevos casos o perfiles de productores al estado global[cite: 60].
*   **Dependencias Fuertes:** Selectores especializados como `EstadoSelector` y `CompaniaSelector`[cite: 60].
### 📄 `src/components/dashboard/CobrosPendientesCard.jsx`
*   **Responsabilidad:** Renderiza una tarjeta analítica detallada con los cobros pendientes de expedientes que se encuentran en estado "esperando pago", desglosando montos netos, asegurados y comisiones[cite: 61].
*   **Estados y Props Clave:** Recibe el array procesado de `cobrosPendientes` y el indicador de modo oscuro (`darkMode`)[cite: 61].
*   **Flujos Críticos:** Calcula dinámicamente si los plazos de pago se encuentran vencidos, próximos a vencer (urgentes) o al día, asignando insignias (badges) de color acordes a la criticidad temporal[cite: 61].
*   **Dependencias Fuertes:** Utilidades de formato monetario y fechas (`fmtMoney`, `fmtDate`) y el sistema de temas globales[cite: 61].

### 📄 `src/components/dashboard/GraficoBarraMensual.jsx`
*   **Responsabilidad:** Renderiza un gráfico interactivo de barras verticales que representa la facturación histórica de los últimos 12 meses[cite: 62].
*   **Estados y Props Clave:** Recibe los datos de facturación mensual (`datos`), el estado del mes seleccionado actualmente (`mesSeleccionado`) y una función de callback para alternar la selección (`onClickMes`)[cite: 62].
*   **Flujos Críticos:** Calcula la altura porcentual proporcional de cada barra basándose en el valor máximo y permite hacer clic sobre las columnas para filtrar los casos cobrados de un mes específico[cite: 62].
*   **Dependencias Fuertes:** Utilidades de formato monetario y el sistema de temas globales[cite: 62].

### 📄 `src/components/dashboard/MisPendientesCard.jsx`
*   **Responsabilidad:** Muestra el panel operativo central "Mis Pendientes de Gestión", listando de forma priorizada aquellos expedientes activos que poseen una nota interna en el campo `proxima_accion`[cite: 63].
*   **Estados y Props Clave:** Recibe el array filtrado de expedientes pendientes (`pendientes`) y el indicador de modo oscuro[cite: 63].
*   **Flujos Críticos:** Organiza visualmente las tareas administrativas internas pendientes de seguimiento de manera rápida y accesible[cite: 63].
*   **Dependencias Fuertes:** Sistema de temas y paletas globales[cite: 63].

### 📄 `src/components/dashboard/RankingPASCard.jsx`
*   **Responsabilidad:** Genera un podio o ranking visual de los Productores Asesores (PAS) con mejor rendimiento económico medido en base a los montos cobrados[cite: 64].
*   **Estados y Props Clave:** Recibe el array de ranking calculado (`ranking`) y el flag `darkMode`[cite: 64].
*   **Flujos Críticos:** Renderiza medallas distintivas (oro, plata, bronce) para los primeros puestos y barras de progreso proporcionales al volumen de cobro de cada productor[cite: 64].
*   **Dependencias Fuertes:** Utilidad de formato de moneda `fmtMoney` y sistema de temas[cite: 64].

### 📄 `src/components/dashboard/StatCard.jsx`
*   **Responsabilidad:** Componente reutilizable de tarjeta estadística (o tarjeta métrica) empleada en todo el dashboard para mostrar indicadores numéricos clave[cite: 65].
*   **Estados y Props Clave:** Soporta una variante principal (`isHero = true`) para destacar métricas masivas, además de aceptar props opcionales de color, subtítulos, componentes de íconos y manejadores de clics (`onClick`)[cite: 65].
*   **Flujos Críticos:** Se adapta de manera dinámica para actuar como un elemento estático de lectura o como un botón interactivo de acceso a detalles[cite: 65].
*   **Dependencias Fuertes:** Sistema de temas globales[cite: 65].
### 📄 `src/components/portal/CambiarPasswordModal.jsx`
*   **Responsabilidad:** Modal operativo para que los Productores Asesores (PAS) puedan actualizar su contraseña de acceso al portal[cite: 66].
*   **Estados y Props Clave:** Maneja estados locales para la nueva contraseña (`nueva`), la confirmación (`confirm`), estados de carga (`load`) y alertas de error o éxito[cite: 66].
*   **Flujos Críticos:** Se comunica directamente con Supabase Auth (`supabase.auth.updateUser`) para persistir el cambio de credenciales de forma segura[cite: 66].
*   **Dependencias Fuertes:** Cliente de Supabase y el sistema de estilos aislado del portal (`portalTheme.js`)[cite: 66].

### 📄 `src/components/portal/LoginScreen.jsx`
*   **Responsabilidad:** Pantalla de autenticación y inicio de sesión específica para los Productores Asesores en el portal web externo[cite: 67].
*   **Estados y Props Clave:** Gestiona los campos de entrada de credenciales (`email`, `pwd`), mensajes de error y estados de carga durante la autenticación[cite: 67].
*   **Flujos Críticos:** Autentica al usuario mediante el método de Supabase Auth `signInWithPassword`[cite: 67].
*   **Dependencias Fuertes:** Cliente de Supabase y `portalTheme.js`[cite: 67].

### 📄 `src/components/portal/NuevoCasoModal.jsx`
*   **Responsabilidad:** Formulario avanzado para la derivación de nuevos casos por parte de los PAS desde el portal externo[cite: 68].
*   **Estados y Props Clave:** 
    *   Maneja un borrador en `sessionStorage` (`draft_nuevo_caso`, `draft_otra_compania`) para evitar la pérdida de datos si el usuario recarga la página accidentalmente[cite: 68].
    *   Gestiona los archivos adjuntos seleccionados y las opciones de compañía aseguradora[cite: 68].
*   **Flujos Críticos:** 
    *   Inserta el nuevo expediente en la tabla `pas_casos` de Supabase[cite: 68].
    *   Sube los archivos adjuntos al Storage de Supabase (`bucket: adjuntos`) y genera URLs públicas[cite: 68].
    *   Dispara una notificación por correo electrónico a la administración utilizando la librería `emailjs`[cite: 68].
*   **Dependencias Fuertes:** `@emailjs/browser`, Supabase (Database y Storage) y `portalTheme.js`[cite: 68].

### 📄 `src/components/portal/PortalCasoCard.jsx`
*   **Responsabilidad:** Tarjeta expansible que muestra el detalle completo y el progreso de un expediente específico dentro del portal del PAS[cite: 69].
*   **Estados y Props Clave:** Controla la apertura del acordeón (`open`) y el estado de carga al subir nueva documentación (`subiendo`)[cite: 69].
*   **Flujos Críticos:** 
    *   Renderiza una barra de progreso visual de etapas (`PipelineBar`) basada en el ciclo de vida del caso[cite: 69].
    *   Permite a los productores adjuntar documentación adicional directamente desde el portal, subiendo los archivos a Supabase Storage y notificando a la administración vía EmailJS[cite: 69].
*   **Dependencias Fuertes:** Supabase Storage, EmailJS y utilidades del portal (`portalTheme.js`)[cite: 69].

### 📄 `src/components/portal/PortalCliente.jsx`
*   **Responsabilidad:** Vista pública orientada al cliente final (asegurado) para consultar en tiempo real el estado de su reclamo ingresando su número de patente[cite: 70].
*   **Estados y Props Clave:** Maneja la patente ingresada por el usuario (`patente`), los resultados de la consulta de casos (`casos`), y los estados de búsqueda y carga[cite: 70].
*   **Flujos Críticos:** 
    *   Permite la lectura directa de parámetros en la URL (ej. `?caso=12345` o `?vista=cliente`) para realizar consultas automáticas mediante enlaces directos[cite: 70].
    *   Filtra y busca de forma segura en las columnas `patente` y `dominio` de la base de datos de Supabase[cite: 70].
*   **Dependencias Fuertes:** Cliente de Supabase y `portalTheme.js`[cite: 70].

### 📄 `src/components/portal/PortalHome.jsx`
*   **Responsabilidad:** Panel de control principal (Dashboard) para los Productores Asesores dentro del portal externo[cite: 71].
*   **Estados y Props Clave:** Maneja la información del PAS autenticado, el listado general de sus casos, filtros múltiples de estado y la apertura de modales operativos[cite: 71].
*   **Flujos Críticos:** 
    *   Vincula el usuario autenticado de Supabase Auth con su respectivo perfil de productor mediante la tabla relacional `pas_portal_users`[cite: 71].
    *   Implementa suscripciones en tiempo real (`useRealtimeCasos`) para reflejar instantáneamente las actualizaciones de los casos[cite: 71].
    *   Integra un componente de Error Boundary (`GraficoBoundary`) para evitar que fallos en el renderizado del gráfico de compañías colapsen toda la interfaz[cite: 71].
*   **Dependencias Fuertes:** Supabase, hooks de sincronización en tiempo real y subcomponentes del portal[cite: 71].

### 📄 `src/components/portal/portalTheme.js`
*   **Responsabilidad:** Archivo de constantes y configuración visual exclusivo para el entorno del portal de productores[cite: 72].
*   **Estados y Props Clave:** Define los estados del caso específicos del portal, funciones auxiliares de formato de moneda y fechas (`fmtDate`, `fmtMoney`), y la paleta de colores dinámica para el modo claro y oscuro[cite: 72].
*   **Flujos Críticos:** Provee estilos normalizados y objetos de propiedades de inputs para mantener la consistencia estética del portal independientemente del tema seleccionado[cite: 72].
*   **Dependencias Fuertes:** Ninguna[cite: 72].
### 📄 `src/context/ThemeContext.jsx`
*   **Responsabilidad:** Proveedor del contexto global de estilos e interfaz (modo claro/oscuro) para toda la aplicación[cite: 73].
*   **Estados y Props Clave:** Maneja el estado booleano `darkMode` persistido en el `localStorage` (`pas_tracker_dark_mode`) y expone la función alternadora `toggleDarkMode`[cite: 73].
*   **Flujos Críticos:** Calcula y memoriza dinámicamente el objeto de diseño `T` utilizando la función centralizada `THEME` para que cualquier componente hijo consuma instantáneamente los colores actualizados[cite: 73].
*   **Dependencias Fuertes:** Utilidades globales de diseño y paletas (`THEME`, `COLORES` de `src/utils/theme.js`)[cite: 73].
Markdown
### 📄 `src/hooks/usePASData.js`
*   **Responsabilidad:** Custom hook centralizado para la carga masiva, filtrado y estructuración inicial de toda la data maestra de Productores Asesores (PAS) desde Supabase[cite: 74].
*   **Estados y Props Clave:** Administra los estados asíncronos y diccionarios relacionales para la lista de contactos, historial, casos, derivadores, recordatorios, descartados y PAS manuales[cite: 74].
*   **Flujos Críticos:** 
    *   Implementa un mecanismo de paginación en bucle (`chunking` de 1000 registros) para superar el límite por defecto de Supabase al extraer todos los contactos[cite: 74].
    *   Filtra de manera automática los registros descartados antes de alimentar el estado global del sistema[cite: 74].
*   **Dependencias Fuertes:** Cliente de Supabase[cite: 74].

### 📄 `src/hooks/useRealtimeSync.js`
*   **Responsabilidad:** Conjunto de hooks especializados en la sincronización en tiempo real con Supabase mediante canales de WebSockets (`Realtime`)[cite: 75].
*   **Estados y Props Clave:** Recibe parámetros de configuración como nombre de tabla, columna de filtro, valor y una función de callback (`onUpdate`)[cite: 75].
*   **Flujos Críticos:** 
    *   Gestiona suscripciones a eventos de base de datos (`INSERT`, `UPDATE`, `DELETE`) para tablas específicas (`pas_casos`, `acciones`)[cite: 75].
    *   Ejecuta la limpieza de canales mediante la función de retorno del `useEffect` al desmontar los componentes para prevenir fugas de conexiones[cite: 75].
*   **Dependencias Fuertes:** Cliente de Supabase[cite: 75].
### 📄 `src/utils/carpeta.js`
*   **Responsabilidad:** Gestiona las operaciones de almacenamiento de archivos tanto en Supabase Storage como en el disco local del usuario utilizando la File System Access API del navegador[cite: 76].
*   **Estados y Props Clave:** Funciones asíncronas que reciben manejadores de directorios (`dirHandle`), metadatos de archivos y callbacks de éxito o error[cite: 76].
*   **Flujos Críticos:** 
    *   Permite seleccionar carpetas locales en modo lectura/escritura (`elegirCarpeta`, `verificarPermisoCarpeta`)[cite: 76].
    *   Implementa el flujo de renombrado local (crear nuevo archivo, copiar contenido, eliminar el original) dado que la API de sistema de archivos no cuenta con un método nativo de renombrado[cite: 76].
*   **Dependencias Fuertes:** Cliente de Supabase[cite: 76].

### 📄 `src/utils/categorizarArchivo.js`
*   **Responsabilidad:** Contiene las constantes tipificadas y las funciones lógicas para categorizar, numerar y renombrar documentos de reclamos[cite: 77].
*   **Estados y Props Clave:** Define listas maestras como `TIPOS_DOC` y `DOCS_REQUERIDOS_RECLAMO`[cite: 77].
*   **Flujos Críticos:** Analiza dinámicamente los nombres existentes mediante expresiones regulares para asignar sufijos numéricos correlativos (ej. `FOTOS_1`, `FOTOS_2`) y gestiona el traspaso de archivos en Supabase Storage[cite: 77].
*   **Dependencias Fuertes:** Cliente de Supabase[cite: 77].

### 📄 `src/utils/exportarCasoPDF.js`
*   **Responsabilidad:** Genera un reporte completo en formato PDF con el resumen detallado, datos personales, hitos temporales, montos y el historial de acciones de un expediente[cite: 78].
*   **Estados y Props Clave:** Utiliza la librería externa `jsPDF` para maquetar el documento de manera paginada[cite: 78].
*   **Flujos Críticos:** Calcula saltos de página automáticos según la altura del contenido y añade pies de página dinámicos con numeración de páginas[cite: 78].
*   **Dependencias Fuertes:** `jsPDF`[cite: 78].

### 📄 `src/utils/formatters.js`
*   **Responsabilidad:** Biblioteca centralizada de utilidades de formateo para fechas, montos en moneda argentina, números de teléfono y parseo inicial de datos[cite: 79].
*   **Estados y Props Clave:** Funciones puras orientadas a transformar strings, fechas ISO y valores numéricos[cite: 79].
*   **Flujos Críticos:** Incluye generadores de enlaces rápidos de WhatsApp (`waLink`) con mensajes preconfigurados para la prospección de Productores Asesores[cite: 79].
*   **Dependencias Fuertes:** Ninguna[cite: 79].

### 📄 `src/utils/generarEscrito.js`
*   **Responsabilidad:** Automatiza la redacción y exportación de escritos extrajudiciales de reclamo de terceros en formato PDF[cite: 80].
*   **Estados y Props Clave:** Recibe el objeto del caso, el DNI del asegurado, el manejador de directorios opcional y las opciones de documentación adicional (`opcionesDoc`)[cite: 80].
*   **Flujos Críticos:** Si se provee un `dirHandle` válido, intenta guardar el archivo PDF directamente en la carpeta local del caso; de lo contrario, fuerza la descarga directa en el navegador[cite: 80].
*   **Dependencias Fuertes:** `jsPDF`[cite: 80].

### 📄 `src/utils/storage.js`
*   **Responsabilidad:** Centraliza las operaciones de persistencia masiva e individual (guardado, carga y eliminación) hacia las tablas relacionales de Supabase[cite: 81].
*   **Estados y Props Clave:** Exporta funciones asíncronas como `saveStorage`, `loadStorage`, `insertHistorialEntry`, y métodos de borrado de casos y productores manuales[cite: 81].
*   **Flujos Críticos:** Mapea y normaliza diccionarios complejos de estado local hacia estructuras de filas planas compatibles con el esquema relacional de Supabase para operaciones de `upsert`[cite: 81].
*   **Dependencias Fuertes:** Cliente de Supabase[cite: 81].

### 📄 `src/utils/theme.js`
*   **Responsabilidad:** Define la paleta de colores semántica oficial de la aplicación y la estructura del objeto de diseño adaptativo para modos claro y oscuro[cite: 82].
*   **Estados y Props Clave:** Exporta el objeto estático `COLORES` y la función fábrica `THEME(dark)`[cite: 82].
*   **Flujos Críticos:** Establece los colores de acento, estados semánticos (éxito, advertencia, peligro, info) y los estilos base normalizados para los campos de entrada de texto asegurando accesibilidad visual[cite: 82].
*   **Dependencias Fuertes:** Ninguna[cite: 82].

## 🧹 TODO: Auditoría de Código Muerto (A verificar al final)
- [x] **(Resuelto 2026-09-22)** **`src/CasoUnificado.jsx`:** No hay código estructuralmente "muerto", pero existe un "parche" de retrocompatibilidad o deuda técnica en el estado y `handleFormChange`: se sincronizan artificialmente los campos `patente` y `dominio` (`...(key === "patente" ? { dominio: value } : {})`)[cite: 20]. Se debería unificar el nombre de la columna en la base de datos a futuro para evitar este duplicado.
- [x] **(Resuelto 2026-09-22 — variables de entorno)** **`src/supabase.js` (Tech Debt):** Las credenciales `SUPABASE_URL` y `SUPABASE_KEY` están "hardcodeadas" directamente en el código fuente en lugar de utilizar variables de entorno (ej. `import.meta.env.VITE_SUPABASE_URL`)[cite: 25]. Esto es un riesgo de seguridad y dificulta el despliegue en múltiples entornos.
- [x] **(Resuelto 2026-09-22)** **`src/components/GraficoCompanias.jsx` (Tech Debt de DB):** El componente hace un parche dinámico leyendo `const comp = c.compania || c.compania_aseguradora`[cite: 31]. Esto evidencia que en la base de datos de Supabase existen registros con la columna `compania` y otros con `compania_aseguradora`, debiendo unificarse la nomenclatura en la base de datos para no penalizar el rendimiento del frontend con comprobaciones dobles.
- [ ] **`src/components/LoginGate.jsx` (Vulnerabilidad / Tech Debt):** La constante `APP_PIN = "3934"` está "hardcodeada" en texto plano en el frontend[cite: 32]. Cualquier persona que inspeccione el código fuente en el navegador o el bundle compilado puede ver la contraseña. Esto debería manejarse al menos mediante validación contra Supabase Auth.
- [ ] **`src/components/TabCasos.jsx` (Tech Debt de Datos):** En el algoritmo de ordenamiento por monto, se realiza la comprobación `Number(b.monto_acordado) || Number(b.monto_ofrecimiento) || 0`[cite: 36]. Esto indica que los datos económicos provienen de Supabase en formato `string` (posiblemente de inputs de texto sin sanitizar), lo cual impacta el rendimiento y obliga al frontend a hacer *casting* constante.
- [x] **(Resuelto 2026-09-22)** **Duplicidad de lógica de patentes/dominios:** Al igual que se vio en `CasoUnificado.jsx`, en `SeccionInfo.jsx` se vuelve a parchar la sincronización manual de `patente` y `dominio` (`onChange("patente", val); onChange("dominio", val);`)[cite: 20, 54]. Esto es un claro indicio de deuda técnica a nivel de base de datos: tener dos columnas separadas para el mismo dato en Supabase obliga al frontend a duplicar validaciones constantemente.
- [ ] **`src/components/clientes/ModalesCliente.jsx` (Tech Debt de IDs):** Al crear un nuevo PAS manual, se genera un ID aleatorio mediante una operación matemática (`100000 + Math.floor(Math.random() * 1900000)`)[cite: 60]. Esto representa una mala práctica y un riesgo latente de colisión de IDs en la base de datos comparado con el uso robusto de UUIDs que se implementa para los casos.
- [ ] **`src/components/portal/PortalHome.jsx` (Excepción de Seguridad / Hardcode):** En la carga inicial de datos se incluye una validación por correo electrónico hardcodeada (`if (session.user.email === "atglexsolutions@gmail.com")`) para otorgar privilegios especiales o vista global de casos[cite: 71]. Esto representa una deuda técnica y un riesgo de seguridad al depender de un string estricto en el frontend en lugar de un sistema de roles/permisos robusto en la base de datos.
- [ ] **🔴 RLS desactivado (CRÍTICO):** Salvo `pas_portal_users`, ninguna tabla tiene Row Level Security. Como la anon key viaja en el bundle, cualquiera puede leer/modificar/borrar todos los datos vía API. Asegurar el PIN no sirve sin RLS.
- [ ] **`pas_casos.monto_reclamado` es `text`:** el resto de montos ya son `numeric` (el casting de `TabCasos` sobre `monto_acordado` es inocuo). Migrar `monto_reclamado` a `numeric` tras revisar formatos existentes.
- [ ] **Tipos inconsistentes de IDs de PAS:** `pas_contactos.id` es `text`, pero `pas_casos.pas_id` y `pas_derivadores.pas_id` son `integer`.
- [ ] **Borrar columnas viejas** `dominio` y `compania` + trigger puente (paso 5 de `sql/2026-09-22_02_unificar_columnas.sql`) cuando la versión nueva esté estable.
- [ ] **`schema.sql` desactualizado:** regenerar con el esquema real completo.

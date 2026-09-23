# PAS-Tracker — Documento de Contexto General

> Última revisión de estructura: 2026-09-24. Regla de trabajo: **cada cambio se registra acá** (sección "Registro de Cambios").

## 🛠️ Stack
*   **Frontend:** React 18 + React Router 6 + Vite 5. Estilos inline + tokens CSS en `src/index.css` (claro/oscuro con `data-theme`, 4 acentos con `data-accent`: Dorado, Marino, Borgoña, Grafito). Sin colores hex en componentes: `var(--…)` y `alpha()`.
*   **Backend:** Supabase (PostgreSQL con RLS en todas las tablas, Auth, Realtime, Storage). Credenciales por variables de entorno `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
*   **Deploy:** Vercel, proyecto "pas-tracker2.0" conectado a `Aletorresok/pas-tracker` (producción `pas-tracker20.vercel.app`; preview por rama). El usuario usa la app desde Chrome (PC y celular).
*   **Librerías:** jsPDF (escritos y PDF del caso), XLSX (Excel), EmailJS (mails de derivación y de documentación del cliente; `VITE_EMAILJS_*`).
*   **Tres "apps" en el mismo sitio:** app del estudio (`/`), portal de productores (`/portal`) y vista del cliente (`/?vista=cliente`).

## 📂 Estructura del código (`src/`)

**Entrada y ruteo**
*   `main.jsx` — monta la app con `ThemeProvider` y rutas: `/portal/*` → `Portal.jsx`; el resto → `App.jsx`.
*   `App.jsx` — si la URL es `?vista=cliente` muestra `PortalCliente`; si no, `LoginGate` → `AppPrincipal`: carga datos (`usePASData`), pestañas, buscador (Ctrl+K), ficha abierta desde el buscador, Realtime de casos nuevos, handlers (`handleCasoLocal`, `handleQuitarCaso`, contactos, backup).
*   `Portal.jsx` — sesión de Supabase Auth del PAS → `LoginScreen` o `PortalHome`.
*   `supabase.js` (cliente) · `constants.js` (`ESTADOS_CASO`, `estadoInfo`, `TIPOS_DOC`, `DOCS_REQUERIDOS_RECLAMO`, estados de honorarios, vistas de contactos) · `index.css` (tokens, temas, reglas de celular).

**Acceso**
*   `components/LoginGate.jsx` — cuenta de Supabase (una vez por navegador, solo cuentas en `pas_admins`) + PIN por pestaña; 5 PIN mal = cierra sesión. Exporta `cerrarSesion`.

**Navegación y búsqueda**
*   `components/SidebarNav.jsx` — menú lateral (compu), barra inferior + "Más" (celular), botón Buscar, "Apariencia y backup", cerrar sesión.
*   `components/BuscadorGlobal.jsx` — Ctrl/Cmd+K: casos (asegurado, patente, DNI, siniestro, compañía, PAS) y PAS (cargados + búsqueda en los 51 mil contactos).

**Pestañas del estudio**
*   `TabDashboard.jsx` (**Hoy**) — Documentación recibida, Nuevos del portal, KPIs, Para hacer, Cobros pendientes, Agenda, Casos por etapa, Honorarios por mes.
    *   `dashboard/RecepcionHoy.jsx` (archivos que mandaron clientes) · `NuevosPortal.jsx` (casos derivados sin revisar) · `ParaHacer.jsx` (próximas acciones, honorarios, reclamos quietos con "Reiteré hoy", PAS dormidos con "Escribirle") · `CobrosResumen.jsx` · `AgendaHoy.jsx` (14 días) · `GraficoBarraMensual.jsx`.
*   `TabCasos.jsx` (**Casos**) — tabla con chips (Activos, Todos, Sin DNI, por estado), orden, filas de dos líneas en celular.
    *   `casos/FilaExpandida.jsx` — edición rápida con autoguardado (estado, próxima acción + plazo, DNI, mensaje al cliente, montos) + "Avisar por WhatsApp".
*   `TabProspeccion.jsx` (**Prospección**) — Sin contactar (`TabContactos.jsx`, paginado en servidor), Contactados / Derivadores / Descartados (`prospeccion/ListaContactados.jsx`); fila `PASCard.jsx`; registrar contacto `ContactModal.jsx`.
*   `TabClientes.jsx` (**Clientes**) — tabla de PAS clientes (en curso, cobrados, % desistidos, honorarios, ritmo/Dormido); fila desplegada con estadísticas, "Resumen del mes" (`clientes/ResumenMensual.jsx`), nuevo caso / PAS manual (`clientes/ModalesCliente.jsx`) y sus casos.
*   `TabAnalisis.jsx` (**Análisis**) — cobros en detalle (`dashboard/CobrosPendientesCard.jsx`), ranking de PAS (`dashboard/RankingPASCard.jsx`), plazos por compañía (`GraficoCompanias.jsx`).
*   `TabPortalUsuarios.jsx` (**Portal**) — alta/baja de usuarios del portal (cliente de Supabase aparte para no pisar tu sesión).

**Ficha del caso**
*   `CasoUnificado.jsx` — encabezado fijo, línea de etapas (`caso/EtapasCaso.jsx`), pestañas Resumen / Datos / Montos / Documentos / Bitácora, autoguardado (upsert de un caso), PDF, "Generar escrito".
*   `caso/CasoOverlay.jsx` — abre la ficha encima de cualquier pantalla (marca revisados los casos del portal).
*   Resumen: `caso/ResumenCaso.jsx` (próxima acción `CasoProximaAccion.jsx`, mensaje al cliente + "Copiar link del cliente" + `AvisarWhatsApp.jsx`, últimos movimientos, `AgendaCaso.jsx`, números).
*   Datos: `SeccionInfo.jsx` (asegurado, patente, compañía `CompaniaSelector.jsx`, DNI, teléfono) · `SeccionFechas.jsx`. Montos: `SeccionMontos.jsx` · `SeccionHonorarios.jsx`.
*   Documentos: `RecepcionCliente.jsx` (guardar lo que mandó el cliente en la carpeta) · `ChecklistDocumental.jsx` (manual) · `CasoDocumentos.jsx` + `CarpetaLocal.jsx` + `carpeta/ArchivoLocalRow.jsx` (carpeta local con File System Access).
*   Bitácora: `SeccionTimeline.jsx`. Otros: `ModalGenerarEscrito.jsx`, `PreviewModal.jsx`, `Toast.jsx`, `EstadoSelector.jsx`.

**Portal PAS y vista del cliente** (`components/portal/`)
*   `LoginScreen.jsx`, `CambiarPasswordModal.jsx`, `PortalHome.jsx` (resumen, pestañas En curso / Cobrados / Desistidos / Todos + chips por estado, plazos por compañía), `PortalCasoCard.jsx` (avance, mensaje del estudio, adjuntar), `NuevoCasoModal.jsx` (derivar caso + archivos + mail).
*   `PortalCliente.jsx` — vista del cliente: patente + 3 del DNI, línea de tiempo de 5 pasos, mensaje del estudio, montos, "Mandanos tu documentación" (un mail por sesión), WhatsApp.

**UI compartida** (`components/ui/`): `Boton`, `Icono`, `EstadoPill`, `PlazoChip`, `CampoMonto`, `BarraAvance`.

**Hooks y contexto:** `hooks/usePASData.js` (carga inicial, paginada de a 1000; contactos por id), `hooks/useRealtimeSync.js`, `hooks/useEsCelular.js` (corte 900 px), `context/ThemeContext.jsx` (tema y acento).

**Utilidades** (`utils/`)
*   `metricas.js` (KPIs, tareas, reclamos quietos, tramos) · `estadisticasPas.js` (estadísticas por PAS, dormidos, resumen del mes) · `mensajes.js` (plantillas de WhatsApp, normalización de teléfonos) · `agenda.js` (eventos, Google Calendar) · `subidasCliente.js` (subida del cliente y recepción) · `portalStorageUtils.js` (adjuntos del portal + mails EmailJS) · `storage.js` (guardados puntuales, `marcarRevisado`, `registrarReiteracion`, backup) · `formatters.js` (fechas, montos, `primerNombre`) · `theme.js` · `generarEscrito.js` · `exportarCasoPDF.js` · `carpeta.js` (carpeta local: elegir, leer, renombrar, crear).

## 🗄️ Base de datos (detalle en `schema.sql`, cambios en `sql/`)
*   **Casos:** `pas_casos` (incluye `patente`, `compania_aseguradora`, `dni_asegurado`, `telefono_asegurado`, `mensaje_cliente` + fecha, `origen`/`revisado_en`, `proxima_accion` + `_vence`, `documentacion` jsonb) · `acciones` (bitácora) · `pas_eventos` (agenda).
*   **Prospección:** `pas_contactos` (~51 mil), `pas_historial`, `pas_derivadores`, `pas_descartados`, `pas_manuales`, `pas_recordatorios` (sin uso).
*   **Portal y acceso:** `pas_lista`, `pas_portal_users`, `pas_admins`, `pas_cliente_intentos`, `pas_subidas_cliente`.
*   **Funciones:** `es_admin`, `mi_pas_id`, `plazos_companias`, `consultar_caso_cliente`, `cliente_es_dueno`, `autorizar_subida_cliente`, `subida_autorizada`, `confirmar_subida_cliente`, `documentos_enviados_cliente`. **Triggers:** fecha del mensaje al cliente.
*   **Storage:** `adjuntos` (público por link; cada PAS sube a su carpeta) y `recepcion` (privado; buzón de paso de lo que sube el cliente).

## 🔄 Flujos principales
*   **Derivación:** el PAS deriva desde `/portal` → caso con `origen = 'portal'` + mail → aparece en vivo en Hoy "Nuevos del portal" → al abrirlo queda revisado (el PAS ve "El estudio tomó el caso").
*   **Gestión:** estados del caso, próxima acción con plazo, avisos por WhatsApp, agenda, reclamos quietos, cobros y honorarios.
*   **Cliente:** entra con patente + DNI, ve su avance y sube documentación → un mail por sesión → Hoy "Documentación recibida" → se guarda en la carpeta del caso y se borra de la nube.
*   **Prospección:** contactos del Excel → registrar contacto → deriva / descartado → clientes, con estadísticas y resumen mensual.

## 🧹 Pendientes de mejora (actualizado 2026-09-24)
**Para probar en uso real:** guardado en la carpeta vinculada de lo que manda el cliente (no se pudo probar en el entorno de prueba); derivación desde el portal en vivo; mail único por sesión.

**Funcionalidades (ideas):**
- [ ] Que el cliente vea como "✓ Ya lo tenemos" lo que tildaste en el checklist.
- [ ] Margen de "reclamo quieto" ajustable por compañía.
- [ ] Plantilla de EmailJS aparte para la documentación del cliente (asunto propio).
- [ ] Mostrar al PAS (portal) y al cliente la próxima mediación agendada.
- [ ] F10 · carga del caso desde la denuncia con IA: descartada por ahora (costo).

**Código sin uso:**
- [x] ✅ Borrado el 24/09: `ClienteCards.jsx`, `FiltrosEstados.jsx`, `MisPendientesCard.jsx`, `StatCard.jsx`, `ArchivoRow.jsx`, `utils/categorizarArchivo.js`, `main.js` de la raíz, las funciones de Storage de `utils/carpeta.js`, la lista de archivos "de Supabase" y el botón "Actualizar archivos" de Documentos, `RESULTADOS_CONTACTO` y `EXTENSIONES_VALIDAS`. `TIPOS_DOC` y `DOCS_REQUERIDOS_RECLAMO` viven ahora en `constants.js`.
- [ ] En la base (requiere SQL, a decidir): `pas_casos.notas_log` (lo usa todavía `PortalCasoCard` para "último movimiento") y `recordatorio`, tabla `pas_recordatorios`; tablas de otra versión `aseguradoras`, `casos`, `gestiones_judiciales`.

**Deuda técnica:**
- [ ] Fechas guardadas como texto: `pas_casos.fecha_siniestro`, `fecha_derivacion`, `fecha_contacto_asegurado`, `fecha_inicio_reclamo`, `fecha_ultimo_movimiento`; `pas_historial.fecha`.
- [ ] IDs de PAS inconsistentes: `pas_contactos.id` es texto; `pas_id` en el resto es integer.
- [ ] ID de PAS manual aleatorio (`100000 + random`) en `clientes/ModalesCliente.jsx`: riesgo de choque; mejor secuencia o UUID.
- [ ] Mail del administrador escrito en el código (`LoginGate.MAIL_ADMIN` solo precarga el campo, sin riesgo; `PortalHome` lo usa para ver todos los casos — hoy lo decide RLS, se puede quitar).
- [ ] PIN 3934 en el código: aceptado como bloqueo rápido; la seguridad real es la cuenta + RLS.
- [ ] Faltan claves primarias/índices documentados en `schema.sql` (el export no los incluyó).

## 📝 Registro de Cambios

### 2026-09-22 — Rama `claude/kind-carson-68fvrx`
*   **Variables de entorno:** `src/supabase.js` y `src/utils/portalStorageUtils.js` leen credenciales de `import.meta.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY`). Plantilla en `.env.example`. Hay que cargarlas en `.env` local **y** en Vercel antes de deployar.
*   **Unificación de columnas:** todo el frontend lee/escribe solo `patente` y `compania_aseguradora`. Se eliminaron los parches `c.compania || c.compania_aseguradora` y la sincronización manual `patente`↔`dominio` (CasoUnificado, SeccionInfo, NuevoCasoModal, PortalCliente, PortalHome, GraficoCompanias, TabCasos, dashboard, PDFs, storage.js).
*   **SQL en `sql/`:** `2026-09-22_01_backup.sql` (copia todas las tablas al esquema `backup_20260922`) y `2026-09-22_02_unificar_columnas.sql` (copia `dominio`→`patente`, `compania`→`compania_aseguradora` + trigger puente). **Orden de deploy: backup → migración SQL → recién ahí publicar el código.**
    *   ✅ **Ejecutado en producción el 2026-09-22:** backup verificado (pas_casos 95, acciones 664, pas_contactos 51048, pas_historial 828, pas_manuales 2), diagnóstico sin conflictos, migración con 0 filas pendientes y trigger puente activo. Las tablas del esquema `backup_20260922` tienen RLS activado.
    *   ✅ **Variables de entorno cargadas en Vercel** (proyecto `pas-tracker2.0`, conectado a `Aletorresok/pas-tracker`) para Production y Preview.
    *   ✅ **Publicado en producción** vía PR #1 (https://github.com/Aletorresok/pas-tracker/pull/1). Uso real: la app se usa solo desde Chrome (Vercel, `pas-tracker20.vercel.app`); no se corre localmente, así que no hace falta `.env` en la PC.
*   **Limpieza del repo:** se sacaron `dist-electron/` y `dist-electron.zip` del control de versiones (quedan en `.gitignore`).

### 2026-09-24 — Estado al cierre de la sesión
*   **Todo publicado** (PR #7 a #20) y **todos los SQL ejecutados** (01 a 12).
*   **Para probar en uso real:** (1) subida del cliente de punta a punta: foto desde el celular → mail único → Hoy "Documentación recibida" → guardar en la **carpeta vinculada** (esto último no se pudo probar en el entorno de prueba); (2) derivar un caso desde el portal con un PAS de prueba y ver que aparezca en "Nuevos del portal" sin recargar; (3) un evento de agenda con "Google Calendar".
*   **Ideas que quedaron sin hacer:** que el cliente vea en su vista lo que ya tildaste como recibido; margen de "reclamo quieto" ajustable por compañía; plantilla de EmailJS aparte para las subidas del cliente (asunto propio); F10 (carga desde la denuncia con IA) descartada por costo.
*   **Deuda técnica** (ver ⚠ en `schema.sql`): fechas guardadas como texto en `pas_casos`/`pas_historial`; `pas_contactos.id` texto vs `pas_id` integer; tablas sin uso (`aseguradoras`, `casos`, `gestiones_judiciales`); código que usa el bucket `casos` inexistente (`utils/carpeta.js`, `categorizarArchivo.js`, pestaña Documentos "Actualizar archivos"); `notas_log`/`recordatorio` sin uso.

### 2026-09-24 — Checklist de documentación manual (✅ publicada, PR #20; SQL 12 ejecutado el 24/09)
*   **Pedido del usuario:** el checklist de documentación es **manual**: solo el abogado, desde la ficha del caso, tilda qué documentación ya tiene (antes contaba archivos del bucket `casos`, que no existe, y siempre decía que faltaba todo).
*   **SQL `2026-09-24_12_checklist_manual.sql`:** columna `pas_casos.documentacion jsonb` (tipo → fecha en que se tildó, ej. `{"DNI": "2026-09-24"}`).
*   Ficha → **Documentos**: casillas para DNI, Licencia, Cédula, Fotos, Escrito, Denuncia, Certificado de cobertura, Presupuesto, Info del tercero; al tildar muestra "Lo tengo · fecha"; se guarda solo (autoguardado de la ficha). "Faltan para el reclamo" se calcula con los necesarios sin tildar (DNI, Denuncia, Certificado, Presupuesto, marcados con *). Si la columna no existe todavía, la ficha no la manda al guardar y el checklist avisa que falta el SQL.
*   No se tilda nada automáticamente (ni al guardar lo que manda el cliente).

### 2026-09-24 — Etapa 15: El cliente sube su documentación (✅ publicada, PR #17 + #18 + #19; SQL 11 ejecutado el 24/09)
*   **Idea:** Supabase como **buzón de paso**. El cliente sube desde su vista; el estudio lo guarda en la carpeta local del caso y se **borra de la nube** (el usuario no quiere pagar espacio).
*   **SQL `2026-09-24_11_subidas_cliente.sql`:** bucket **privado `recepcion`** (15 MB por archivo, solo JPG/PNG/WEBP/HEIC/PDF); tabla **`pas_subidas_cliente`** (caso, tipo, nombre original, ruta, estado autorizada → subida → guardada, vence a los 15 min) con RLS de administrador; funciones `cliente_es_dueno` (interna), **`autorizar_subida_cliente`** (valida patente + DNI del caso, tipo permitido, máx. 40 por caso por día; devuelve la ruta), `subida_autorizada` (usada por la política de Storage: el anónimo solo puede subir a una ruta autorizada y vigente), `confirmar_subida_cliente` y `documentos_enviados_cliente`.
*   **Vista del cliente** (`PortalCliente` → "Mandanos tu documentación", solo casos en curso): DNI, cédula, licencia, denuncia, certificado de cobertura, fotos, presupuesto, otro (los "necesarios" marcados). Botón **Subir** (cámara o PDF, varios a la vez); las fotos grandes se achican en el celular (máx. 2000 px, JPG) antes de subir. Muestra "✓ Enviado · fecha (n)" por tipo.
*   **Estudio:** en **Hoy**, tarjeta **"Documentación recibida"** (por caso, con los tipos) → "Guardar en el caso" abre la ficha en **Documentos**. En la ficha: aviso en Resumen, pestaña "Documentos · N nuevos" y bloque **"El cliente mandó N archivos"** con Ver, **Guardar** y **Guardar todo**: si la carpeta del caso está vinculada, se escribe ahí como `DNI_1.jpg`, `FOTOS_2.jpg`… (siguiente número libre) y la carpeta se relee; si no, se descarga. Después se borra de la nube y queda como "guardada". (`utils/subidasCliente.js`, `caso/RecepcionCliente.jsx`, `dashboard/RecepcionHoy.jsx`)
*   **Aviso por mail, uno por sesión** (pedido del usuario): lo que el cliente sube en una visita se junta y sale **un solo mail** (misma plantilla de EmailJS que las derivaciones, vía API con `keepalive`, `portalStorageUtils.notificarSubidaCliente`): "asegurado" = NOMBRE (DOCUMENTACIÓN DEL CLIENTE · N archivos), patente, compañía y la lista por tipo, sin links (la carpeta es privada), con el recordatorio de guardarlos desde Hoy. Sale con lo primero que pase: botón **"Listo, ya mandé todo"**, **Salir**, cerrar/abandonar la página (`pagehide`), **irse a otra app** (`visibilitychange`, salvo mientras está abierta la cámara o el selector de archivos) o **10 minutos** sin subir nada más (`PortalCliente.useAvisoDeSesion`). Si el cliente vuelve otro día, es otra sesión y otro mail. Si el mail falla, la subida igual queda.
*   No probado en el entorno de prueba: la escritura real en la carpeta vinculada (no hay selector de carpetas); sí se probó el camino de descarga.
*   Nota: el checklist de "Documentación para el reclamo" cuenta los archivos del bucket `casos` (que no existe), no los de la carpeta local; queda para revisar.

### 2026-09-24 — Etapa 14: Agenda (mediaciones, audiencias) + Google Calendar (✅ publicada, PR #16; SQL 10 ejecutado)
*   **SQL `2026-09-24_10_agenda.sql`** (correr antes de usarla): tabla nueva **`pas_eventos`** (caso_id → pas_casos con borrado en cascada, tipo, inicio con fecha y hora, duración, link, lugar, notas), con RLS de administrador.
*   **Ficha → Resumen → "Agenda"** (`caso/AgendaCaso.jsx`, columna derecha): agregar **Mediación / Audiencia / Vencimiento / Reunión / Otro** con fecha, hora, duración, **link** (Zoom/Meet/Teams), lugar o mediador y notas. Cada evento: **Unirse**, **Google Calendar**, Editar, Borrar (dos toques). Al agendar una mediación ofrece pasar el caso a "En mediación" (y completa `fecha_mediacion`). Queda un movimiento en la bitácora ("Se agendó mediación para el 24/9/2026 a las 10:00"). Los pasados quedan plegados.
*   **Hoy → "Agenda"** (`dashboard/AgendaHoy.jsx`, arriba a la derecha): eventos de los próximos 14 días de todos los casos ("Hoy 10:00" resaltado, "Mañana 10:00", "Lun 28 sep 09:30"), con Unirse y + Google Calendar; tocar abre el caso. Se actualiza sola al agendar/editar/borrar. Si la tabla no existe, la tarjeta no aparece.
*   **Google Calendar:** botón que abre Google Calendar con el evento completo (título "Mediación · ASEGURADO vs COMPAÑÍA", horario en zona Argentina, link, patente, siniestro, notas y lugar) para guardarlo con un toque; el aviso lo da Google con la notificación predeterminada de tu calendario. (`utils/agenda.js`)

### 2026-09-23 — Etapa 13: Estadísticas de PAS, PAS dormidos y resumen del mes (✅ publicada, PR #15)
*   **`utils/estadisticasPas.js`**: por PAS, a partir de sus casos: total / en curso / cobrados / desistidos, **% desistidos**, **% éxito** (cobrados sobre los ya cerrados), **ritmo** (mediana de días entre derivaciones, desde 3 casos), días desde el último caso, **días promedio hasta cobrar** (derivación → cobro), **cobro promedio del asegurado**, **tus honorarios** (neto) y **comisión pagada**, **compañías más frecuentes** (top 3), **tendencia** (casos de los últimos 6 meses vs los 6 anteriores), cliente desde.
*   **Clientes:** nuevas columnas **Desistidos (%)** y **Ritmo** ("cada 30 d · hace 5 d", con etiqueta **Dormido**), ordenables. En la fila desplegada, grilla con las estadísticas + "Cliente desde… · Compañías…".
*   **PAS dormido:** un PAS cliente con ritmo calculado que pasó **el doble de su ritmo (mínimo 45 días)** sin derivar. Aparece en **Para hacer** ("Te derivaba cada ~30 d · último caso hace 75 d") con botón **Escribirle** (WhatsApp con un mensaje para retomar contacto); tocarlo lleva a Clientes con ese PAS abierto.
*   **F7 · Resumen del mes** (`clientes/ResumenMensual.jsx`): botón en la fila desplegada del PAS. Elegís este mes o el anterior; arma el texto (casos nuevos, cobrados con su comisión, cómo va cada caso en curso, comisión cobrada en el año, agradecimiento), editable, con **Enviar por WhatsApp** y **Copiar**. El saludo usa `primerNombre` (segunda palabra del nombre del PAS).
*   Los links de WhatsApp de Clientes usan la misma normalización de teléfonos que el resto (54 9 …).

### 2026-09-23 — Etapa 12: Buscador rápido + reclamos quietos (✅ publicada, PR #14)
*   **F2 · Buscador** (`BuscadorGlobal.jsx`): **Ctrl/Cmd + K** desde cualquier pantalla, botón "Buscar" arriba del menú lateral y lupa flotante en celular (arriba a la derecha; los encabezados de las pestañas dejan lugar). Busca **casos** (asegurado, patente, DNI, n.º de siniestro sin importar espacios/puntos, compañía, PAS; activos primero, hasta 8) y **PAS** (nombre, mail, teléfono; primero los cargados en la app y los clientes, y desde 3 letras también los ~51 mil contactos de la base). Teclado ↑ ↓ Enter Esc. Caso → abre la ficha; PAS cliente → Clientes con ese PAS abierto; otro PAS → "Registrar contacto". En celular ocupa toda la pantalla.
*   **F3 · Reclamos quietos** (`metricas.plazosRespuesta` / `reclamosQuietos`): casos en estado **Reclamado** cuyo último reclamo (`fecha_ultimo_reclamo` → `fecha_reclamo` → `fecha_inicio_reclamo` → último movimiento) supera lo que **esa compañía suele tardar** en ofrecer (promedio inicio de reclamo → ofrecimiento, con al menos 2 casos; si no, 30 días; mínimo 10). Aparecen en **Para hacer** como "Reclamo quieto" (vencido desde el día en que se pasó del promedio), salvo que el caso ya tenga una próxima acción con plazo vigente. Botón **Reiteré hoy**: agrega "Se reiteró el reclamo a X" en la bitácora y pone `fecha_ultimo_reclamo` y último movimiento = hoy (reinicia la cuenta).
*   El detalle de las tareas ahora puede ocupar hasta 3 líneas.
*   Pendiente posible: ajustar el margen por compañía a mano.

### 2026-09-23 — Etapa 11: Nuevos del portal + mensajes con un toque + nombres en los mails (✅ publicada, PR #13; SQL 09 ejecutado: 2 de 95 casos con teléfono)
*   **SQL `2026-09-23_09_bandeja_y_mensajes.sql`** (correr ANTES de publicar): columnas `origen` ('portal' | 'estudio'), `revisado_en` y `telefono_asegurado`; copia a `telefono_asegurado` el `tercero_contacto` de los casos sin tercero cargado.
*   **F5 · Bandeja "Nuevos del portal"** (`dashboard/NuevosPortal.jsx`, arriba de todo en Hoy): casos con `origen = 'portal'` y sin `revisado_en`, del más nuevo al más viejo, con "derivado hace N h". Botones: WhatsApp de primer contacto (si hay teléfono), **Ya lo contacté** (guarda `revisado_en` + `fecha_contacto_asegurado` = hoy) y **Abrir**. Abrir la ficha de un caso nuevo del portal (desde cualquier lado, `CasoOverlay`) lo marca revisado (`storage.marcarRevisado`). Solo aparece si hay alguno.
*   **Casos nuevos en vivo:** `App` escucha los INSERT de `pas_casos` (Realtime) y los suma a memoria sin recargar.
*   **Portal:** al derivar guarda `origen = 'portal'` y el teléfono en `telefono_asegurado` (antes `tercero_contacto`). La tarjeta del caso muestra "✓ El estudio tomó el caso el dd/mm" o "Recibido · el estudio todavía no lo abrió". Los casos creados desde Clientes quedan `origen = 'estudio'` y revisados.
*   **F1 · Avisar por WhatsApp** (`caso/AvisarWhatsApp.jsx` + `utils/mensajes.js`), en la fila desplegable de Casos y en Resumen de la ficha: al cliente (primer contacto, pedir documentación, reclamo presentado, llegó un ofrecimiento, acuerdo firmado, pago acreditado, link para seguir el caso) o al PAS (ya tomé el caso, novedad según el estado). Sugiere la plantilla según el estado; el texto se puede editar; abre `wa.me`. Opción "Usar también como mensaje del estudio" (guarda el cuerpo sin saludo ni firma en `mensaje_cliente`; se desactiva si editaste el texto). Si falta el teléfono del asegurado se carga ahí mismo (ofrece el `tercero_contacto` si parece un teléfono). Teléfonos normalizados a formato celular argentino (54 9 …, sin 0 ni 15).
*   Campo **Teléfono del asegurado** en Datos de la ficha.
*   **Nombres:** los asegurados se cargan como "APELLIDO NOMBRE"; el saludo de WhatsApp y el "Hola, …" de la vista del cliente usan la **segunda palabra** (`primerNombre`, con mayúscula inicial).
*   **Mails de derivación / documentación:** cada archivo aparece con su **nombre original** (`📎 DNI frente.jpg` + link) y se guarda en Storage con ese nombre (sin tildes ni símbolos); los que no se pudieron subir aparecen como "⚠️ No se pudo subir".

### 2026-09-23 — Propuesta de funcionalidades nuevas (en charla)
*   Propuesta visual: https://claude.ai/artifact/XLFaQMEZxqakvkrKsid99B (F1–F10).
*   **Elegidas por el usuario:** F1 Mensajes con un toque · F2 Buscador rápido · F3 Reclamos quietos por compañía · F4 El cliente sube su documentación (pensarla bien) · F5 Bandeja "Nuevos del portal" ("re necesario") · F7 Resumen del mes para cada PAS · F8 Agenda en el calendario (mediaciones y fechas importantes: "clave") · F9 PAS dormidos + **estadísticas por PAS** (cada cuánto deriva, % desistidos, etc.) · F10 Carga desde la denuncia con IA (pidió más explicación). Descartada: F6.
*   Pedido extra: que los mails de derivación muestren el **nombre del archivo** en vez del link pelado de Supabase.
*   **Plan confirmado:** Etapa 11 = F5 + F1 + nombres en los mails · 12 = F2 + F3 · 13 = F9 estadísticas + F7 · 14 = F8 · 15 = F4.
*   **F8 (decisión):** poder cargar en el caso la **mediación con link, fecha y hora**, que aparezca como recordatorio en PAS Tracker y en Google Calendar (botón "Agregar a Google Calendar" por evento).
*   **F4:** el usuario duda (los clientes probablemente sigan usando WhatsApp) pero le parece prolijo tenerlo; va al final. Idea: Supabase como "buzón de paso" que la app baja a la carpeta local y borra.
*   **F10:** descartado por ahora (no quiere pagar APIs de IA); no dejar estructura.

### 2026-09-23 — Etapa 10: Clientes en tabla + archivos seguros + limpieza de la base (✅ publicada, PR #11; SQL 07 y 08 ejecutados)
*   **`TabClientes` reescrito** como tabla de PAS clientes (derivadores + manuales): columnas PAS, En curso, Cobrados, Mis honorarios (neto de comisión, casos cobrados), Último caso; ordenables; buscador. Fila desplegable con mail, teléfonos (WhatsApp), "Editar PAS" (manuales), **"Nuevo caso"** y la lista de sus casos (activos primero); tocar un caso abre la ficha (`CasoOverlay`). En celular, filas de dos líneas.
*   **Fin del guardado masivo de casos:** el alta de caso desde Clientes inserta solo ese caso y abre su ficha; borrar un caso en Casos borra solo ese caso. `App.handleSaveCasos` y `handleDeletePasManual` se eliminaron; `handleCasoLocal` ahora también agrega casos nuevos y hay `handleQuitarCaso`. (`saveStorage("pas_casos")` queda solo para restaurar un backup.)
*   `monto_reclamado` se guarda como número desde la fila desplegable; `CampoMonto` redondea montos con decimales que vengan de la base.
*   **SQL `2026-09-23_07_storage.sql`:** bucket `casos` pasa a **privado** (solo administrador); `adjuntos` sigue público para que anden los links de los mails, pero cada PAS solo puede **subir** a su carpeta `<pas_id>/` y nadie más que el administrador puede listar, modificar o borrar. Borra las políticas anteriores de Storage.
    *   ✅ Ejecutado el 23/09. **Solo existe el bucket `adjuntos`**: `casos` no existe. **Decisión del usuario:** los documentos de los casos se guardan solo en la PC (carpeta local vinculada desde la ficha), para no pagar espacio en la nube. El código que intenta copiar a `casos` en Supabase falla sin avisar; queda para limpiar. Idea sin costo: poner las carpetas de casos dentro de la carpeta de Google Drive para escritorio y así quedan respaldadas en la nube.
*   **SQL `2026-09-23_08_limpieza.sql`** (en 4 pasos A–D; la versión en un solo bloque falló en el editor de Supabase con `relation "public" does not exist` y no aplicó nada): borra `dominio`, `compania` y el trigger puente; convierte `monto_reclamado` a `numeric` (entiende 800000, 800.000, 800.000,50, etc.; si hay un valor raro, frena y lo muestra); devuelve el esquema para regenerar `schema.sql`.
    *   ✅ Ejecutado el 23/09 (pasos A–C): `dominio`, `compania` y el trigger puente borrados; `monto_reclamado` ahora es `numeric` (no había valores raros).
*   **`schema.sql` regenerado** desde `information_schema` de producción (columnas, tipos y defaults reales; sin claves ni índices). Nota: el editor de Supabase muestra como máximo 100 filas por resultado.
*   **Deuda técnica que queda** (anotada en `schema.sql` con ⚠): `pas_casos.fecha_siniestro`, `fecha_derivacion`, `fecha_contacto_asegurado`, `fecha_inicio_reclamo`, `fecha_ultimo_movimiento` y `pas_historial.fecha` son **texto** en vez de `date`; `pas_contactos.id` es texto y el resto de los `pas_id` son `integer`; el teléfono del asegurado que carga el portal va a `tercero_contacto`; `notas_log` y `recordatorio` sin uso; tablas `aseguradoras`, `casos` y `gestiones_judiciales` sin uso. Código que intenta usar el bucket `casos` (no existe) en `utils/carpeta.js` y `utils/categorizarArchivo.js`.

### 2026-09-23 — Etapa 9: Acceso seguro + RLS (✅ publicada, PR #9; SQL 05 y 06 ejecutados)
*   **Entrada a la app en dos pasos** (`LoginGate.jsx`): (1) **una vez por navegador**, mail + contraseña de la cuenta de Supabase Auth (`atglexsolutions@gmail.com`); la sesión queda guardada en el navegador. (2) Cada vez que abrís la app en una pestaña nueva, el **PIN 3934** de siempre. A los **5 PIN incorrectos** se cierra la sesión y vuelve a pedir contraseña. Solo entran las cuentas de la tabla `pas_admins` (función `es_admin()`).
*   **Los datos se cargan recién después de entrar** (`App` → `LoginGate` → `AppPrincipal`); antes se descargaba todo aunque no pusieras el PIN.
*   Menú "Apariencia y backup" / "Más": **Cerrar sesión** (en este navegador).
*   `TabPortalUsuarios`: el alta de usuarios del portal usa un cliente aparte (sin guardar sesión) para no reemplazar tu sesión de administrador.
*   Portal PAS: "Plazos por compañía" ahora sale de la función `plazos_companias()` (solo compañía, fechas y montos; sin nombres ni patentes), porque con RLS un PAS ya no puede leer casos ajenos.
*   **SQL:** `sql/2026-09-23_05_admin_y_funciones.sql` (paso 1: tabla `pas_admins`, funciones `es_admin`, `mi_pas_id`, `plazos_companias`; no cambia permisos) y `sql/2026-09-23_06_activar_rls.sql` (paso 2: **RLS en todas las tablas** de `public`, borra políticas viejas; administrador puede todo; cada PAS ve y deriva solo sus casos, ve los movimientos de sus casos, su usuario y su ficha de `pas_lista`). Al final del 06 está el script para volver atrás.
*   **Orden:** correr 05 → probar la preview → publicar → entrar con mail y contraseña en cada navegador (Chrome y celular) → recién ahí correr 06.
*   **RLS activo desde el 23/09** en las 15 tablas de `public` (incluye `aseguradoras`, `casos` y `gestiones_judiciales`, que la app no usa y quedaron solo para el administrador). El esquema `backup_20260922` no se expone por la API.
*   Nota honesta: el PIN sigue estando en el código (es un bloqueo rápido); la seguridad real la da la cuenta + RLS. **Pendiente:** revisar los permisos de Storage (buckets `casos` y `adjuntos`).

### 2026-09-23 — Etapa 8: Vista del cliente (✅ publicada, PR #8)
*   **`PortalCliente` reescrito** (`/?vista=cliente`): encabezado ATG Lex Solutions; el cliente entra con **patente + últimos 3 números del DNI**; ve "Hola, {nombre}", la compañía, una **línea de tiempo de 5 pasos** en palabras simples (con fecha de cada paso y una explicación de qué está pasando ahora según el estado), el **mensaje del estudio con su fecha** y firma, el ofrecimiento / lo que va a cobrar, y un botón de **WhatsApp** a +54 9 11 3313-3259 con el mensaje ya escrito (incluye la patente). Pensado para celular; modo oscuro según el sistema.
*   **Seguridad:** la vista ya no lee la tabla `pas_casos` directamente. Usa la función `consultar_caso_cliente(patente, dni)` (`sql/2026-09-23_04_acceso_cliente.sql`, *security definer*) que solo devuelve los campos que ve el cliente y solo si patente y DNI coinciden. Tras **5 intentos fallidos en 15 minutos** para una patente, se bloquea un rato (tabla `pas_cliente_intentos`). Los links viejos `?caso=<id>` ya no muestran el caso: piden patente y DNI.
*   Nueva columna `pas_casos.mensaje_cliente_fecha`, que un trigger completa solo cada vez que cambia el mensaje al cliente. Los mensajes anteriores quedan sin fecha.
*   **Ficha del caso:** campo **DNI del asegurado** en Datos (antes no se podía editar); en Resumen, botón **"Copiar link del cliente"** (`/?vista=cliente&patente=…`) y aviso si falta el DNI. El modal "Generar escrito" completa el DNI solo y, si el caso no lo tenía, lo guarda.
*   **SQL `2026-09-23_04` ejecutado** (23/09; hubo que cambiar `$$` por `$fn$` porque el editor de Supabase cortaba la función). Resultado: **43 casos en curso sin DNI**.
*   **Para cargarlos rápido:** en Casos, chip **"Sin DNI"** (casos en curso sin al menos 3 números de DNI) y campo **DNI del asegurado** en la fila desplegable, con guardado automático.
*   **Escrito con DNI con puntos:** el DNI se carga sin puntos (38554155) y en el escrito sale `38.554.155` (7 dígitos: `5.123.456`); si no tiene 7 u 8 números queda como se escribió (`generarEscrito.formatearDni`).
*   ~~Nota: mientras RLS siga apagado…~~ Resuelto en la etapa 9 (RLS activo).

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

# Análisis: las 10 funciones de los softwares jurídicos vs. ATG Lex

> Fecha: 2026-09-29 · Base: la charla con Gemini (Lex-Doctor, IUSNET, LegalSurf, Legal One) cruzada con el código actual de ATG Lex.
> Plan de ejecución: [`PLAN.md`](PLAN.md) · Esquemas SQL probados: [`sql/`](sql/) · Presentación visual: [`presentacion.html`](presentacion.html)

## 0. Punto de partida: cómo es tu trabajo diario (lo que dice la app)

La lista de Gemini está pensada para un **estudio litigante con varios abogados y cientos de juicios**. Tu práctica es otra, y eso cambia todo el orden:

| Rasgo | Lo que se ve en ATG Lex | Consecuencia para elegir funciones |
|---|---|---|
| **Núcleo: reclamos de terceros ante aseguradoras** | ~95 casos PAS en `pas_casos`, 9 estados de `doc_pendiente` a `cobrado`, métricas por compañía | Lo que más rinde es lo **extrajudicial y repetitivo**: cartas, pedidos de respuesta, reiteraciones, aceptaciones, intimaciones |
| **Pocos juicios** | 10–15 expedientes (etapa 4 del plan, Agenda Legal absorbida) | La sincronización con PJN/MEV rinde poco: revisar 15 causas a mano es un rato |
| **Un solo abogado** | `pas_admins`, un PIN, un usuario | La auditoría "quién borró qué" entre colegas no aplica; sí sirve como **red de seguridad** contra tus propios pisados (autoguardado) |
| **Tres públicos** | Estudio, portal PAS, vista del cliente | Ya tenés la "extranet" que Gemini pone como diferencial; falta completarla |
| **PC + celular** | PWA, push funcionando, resumen diario 9 hs | El calendario en el celular y los avisos pesan mucho |
| **Sin presupuesto para APIs pagas** | IA descartada por costo (F10), planes gratis de Supabase / Vercel / EmailJS | Todo lo que implique scraping en servidor, OCR en la nube o APIs pagas queda muy abajo |

**Conclusión de entrada:** de las 10 funciones, **4 ya están hechas en buena medida** (Kanban, motor de plazos, calculadora de intereses, portal) y **las que faltan que más te sirven son las que automatizan lo que escribís y lo que no te podés olvidar** (escritos, plazos que se arman solos, calendario en el celular).

---

## 1. Función por función

Escala: **Utilidad** para tu trabajo diario y **Complejidad** de implementarla en tu stack, de 1 (baja) a 5 (alta).

### 1. Sincronización automática con PJN / MEV

- **Qué tenés hoy:** nada automático. En `Context.md` figura como "Algo básico con PJN / MEV (no prioritario)". Los expedientes tienen `juzgado`, `numero`, `jurisdiccion`.
- **Utilidad: 2/5.** Con 10–15 expedientes, revisar la MEV y el PJN te lleva ~10–15 minutos por día. El riesgo real (perder una notificación) ya se cubre porque las notificaciones electrónicas llegan a tu casilla oficial y porque el motor de plazos existe. La "bandeja matutina" de IUSNET es buena idea **como forma de trabajo**, no necesariamente con scraping.
- **Complejidad: 5/5.**
  - PJN y MEV no tienen API pública: habría que hacer *scraping* con tu usuario y clave (CUIT + contraseña / certificado), guardarlos cifrados y mantener un robot que se rompe cada vez que cambian el HTML.
  - Captchas, límites de sesión, y posibles problemas con los términos de uso de los portales.
  - Las Edge Functions de Supabase no corren un navegador (Playwright): haría falta un servidor aparte o GitHub Actions con un navegador, con tus credenciales ahí.
  - Si el robot falla en silencio, creés que no hubo novedades cuando sí las hubo: **es peor que no tenerlo**.
- **Cómo lo haría (versión liviana):** bandeja de **novedades** donde pegás el texto del despacho o la cédula (o, más adelante, se cargan solas desde los mails de aviso que lleguen a Gmail, si tu casilla los manda), con "Integrar" (va a la Bitácora y, si corresponde, arma el plazo con el catálogo de la función 4) o "Descartar". Más un botón "Abrir en MEV/PJN" por expediente. SQL listo: [`sql/37_novedades_judiciales.sql`](sql/37_novedades_judiciales.sql).
- **Prioridad: 10.ª — No hacer el scraping. La bandeja liviana, solo si con el uso sentís que la necesitás.**

### 2. Motor de automatización documental (plantillas con variables)

- **Qué tenés hoy:**
  - `utils/generarEscrito.js`: **un solo** escrito (Reclamo extrajudicial) con el texto **fijo en el código**, incluidos tus datos (matrícula, CUIT, domicilio). Lo usan la ficha del caso y el portal PAS (`ModalGenerarEscrito.jsx`).
  - `utils/cartaDocumento.js`: modelos de carta documento con variables `{siniestro}`, `{patente}`… y la tabla `modelos_carta` para modelos propios. **Es la semilla del motor**, pero limitada al formulario de Correo Argentino (15 renglones).
  - `pas_companias`: razón social, CUIT y domicilio de cada compañía (el SQL 30 ya los centraliza).
- **Utilidad: 5/5.** Es la función que más horas te devuelve. Cada caso PAS pasa por varios escritos casi idénticos: reclamo, pedido de respuesta (ventana de 7–14 días), reiteración, reconsideración del ofrecimiento, aceptación, intimación por pago incumplido, nota al cliente, pedido de mediación. Con ~95 casos, son cientos de escritos por año que hoy se arman copiando y pegando.
- **Complejidad: 2/5.** Todo en el navegador, con lo que ya usás (jsPDF). Lo delicado: el armado del texto (negritas, listas, justificado) y los montos en letras. **El motor ya quedó escrito y probado** en [`codigo/plantillas.js`](codigo/plantillas.js) (números a letras, variables del caso/compañía/expediente/estudio, preguntas al generar, bloques condicionales) con [`codigo/plantillas.test.mjs`](codigo/plantillas.test.mjs).
- **Cómo:**
  - Tabla `modelos_escrito` (tus plantillas, editables desde **Herramientas → Modelos**) + `escritos_generados` (historial). Tus datos pasan a `pas_ajustes` → `estudio`. SQL: [`sql/32_modelos_escrito.sql`](sql/32_modelos_escrito.sql), con **9 modelos base** precargados.
  - Sintaxis simple: `{{asegurado}}`, `{{compania.razon_social}}`, `{{monto_acordado_letras}}`, `{{? monto_aceptado | Monto aceptado | monto}}` (pregunta al generar), `{{#si nro_siniestro}}…{{/si}}`.
  - Desde la ficha, el click derecho o el tablero: **"Generar escrito…"** → elegir modelo → contestar preguntas → vista previa **editable** → PDF, Word (.docx) o copiar texto → se guarda en la carpeta del caso y queda en la Bitácora.
  - Gemini sugiere `pdfmake` o `@react-pdf/renderer`: **no hace falta** sumar otra librería, jsPDF ya está y funciona. Para Word, la librería `docx` con `await import()` (solo se baja al usarla).
- **Prioridad: 1.ª**

### 3. Calculadora de actualización monetaria integrada

- **Qué tenés hoy:** `Herramientas → Intereses y actualización` (`utils/intereses.js`, `utils/indices.js`, tabla `indices`): tasa activa BNA, IPC, IPC + 3 %, ICL, con detalle y "Copiar texto". IPC e ICL se actualizan desde internet con un botón; la tasa activa se carga a mano.
- **Utilidad: 3/5.** Ya cubre lo principal. Lo que falta es lo que Gemini marca como "la clave": **que el resultado entre al escrito** sin copiar y pegar, y que los índices se actualicen solos.
- **Complejidad: 2/5.** Guardar el resultado en una tabla `liquidaciones` y exponerlo como variable `{{liquidacion}}` en el motor de escritos. Actualización automática: un cron mensual que llame a las mismas APIs (ArgentinaDatos, BCRA). Sumar tasa pasiva BCRA solo si la usás.
- **Cómo:** botón **"Guardar en el caso"** en la calculadora → `liquidaciones` ([`sql/36_finanzas_caso.sql`](sql/36_finanzas_caso.sql)) → el modelo "Nota al cliente con la liquidación" o cualquier escrito la inserta.
- **Prioridad: 7.ª** (sale casi gratis una vez hecho el motor de escritos).

### 4. Agenda condicionada y motor de plazos procesales

- **Qué tenés hoy (bastante):** `utils/plazos.js` (hábiles judiciales, corridos, gracia, días salteados), `utils/calendarioJudicial.js` (feriados de la API + `dias_inhabiles` por jurisdicción), tabla `plazos` (de caso o expediente, fatal/ordinatorio/propio), chips de vencimiento, Hoy unificado, y en los casos PAS `flujoEstados.accionSugerida` (al cambiar de estado propone la próxima acción con fecha). Push diario a las 9 hs.
- **Lo que falta:**
  1. **El "condicionado":** hoy cargás "15 días hábiles" a mano. Falta el catálogo "qué pasó → qué plazo nace" (notificación de traslado → contestar en 15 días; sentencia → apelar en 5; …) y la cadena (apelación cumplida → sugerir expresión de agravios).
  2. **El aviso de plazos:** el resumen diario de la función `notificar` cuenta tareas, pagos, agenda y portal, **pero no mira la tabla `plazos`**. Un plazo fatal de expediente hoy no te llega al celular.
- **Utilidad: 5/5.** Un plazo fatal perdido es el peor error posible; y en los casos PAS, controlar los plazos **de la compañía** (art. 56 y 49 de la Ley 17.418, intimaciones) te da argumentos y te dice cuándo apretar.
- **Complejidad: 2/5.** El motor está; es un catálogo (tabla), un selector en la pestaña Plazos y unas líneas en `notificar`.
- **Cómo:** tabla `tipos_plazo` con 23 actuaciones precargadas (CPCCN, CPCCBA, laboral CABA y seguros), cada una con su norma y **"Revisar norma" hasta que la confirmes** (`verificado = false`); vista `plazos_para_avisar` para el push. SQL: [`sql/33_plazos_condicionados.sql`](sql/33_plazos_condicionados.sql). El mail (Resend/SendGrid, como sugiere Gemini) **no hace falta al principio**: el push ya funciona y es gratis. Si querés redundancia, Resend gratis alcanza (a tu propio mail).
- **Prioridad: 2.ª**

### 5. Tablero Kanban para el estado de las causas

- **Qué tenés hoy: ya está.** `ui/TableroEtapas.jsx` en Casos PAS y Expedientes, con arrastrar y "Mover a" en el menú, y al cambiar de estado: fecha de la etapa (`fechasAlCambiarEstado`), nota en la Bitácora, próxima acción sugerida, sugerencia de avisar al cliente. Es exactamente lo que Gemini propone ("modificar el campo `status` al dropear" y "disparadores de tareas").
- **Utilidad adicional: 2/5.** Mejoras chicas: días en la etapa en cada tarjeta (el dato existe: "Tiempos exactos por estado"), total de montos por columna, filtro por compañía, y que mover a Expedientes → "Sentenciado" ofrezca crear el plazo de apelación (usa la función 4).
- **Complejidad: 1/5.**
- **Prioridad: 8.ª** (pulido; hacerlo de paso cuando se toque el tablero).

### 6. Integración de calendario (Google Calendar)

- **Qué tenés hoy:** `utils/agenda.js → linkGoogleCalendar`: un botón por evento que abre Google Calendar **para guardarlo a mano**. Es de una vía y manual: si cambiás la fecha en ATG Lex, Google queda viejo. Los plazos procesales no van al calendario.
- **Utilidad: 4/5.** Ver en el calendario del celular las mediaciones, audiencias y vencimientos sin entrar a la app es de uso diario.
- **Complejidad:** depende del camino:
  - **Calendario suscribible (.ics): 2/5.** Una Edge Function devuelve un archivo iCalendar con todo (eventos + plazos + opcionalmente próximas acciones); Google Calendar se suscribe a la URL una sola vez y se actualiza solo. Sin OAuth, sin claves de Google. **Contras:** Google refresca los calendarios suscriptos cada 8–24 h (lo urgente del día ya te llega por push) y es de una vía (lo que edites en Google no vuelve).
  - **API de Google Calendar bidireccional: 4/5.** OAuth con verificación de la app en Google, tokens que se renuevan, canales de *webhook* que vencen, resolver conflictos de edición en dos lados. Mucho trabajo y mantenimiento para un solo usuario.
- **Cómo:** [`sql/34_calendario.sql`](sql/34_calendario.sql) (token secreto regenerable) + [`funciones/calendario.ts`](funciones/calendario.ts) (función lista para desplegar). Cada evento trae el link que abre la ficha en ATG Lex.
- **Prioridad: 3.ª** (el .ics). La API bidireccional: **no**.

### 7. Extracción de texto de PDFs y OCR (buscador "Google interno")

- **Qué tenés hoy:** buscador Ctrl+K sobre datos (asegurado, patente, DNI, siniestro, compañía, PAS). Los archivos viven en **la carpeta local** de cada caso (File System Access), **no en la nube**: esto es clave, porque un servidor no los puede indexar.
- **Utilidad: 2/5.** En reclamos de seguros los documentos son pocos y predecibles (DNI, cédula, denuncia, fotos, presupuesto) y los datos importantes ya están en la ficha. En expedientes de miles de fojas (el caso de Legal One) sí rinde; no es tu volumen.
- **Complejidad: 4/5.** El texto de los PDF digitales se saca fácil con pdf.js (ya lo tenés). El OCR de fotos y escaneos en el navegador (tesseract.js) pesa varios MB, es lento en el celular y hay que re-indexar cuando cambia la carpeta. Guardar el texto en Supabase implica datos sensibles (DNI, datos médicos) en una tabla más.
- **Cómo (si algún día):** "Indexar carpeta" en la ficha → texto a `documentos_texto` con búsqueda en español (`tsvector`) → resultados en Ctrl+K con el fragmento resaltado. SQL probado: [`sql/38_indice_documentos.sql`](sql/38_indice_documentos.sql). **Variante más útil y barata:** "Detectar datos" en la denuncia PDF (patente, n.° de siniestro, póliza, fecha) con expresiones regulares, para completar la ficha.
- **Prioridad: 9.ª**

### 8. Finanzas y honorarios por expediente

- **Qué tenés hoy:** honorarios por caso (%, monto, estado, factura con número, cobro), comisión del PAS, pestaña **Finanzas** (gastos del estudio con categoría y opcionalmente `caso_id` / `expediente_id`, facturación, resultado del mes) y **Análisis** (flujo de caja, por compañía, por PAS).
- **Lo que falta:** el **resultado de cada caso** (honorarios − comisión − gastos del caso) y los **gastos a recuperar** (mediación, sellados, cartas que pagás vos y después se cobran al cliente, a la compañía o en costas). Con eso, Análisis puede mostrar rentabilidad real por compañía y por PAS, y cuánto tarda cada peso en entrar.
- **Utilidad: 3/5.** El "tiempo invertido vs. honorarios" de Legal One **no aplica**: cobrás por resultado, no por hora. Registrar horas sería trabajo extra sin retorno.
- **Complejidad: 1/5.** Tres columnas en `gastos`, una vista y una tarjeta en la pestaña Montos. SQL: [`sql/36_finanzas_caso.sql`](sql/36_finanzas_caso.sql).
- **Prioridad: 6.ª**

### 9. Portal segregado para clientes (extranet)

- **Qué tenés hoy (más que el promedio):** portal PAS completo (derivar, adjuntar, ver avance, generar el reclamo para firmar) y vista del cliente por patente + DNI (línea de tiempo, mensaje del estudio, montos, subir documentación, próxima mediación, WhatsApp).
- **Lo que falta:**
  1. Lo que Gemini destaca de LegalSurf: **tildar qué movimientos ve el cliente**. Hoy el cliente ve un solo "mensaje del estudio" que se pisa; con movimientos visibles ve la historia ("12/10 Presentamos el reclamo", "03/11 Sancor ofreció…").
  2. **Etapa 7 del plan ATG Lex:** la vista del cliente para **expedientes** (DNI + código). El interruptor "Visible para el cliente" ya existe en la ficha, falta la consulta segura y la pantalla.
  3. Avisar al cliente que hay novedad: con el botón de WhatsApp que ya tenés alcanza; el mail automático depende de resolver EmailJS.
- **Utilidad: 4/5.** Cada "¿cómo va lo mío?" que no llega por WhatsApp es tiempo tuyo. En `Context.md` quedó anotado que la vista del cliente todavía se usó poco: los movimientos visibles la hacen más útil que el WhatsApp.
- **Complejidad: 3/5.** Funciones `security definer` como las que ya existen (`consultar_caso_cliente`), con freno por intentos. SQL probado: [`sql/35_portal_movimientos.sql`](sql/35_portal_movimientos.sql).
- **Prioridad: 4.ª**

### 10. Bitácora de eventos y trazabilidad (audit trail)

- **Qué tenés hoy:** `acciones` (Bitácora) con lo que vos o la app anotan (cambios de estado, reiteraciones, plazos cumplidos), `pas_papelera` con "Deshacer" y 30 días de recuperación, backup semanal. **No** hay registro automático de **cambios de datos** (quién cambió el monto, cuándo, de cuánto a cuánto).
- **Utilidad: 3/5.** No por "quién fue de los abogados", sino como **red de seguridad**: el autoguardado (2,5 s) manda el caso entero; si una pestaña vieja abierta pisa un monto o una fecha, hoy no hay forma de saber el valor anterior. También registra lo que hacen los PAS desde el portal.
- **Complejidad: 1/5.** Un solo SQL con un *trigger* genérico que guarda solo los campos que cambiaron (un guardado sin cambios no deja rastro), solo lectura para la app. SQL probado: [`sql/31_auditoria.sql`](sql/31_auditoria.sql).
- **Prioridad: 5.ª en utilidad, pero 1.ª en ejecución**: es lo más barato y conviene tenerlo **antes** de sumar automatizaciones que escriben datos solas (plazos, escritos).

---

## 2. Orden de prioridad (utilidad para tu trabajo)

| # | Función | Utilidad | Complejidad | Estado hoy | Decisión |
|---|---|:-:|:-:|---|---|
| 1 | Escritos con plantillas (2) | 5 | 2 | 1 escrito fijo + cartas | **Sumar ya** |
| 2 | Plazos condicionados + aviso de plazos (4) | 5 | 2 | Motor hecho, sin catálogo ni aviso | **Sumar ya** |
| 3 | Calendario suscribible .ics (6) | 4 | 2 | Link manual a Google | **Sumar ya** |
| 4 | Movimientos visibles + portal de expedientes (9) | 4 | 3 | Portal PAS y cliente hechos | **Sumar después** (etapa 7) |
| 5 | Auditoría de cambios (10) | 3 | 1 | Bitácora manual + papelera | **Sumar ya (primero)** |
| 6 | Resultado por caso y gastos a recuperar (8) | 3 | 1 | Finanzas del estudio hechas | **Sumar después** |
| 7 | Liquidación dentro del escrito (3) | 3 | 2 | Calculadora hecha | **Sumar después** (con el 1) |
| 8 | Pulido del Kanban (5) | 2 | 1 | **Hecho** | De paso |
| 9 | Búsqueda en documentos / OCR (7) | 2 | 4 | No | Solo si aparece la necesidad |
| 10 | PJN / MEV (1) | 2 | 5 | No | **No** (scraping). Bandeja manual opcional |

**Orden de ejecución recomendado** (mezcla utilidad, dependencias y riesgo):
**0) preparación → 1) auditoría → 2) escritos → 3) plazos + avisos → 4) calendario → 5) portal → 6) finanzas + liquidaciones → 7) opcionales.**

Por qué este orden:
- La **auditoría** va primero porque es un solo SQL, no tiene pantalla obligatoria y protege todo lo que viene.
- **Escritos** antes que plazos: es lo que más horas devuelve y no depende de nada.
- **Plazos** antes que **calendario**: el calendario muestra los plazos; si el catálogo ya los arma solos, el calendario sale completo.
- **Portal** después: es lo más delicado en seguridad (acceso sin cuenta) y depende de que la Bitácora esté ordenada.
- **Liquidaciones** después de escritos: son una variable más del motor.

---

## 3. Complejidades y problemas a tener en cuenta

### Transversales
- **SQL a mano:** cada función trae su SQL (31 a 38) y hay que correrlo en el SQL Editor. La app tiene que funcionar **sin** el SQL corrido (avisar "Falta correr el SQL N", como ya hace la papelera). Siguen pendientes de confirmar los SQL 26 y 27.
- **RLS:** todo lo nuevo es `admin_todo` salvo lo que ve el cliente/PAS, que va por funciones `security definer` con validación y freno de intentos. Los modelos de escritos son solo del administrador: **el portal PAS debe seguir usando el reclamo actual** (o hay que habilitarle a los PAS leer ese modelo puntual).
- **Links directos a una ficha:** `?caso=` **ya lo usa la vista del cliente** (`App.jsx`, línea 42). Para el calendario hace falta otro parámetro (`?abrir=caso-ID`).
- **Plan gratis de Supabase:** 500 MB de base, 500 mil llamadas a funciones por mes, pg_cron disponible. Nada de lo planeado se acerca. La auditoría crece con el uso: queda con limpieza automática a 18 meses.
- **Pruebas:** la app pide cuenta + PIN y la carpeta local no se puede automatizar; como en las etapas anteriores, se prueba con Supabase simulado y Postgres local, y **el uso real lo confirmás vos**.

### Por función
| Función | Riesgos / problemas | Cómo se mitigan |
|---|---|---|
| Escritos | Formato del PDF (negrita en medio del párrafo, justificado); montos en letras mal escritos; modelos con variables mal tipeadas | Motor ya probado (números a letras incluidos); variables faltantes quedan como `[variable]` resaltadas y la vista previa es editable; selector de variables en el editor en vez de tipearlas |
| Escritos (Word) | La librería `docx` pesa ~100 KB | `await import()` solo al elegir Word |
| Plazos | **Días del catálogo mal cargados = plazo mal calculado** | Todos nacen "Revisar norma" (`verificado = false`); se muestran la norma y los días salteados; el cálculo queda editable |
| Plazos | Feria de invierno y asuetos no cargados | Ya existe `dias_inhabiles`; recordatorio en Rutina "Cargar la feria de julio" |
| Avisos | Push depende de que el celular tenga la suscripción activa | Ya probado; sumar el plazo al resumen y, si querés redundancia, mail con Resend |
| Calendario .ics | Google tarda 8–24 h en refrescar; la URL con token es un secreto | Lo urgente sale por push; token regenerable desde la app; la función no devuelve nada sin token válido |
| Calendario .ics | Alarmas de calendarios suscriptos: Google las ignora | Poner el aviso en el título ("⚠ Vence") y confiar en el push |
| Portal | Acceso sin cuenta = superficie de ataque | Mismo esquema que ya existe: DNI + código, 5 intentos cada 15 min, solo lo marcado como visible |
| Portal | Textos internos que se filtran al cliente | Movimientos **ocultos por defecto**; "texto para el cliente" aparte del interno |
| Auditoría | Volumen por el autoguardado | Solo guarda si cambió algo real; ignora columnas de ruido; limpieza a 18 meses |
| Finanzas | Duplicar lo que ya hay en Finanzas | Reusar `gastos` (ya tiene `caso_id`); solo columnas nuevas y una vista |
| OCR | Peso de tesseract.js, lentitud en celular, datos sensibles en la nube | Dejarlo para el final; solo PDF digitales primero; indexar solo en la PC |
| PJN/MEV | Scraping frágil, credenciales, términos de uso, fallas silenciosas | No hacerlo; bandeja manual |

---

## 4. Balance: qué conviene sumar y qué no

**Sumar (alto retorno, bajo costo, sin dependencias externas pagas):**
1. **Auditoría** — 1 SQL, protege todo.
2. **Motor de escritos** — la función que más tiempo te devuelve. Motor y SQL ya listos.
3. **Plazos condicionados + aviso de plazos** — cierra el agujero de que los plazos fatales no salen en el push.
4. **Calendario suscribible** — todo en el celular sin tocar Google a mano.

**Sumar en una segunda tanda:**
5. **Movimientos visibles + portal de expedientes** (etapa 7 que ya estaba planeada).
6. **Resultado por caso + gastos a recuperar** y **liquidaciones en los escritos**.
7. **Pulido del tablero** (días en etapa, totales por columna), de paso.

**No sumar (o solo si la realidad lo pide):**
- **Scraping de PJN/MEV** — costo y riesgo altísimos para 15 expedientes. Si hace falta, bandeja manual (SQL 37 listo).
- **Sincronización bidireccional con la API de Google Calendar** — el .ics cubre el 90 % sin OAuth.
- **OCR / buscador documental** — tu volumen no lo justifica hoy. Primero, si acaso, "Detectar datos" de la denuncia.
- **Registro de horas / rentabilidad por hora** — cobrás por resultado.
- **Editor de texto enriquecido tipo Word dentro de la app** — la vista previa editable + exportar a Word alcanza.
- **Otra librería de PDF** (pdfmake, react-pdf) — jsPDF ya está.
- **Mail automático de vencimientos con Resend/SendGrid** — el push ya funciona; sumarlo solo como redundancia.

**Recursos:** todo lo recomendado entra en los planes gratis que ya usás, no suma servicios nuevos (salvo, opcional, Resend) y se puede hacer en **~7–9 sesiones de trabajo** (detalle en `PLAN.md`).

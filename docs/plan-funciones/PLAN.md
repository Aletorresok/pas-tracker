# Plan de acción: funciones nuevas de ATG Lex

> Fecha: 2026-09-29 · Análisis y fundamentos: [`ANALISIS.md`](ANALISIS.md) · Presentación: [`presentacion.html`](presentacion.html)
> Estado: **CERRADO** (fases 0 a 6 y 7a hechas y publicadas en `main` el 29/09; la 7b se descartó). Ver el tablero de fases.

## Cómo retomar en la próxima sesión

1. Pedile a Claude: *"Leé `docs/plan-funciones/PLAN.md` y arrancá la fase N"*.
2. Cada fase: copiar el SQL de `docs/plan-funciones/sql/` a `sql/AAAA-MM-DD_NN_nombre.sql`, implementar las pantallas, probar, actualizar `Context.md` y `schema.sql`, commit y push.
3. **Vos** corrés el SQL en el SQL Editor de Supabase (cada uno termina con una consulta de **Control** que dice qué números tienen que salir). Cada archivo tiene **menos de 100 líneas** (al copiar desde el celular se cortó en la línea 100): si un borrador es más largo, se parte en 33, 33b…
4. Marcá abajo cada fase como hecha (`[x]`) para que la próxima sesión sepa dónde quedó.

## Qué hay en esta carpeta

```
docs/plan-funciones/
  ANALISIS.md                      — las 10 funciones: qué hay, utilidad, complejidad, prioridad y balance
  PLAN.md                          — este archivo
  presentacion.html                — cómo se vería cada cosa (abrir en el navegador)
  sql/                             — BORRADORES probados en Postgres 16 (dos corridas cada uno)
    31_auditoria.sql               — fase 1
    (32 ya está en sql/: 2026-09-29_32, _32b y _32c)
    (33 ya está en sql/: 2026-09-29_33)
    (34 ya está en sql/: 2026-09-29_34; la función en supabase/functions/calendario)
    (35 ya está en sql/: 2026-09-29_35)
    (36 ya está en sql/: 2026-09-29_36)
    37_novedades_judiciales.sql    — fase 7, opcional (bandeja PJN/MEV manual)
    38_indice_documentos.sql       — fase 7, opcional (búsqueda en el texto de los documentos)
  codigo/
    plantillas.test.mjs            — pruebas del motor (src/utils/plantillas.js): node docs/plan-funciones/codigo/plantillas.test.mjs
```

## Tablero de fases

| Fase | Qué | SQL | Sesiones | Estado |
|---|---|---|:-:|---|
| 0 | Preparación: datos del estudio, links directos, confirmar SQL 26/27 | — | ½ | [x] 29/09 (SQL 26 y 27 confirmados) |
| 1 | Auditoría de cambios | 31 | ½–1 | [x] 29/09 (SQL 31 corrido) |
| 2 | Motor de escritos con modelos | 32, 32b, 32c | 2 | [x] 29/09 (SQL corridos) |
| 3 | Plazos condicionados + aviso de plazos | 33 | 1–2 | [x] 29/09 (falta correr el SQL 33 y redesplegar notificar) |
| 4 | Calendario suscribible (.ics) | 34 | 1 | [x] 29/09 (falta correr el SQL 34 y desplegar calendario sin JWT) |
| 5 | Movimientos visibles + vista del cliente de expedientes (etapa 7) | 35 | 2 | [x] 29/09 (falta correr el SQL 35) |
| 6 | Resultado por caso, gastos a recuperar, liquidaciones en escritos | 36 | 1 | [x] 29/09 (falta correr el SQL 36) |
| 7 | Opcionales: bandeja de novedades judiciales (7a hecha), búsqueda en documentos (7b) | 37, 38 | 1–2 c/u | 7a [x] · 7b descartada |

---

## Fase 0 · Preparación (½ sesión)

**Objetivo:** dejar listas dos piezas que usan varias fases.

1. **Links directos a una ficha:** `App.jsx` hoy manda `?caso=` a la vista del cliente, así que se usa otro parámetro:
   - `/?abrir=caso-<uuid>` y `/?abrir=expediente-<uuid>` → después del login/PIN, abre la ficha (`CasoOverlay` o `FichaExpediente`) y limpia la URL con `history.replaceState`.
   - Dónde: `AppPrincipal` (ya maneja "ficha abierta desde el buscador"): leer el parámetro una vez que cargó `usePASData`.
   - Lo usan: el calendario (fase 4), las notificaciones push (`url` del aviso) y, a futuro, los mails.
2. **Datos del estudio** fuera del código: `generarEscrito.js` tiene fijos nombre, matrículas, CUIT y domicilio. En la fase 2 pasan a `pas_ajustes` → `estudio` (el SQL 32 los carga); en la fase 0 solo se agrega `utils/estudio.js` con `cargarEstudio()` / `guardarEstudio()` y un formulario en "Apariencia y backup" o Herramientas.
3. Confirmar si los **SQL 26 (papelera) y 27 (herramientas)** están corridos (pendiente en `Context.md`).

**Listo cuando:** abrir `/?abrir=caso-<id>` en el navegador entra a la ficha de ese caso después del PIN.

**Hecho (29/09):** `utils/enlaces.js` + `App.jsx` + `public/sw.js` (con la app abierta, la notificación manda el link por mensaje) + "Copiar link de la ficha" en el click derecho; `utils/estudio.js` + Herramientas → **Mis datos**; `generarEscrito.js` lee `cargarEstudio()`. El SQL 32 carga las matrículas con el mismo texto que `ESTUDIO_BASE`, así el reclamo no cambia.

Para confirmar el punto 3, correr en el SQL Editor:
```sql
select to_regclass('public.pas_papelera') is not null as sql26_papelera,
       to_regclass('public.indices') is not null and to_regclass('public.pas_ajustes') is not null as sql27_herramientas;
```

---

## Fase 1 · Auditoría de cambios (½–1 sesión) — SQL 31

**Base:** `sql/31_auditoria.sql` (probado: registra alta, cambios reales y borrado; un guardado sin cambios no deja rastro; re-ejecutable).

**Tabla:** `auditoria (id, tabla, fila_id, operacion, cambios jsonb, usuario, rol, en)` · trigger `auditar()` en `pas_casos, expedientes, plazos, pas_eventos, gastos, pas_ofertas, pas_companias` · función `historial_de(tabla, id)` · limpieza semanal de lo que tenga más de 18 meses.

**Pantalla:**
- `src/utils/auditoria.js`: `historialDe(tabla, id)`, `describirCambio(campo, antes, despues)` (usa los nombres legibles de los campos: reusar las etiquetas de `SeccionFechas`/`SeccionMontos` o armar un `ETIQUETAS_CAMPOS` en `constants.js`; montos con `formatters`, fechas dd/mm).
- `caso/SeccionTimeline.jsx` y la Bitácora del expediente: segmentado **"Movimientos · Cambios de datos"**. Cada cambio: fecha y hora, quién (Vos / PAS / Sistema), "Monto ofrecido: $ 1.200.000 → $ 1.500.000" y botón **"Volver a este valor"** (hace el update puntual; queda auditado también).

**Listo cuando:** cambiar un monto en la ficha lo muestra en "Cambios de datos" y "Volver a este valor" lo restaura.

**Hecho (29/09):** `sql/2026-09-29_31_auditoria.sql`, `utils/auditoria.js`, `caso/CambiosDatos.jsx`, segmentado en `SeccionTimeline.jsx`, conectado en la ficha del caso y del expediente. "Volver a este valor" pasa por el formulario de la ficha (no escribe directo en la base) para que el autoguardado no lo pise. Pendiente para más adelante: mostrar también los cambios de las tablas hijas (plazos, eventos, ofertas) dentro de la ficha.

---

## Fase 2 · Motor de escritos con modelos (2 sesiones) — SQL 32

**Base:** `sql/32_modelos_escrito.sql` (9 modelos + datos del estudio) y `codigo/plantillas.js` (probado).

### Esquema
- `modelos_escrito (id, clave, titulo, categoria, ambito, cuerpo, firma, membrete, orden, activo, created_at, updated_at)`
  - `categoria`: reclamo | seguimiento | acuerdo | intimacion | mediacion | judicial | cliente | otro
  - `ambito`: caso | expediente | ambos · `firma`: estudio | cliente | ambos | ninguna
- `escritos_generados (id, modelo_id, caso_id, expediente_id, titulo, cuerpo_final, respuestas jsonb, formato, archivo, created_at)`
- `pas_ajustes['estudio'] = {abogado, matriculas, condicion_fiscal, cuit, domicilio, mail, telefono}`

### Sintaxis de los modelos
| Escribís | Sale |
|---|---|
| `{{asegurado}}` | valor de la variable; si falta, `[asegurado]` resaltado |
| `{{? monto_aceptado \| Monto aceptado \| monto}}` | pregunta al generar (tipos: texto, monto, fecha); después se usa como `{{monto_aceptado}}` y `{{monto_aceptado_letras}}` |
| `{{#si nro_siniestro}}N° {{nro_siniestro}}{{/si}}` | el bloque solo si hay valor (se pueden anidar) |
| `# Título` · `**negrita**` · `1. ítem` | formato del PDF / Word |

### Variables
| Grupo | Variables |
|---|---|
| Caso | `asegurado`, `asegurado_mayus`, `asegurado_nombre` ("APELLIDO Nombre" → Nombre), `dni` (con puntos), `patente`, `vehiculo`, `nro_siniestro`, `compania`, `tercero`, `domicilio_asegurado` |
| Fechas del caso | `fecha_siniestro`, `fecha_derivacion`, `fecha_inicio_reclamo`, `fecha_reclamo`, `fecha_ultimo_reclamo`, `fecha_ofrecimiento`, `fecha_aceptacion`, `fecha_firma`, `fecha_pago`, `fecha_mediacion` — cada una con `_larga` ("5 de marzo de 2026") |
| Montos del caso | `monto_reclamado`, `monto_ofrecimiento`, `primer_ofrecimiento`, `segundo_ofrecimiento`, `monto_acordado`, `monto_cobro_asegurado`, `monto_honorarios`, `monto_cobro_yo`, `presupuesto` — cada una con `_letras` ("pesos un millón quinientos mil con 00/100") |
| Compañía | `compania.razon_social`, `compania.cuit`, `compania.domicilio` (armado con cp, localidad, provincia), `compania.mail` |
| Expediente | `caratula`, `juzgado`, `secretaria`, `numero`, `fuero`, `jurisdiccion`, `cliente`, `cliente_dni`, `contraparte`, `letrado_contrario`, `rol_cliente` |
| Estudio | `estudio.abogado`, `estudio.matriculas`, `estudio.cuit`, `estudio.domicilio`, `estudio.condicion_fiscal` |
| Otros | `hoy`, `hoy_largo`, `documental` (lista numerada), `liquidacion`, `liquidacion_total`, `liquidacion_total_letras` (fase 6) |

### Archivos
```
src/utils/plantillas.js              ← copiar codigo/plantillas.js (reemplazar primerNombre/formatearDni por los de formatters/generarEscrito)
src/utils/modelos.js                 — CRUD de modelos_escrito y escritos_generados; cargarEstudio (fase 0)
src/utils/escritoPDF.js              — bloques() → jsPDF: títulos, negrita por tramos, ítems, justificado, firma(s), pdfMembrete.dibujarPie
src/utils/escritoDocx.js             — bloques() → .docx con `await import("docx")` (dependencia nueva, solo se baja al usarla)
src/components/escritos/ModalEscritos.jsx
    Paso 1: lista de modelos (chips por categoría, filtrados por ámbito caso/expediente)
    Paso 2: preguntas del modelo (CampoMonto para montos, date para fechas)
    Paso 3: vista previa editable (textarea con el texto completado; [faltantes] resaltados arriba como chips)
    Acciones: "Guardar PDF en la carpeta" / "Descargar Word" / "Copiar texto" → escritos_generados + registrarAccion
src/components/herramientas/Modelos.jsx — editor: lista, título, categoría, ámbito, firma, cuerpo con selector de
    variables (CATALOGO_VARIABLES) que inserta en el cursor, vista previa con un caso de ejemplo; "Duplicar"; "Desactivar"
```
**Integración:**
- `CasoUnificado.jsx`: el botón "Generar escrito" abre `ModalEscritos` (el reclamo actual pasa a ser el modelo `reclamo_extrajudicial`; opciones de documental como preguntas o checkboxes que arman `documental`).
- `FichaExpediente.jsx`: botón "Generar escrito" (ámbito expediente).
- `utils/menus.js`: `itemsCaso` / `itemsExpediente` suman "Generar escrito…".
- `TabHerramientas.jsx`: nueva entrada **Modelos** en `HERRAMIENTAS`.
- **Portal PAS:** sigue con `ModalGenerarEscrito` + `generarEscrito.js` (los modelos son solo del administrador). Solo cambiar `generarEscrito.js` para que lea los datos del estudio de una constante compartida.
- Carta documento: queda como está (su formato es otro); a futuro puede leer también de `modelos_escrito` con categoría `intimacion`.

**Pruebas:** `plantillas.test.mjs` + generar los 9 modelos con un caso completo y uno vacío, PDF y Word, en compu y celular.
**Listo cuando:** desde un caso se genera "Aceptación de ofrecimiento" con el monto preguntado en letras, se guarda en la carpeta y aparece en la Bitácora.

**Hecho (29/09):** como está planeado, con estos cambios: el modal se abre desde cualquier lado con `abrirEscritos()` (`utils/escritoAbierto.js` + `EscritosHost`), igual que la ficha de compañía; sin carpeta vinculada guarda con el explorador; los faltantes simples (DNI, patente, siniestro, fecha) se completan en el modal; cada Enter es un renglón y la línea en blanco separa párrafos; un `{{#si}}` vacío saca su renglón; las cartas a la compañía llevan fecha y destinatario; el reclamo base firma "cliente" (Firma / Aclaración / DNI, como siempre). El motor quedó en `src/utils/plantillas.js` (el borrador de `codigo/` se borró; las pruebas siguen en `codigo/plantillas.test.mjs`).

---

## Fase 3 · Plazos condicionados + aviso de plazos (1–2 sesiones) — SQL 33

**Base:** `sql/33_plazos_condicionados.sql` (catálogo de 23, columnas nuevas en `plazos`, vista `plazos_para_avisar`; probado).

### Esquema
- `tipos_plazo (id, clave, nombre, disparador, dias, computo, clase, jurisdiccion, fuero, ambito, norma, avisar_dias_antes, siguiente_clave, verificado, activo, orden)`
- `plazos` + `tipo_plazo_id`, `avisar_dias_antes`, `avisado_en`, `jurisdiccion`
- vista `plazos_para_avisar (id, titulo, vence, clase, caso_id, expediente_id, de, dias_restantes)`

### Pantalla
- `expediente/ListaPendientes.jsx` → "Nuevo plazo" con dos modos (segmentado): **"Pasó algo"** (buscar en el catálogo por texto, filtrado por jurisdicción y fuero del expediente → fecha de notificación → vencimiento en vivo con los días salteados → Guardar) y **"A mano"** (lo de hoy).
- Chip **"Revisar norma"** en los tipos con `verificado = false`; al cumplir un plazo con `siguiente_clave`: "¿Cargar *Expresar agravios*?".
- `Herramientas → Calculadora de plazos`: pestaña **Catálogo** (ver, editar días/norma, tildar "Verificado", sumar propios).
- Casos PAS: en la ficha, "Plazos de la compañía" con los tipos de ámbito `caso` (art. 56, art. 49, intimación).
- `utils/plazos.js` no cambia: se reusa `calcularVencimiento`.

### Aviso (función `notificar`)
En `resumenDelDia()` sumar:
```ts
const { data: plazos } = await sb.from("plazos_para_avisar").select("titulo, vence, clase, de, dias_restantes");
const fatalesHoy = (plazos || []).filter(p => p.clase === "fatal" && p.dias_restantes <= 0).length;
const proximos   = (plazos || []).filter(p => p.dias_restantes > 0).length;
// partes: "1 plazo fatal vence hoy" · "3 plazos vencen en los próximos días"
```
y, si hay un fatal que vence hoy o mañana, un **aviso propio** (no solo el resumen): título "Vence hoy: Contestar la demanda", cuerpo con la carátula, `url: "/?abrir=expediente-<id>"`. Marcar `avisado_en = hoy` para no repetir. Redesplegar: `supabase functions deploy notificar`.

**Listo cuando:** cargar "Notificación del traslado de la demanda" (CABA, 15 hábiles) el 01/10 muestra el vencimiento correcto salteando el 12/10, y al día anterior llega el push.

**Hecho (29/09):** como está planeado. El catálogo está en Herramientas → Calculadora de plazos → "Catálogo de actuaciones"; los plazos del caso PAS están en la ficha → Datos. `notificar` manda un aviso por plazo fatal (una vez por día, con link a la ficha) y los cuenta en el resumen. Queda para después: que al cambiar un expediente a "Sentenciado" se ofrezca el plazo de apelación.

---

## Fase 4 · Calendario suscribible (1 sesión) — SQL 34

**Base:** `sql/34_calendario.sql` (tabla `calendario_tokens`, función `nuevo_token_calendario()`; probado) y `funciones/calendario.ts`.

1. Copiar `funciones/calendario.ts` a `supabase/functions/calendario/index.ts` y desplegar **sin JWT**: `supabase functions deploy calendario --no-verify-jwt`.
2. Pantalla en "Apariencia y backup" (o Herramientas): **"Calendario en el celular"** → qué incluir (eventos, plazos, escritos, próximas acciones) → "Crear link" → muestra la URL con "Copiar" y los pasos: *Google Calendar en la compu → Otros calendarios → + → Desde URL → pegar*. "Regenerar link" invalida el anterior. Muestra "Google lo leyó por última vez: …" (`ultimo_uso`).
3. Probar el .ics con un validador (icalendar.org) y suscribirlo en Google.

**Listo cuando:** el calendario "ATG Lex" aparece en el Google Calendar del celular con las mediaciones y los plazos, y tocar uno abre la ficha.

**Hecho (29/09):** `sql/2026-09-29_34_calendario.sql`, `supabase/functions/calendario/index.ts` (con CORS para que la app lo pruebe), Herramientas → **Calendario en el celular** con "Agregar a Google Calendar" (link `calendar.google.com/calendar/r?cid=webcal://…`), copiar, probar y regenerar. El .ics se validó con el lector ical.js en lugar de icalendar.org. Los plazos fatales dicen "VENCE (fatal)" (sin emojis).

---

## Fase 5 · Movimientos visibles + vista del cliente de expedientes (2 sesiones) — SQL 35

**Base:** `sql/35_portal_movimientos.sql` (probado: acceso correcto, DNI incorrecto suma intento, lo interno no se ve).

### Esquema
- `acciones` + `visible_cliente boolean` + `texto_cliente text`
- política `pas_ve_movimientos` (el PAS ve los visibles de sus casos)
- `movimientos_cliente(patente, dni, caso_id)` → `[{fecha, texto}]`
- `consultar_expediente_cliente(dni, codigo)` → `{caratula, juzgado, numero, estado, mensaje, movimientos, proximos}`

### Pantalla
- **Bitácora** (casos y expedientes): en cada movimiento, interruptor **"Lo ve el cliente"** y, al prenderlo, campo "Cómo lo lee el cliente" (sugerencias según el tipo). Al guardar: "¿Avisarle por WhatsApp?" (reusa `AvisarWhatsApp`).
- Cambios de estado que ya generan nota (`textoCambioEstado`) → proponer el texto para el cliente con `utils/vistaCliente.js`.
- **Vista del cliente de casos** (`PortalCliente.jsx`): sección "Novedades" con los movimientos.
- **Portal PAS** (`PortalCasoCard.jsx`): los mismos movimientos.
- **Vista del cliente de expedientes:** `/?vista=expediente` → DNI + código → estado en palabras simples (`ESTADOS_EXPEDIENTE` → texto para el cliente), mensaje del estudio, novedades, próximas audiencias, WhatsApp. En la ficha del expediente: "Copiar link y código para el cliente".

**Listo cuando:** marcar un movimiento como visible lo muestra en la vista del cliente, y un expediente visible se consulta con DNI + código.

**Hecho (29/09):** con un cambio importante: la política `pas_ve_movimientos` del SQL 06 **no se toca** (el PAS sigue viendo toda la bitácora; el borrador le habría ocultado lo interno). También se corrigió que el código del expediente (`ABCD-12`) se compare sin guiones. El portal PAS no cambia.

---

## Fase 6 · Resultado por caso, gastos a recuperar, liquidaciones (1 sesión) — SQL 36

**Base:** `sql/36_finanzas_caso.sql` (probado con un caso de ejemplo: honorarios 300.000, comisión 30.000, gastos 60.000 → neto 210.000).

### Esquema
- `gastos` + `recuperable`, `recuperar_de` (cliente | compania | costas), `recuperado_en`
- vista `resultado_casos (caso_id, asegurado, compania_aseguradora, pas_id, estado, honorarios, honorarios_cobrados, comision_pas, gastos, gastos_por_recuperar, neto, dias_hasta_cobro)`
- `liquidaciones (id, caso_id, expediente_id, titulo, capital, desde, hasta, metodo, resultado, detalle, texto, created_at)`

### Pantalla
- **Montos** del caso: tarjeta "Resultado del caso" (honorarios − comisión − gastos = neto; gastos del caso con "+ Gasto"; los recuperables con "Recuperado").
- **Finanzas → Gastos:** casilla "Se recupera de…" y filtro "Por recuperar".
- **Análisis → Compañías / PAS:** columnas "Neto promedio" y "Días hasta el cobro".
- **Calculadora de intereses:** "Guardar en un caso/expediente" → `liquidaciones`; en `ModalEscritos`, si el caso tiene liquidaciones, elegir cuál usar para `{{liquidacion}}`.
- Opcional: cron mensual que actualiza IPC e ICL (misma lógica que `utils/indices.js`, en una Edge Function).

**Listo cuando:** un caso cobrado muestra su neto, y la "Nota al cliente con la liquidación" sale con la tabla de la calculadora.

**Hecho (29/09):** con un cambio: la rentabilidad por compañía y por PAS quedó en **Finanzas → Rentabilidad** (ahí ya se cargan los gastos) en lugar de columnas en Análisis. La liquidación entra al escrito como el texto de la calculadora (no como tabla). Quedó afuera el cron mensual de IPC/ICL.

---

## Fase 7 · Opcionales (solo si hacen falta)

### 7a · Bandeja de novedades judiciales — SQL 37 · HECHA (29/09)
- `expedientes` + `portal`, `url_portal`, `numero_normalizado` (generado) · `novedades_judiciales (id, expediente_id, fuente, fecha, tipo, texto, url, hash único, estado, plazo_id, created_at, resuelta_en)`.
- Pantalla: en Expedientes, chip **"Novedades (N)"** → lista; "Pegar novedad" (texto + expediente; si el texto trae el número de expediente, se asigna solo); cada una: **Integrar** (nota en la Bitácora + opcional plazo del catálogo con la fecha) o **Descartar**. Botón "Abrir en MEV/PJN" en la ficha.
- Fase 2 posible: leer los mails de aviso de notificación de Gmail (si llegan) y cargarlos como `fuente = 'mail'`.
- **Nunca:** guardar tu clave del PJN/MEV ni hacer scraping.

### 7b · Búsqueda dentro de los documentos — SQL 38 · DESCARTADA (29/09)
- `documentos_texto (id, caso_id, expediente_id, ruta, nombre, tamanio, modificado, origen, texto, tsv, indexado_en)` + `buscar_documentos(q)` (probado: "póliza 44532" encuentra el PDF y devuelve el fragmento con «resaltado»).
- Pantalla: en Documentos, "Indexar carpeta" (pdf.js `getTextContent`; OCR con tesseract.js solo si el PDF no tiene texto y solo en la PC) → Ctrl+K suma "En documentos".
- Alternativa más barata primero: **"Detectar datos"** en la denuncia (patente, n.° de siniestro, póliza, fecha) para completar la ficha.

---

## Reglas para todas las fases (de `CLAUDE.md`)
- Español en nombres, comentarios y textos; sin emojis en la interfaz; sin colores hex (tokens `var(--…)`, `alpha()`).
- Radios `var(--r-*)`, elevación `--sh-1/2/3`, clases `.tarjeta`, `.chip`, `.segmentado`.
- Interacción: tocar abre, click derecho con `propsMenu` e ítems desde `utils/menus.js`, arrastrar solo donde mover significa algo.
- Pestañas con `lazy()`; librerías pesadas (`docx`, `tesseract.js`) con `await import()`.
- Lo que va dentro de `.modal-panel` con `position: fixed` → `createPortal`.
- La app avisa "Falta correr el SQL N" si la tabla no existe (como la papelera).
- Actualizar `Context.md` (estructura + Registro de Cambios) y `schema.sql` en cada fase.

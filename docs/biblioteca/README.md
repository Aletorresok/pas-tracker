# Biblioteca: primer lote (relevamiento del 7/10/2026)

Material de jurisprudencia, doctrina y normas para cargar en la Biblioteca de ATG Lex. El lote quedó **incompleto respecto del objetivo** (40 a 60 fallos y 15 a 25 de doctrina). Abajo están los números, el motivo y los huecos.

## Archivos

| Archivo | Contenido | Cantidad |
|---|---|---|
| `jurisprudencia.json` | Fallos confirmados (carátula, tribunal y fecha vistos en el índice de la fuente oficial) | 27 |
| `doctrina.json` | Referencias bibliográficas confirmadas (todas de acceso abierto) | 7 |
| `normas.json` | Normas por tema, con artículos y enlace oficial | 20 |
| `a_revisar.json` | Fallos y doctrina con datos incompletos o contradictorios | 34 (29 fallos, 5 doctrina) |

## Cantidad por tema

Un fallo puede tener más de un tema, así que los totales no suman 27.

| Tema | Fallos | Doctrina | Normas | Pendientes en `a_revisar` (fallos y doctrina) |
|---|---|---|---|---|
| privación de uso | 4 | 0 | 1 | 7 |
| desvalorización | 3 | 0 | 1 | 4 |
| daño emergente | 3 | 1 | 1 | 6 |
| incapacidad | 5 | 3 | 1 | 8 |
| daño moral | **2** | 3 | 1 | 6 |
| concurrencia | 4 | 0 | 2 | 3 |
| citación en garantía | **2** | 3 | 2 | 9 |
| franquicia | **2** | 3 | 2 | 10 |
| intereses | 4 | 2 | 2 | 0 |
| prescripción | 3 | 1 | 2 | 3 |
| mediación | 4 | 0 | 5 | 5 |

Resultado de los fallos: 10 a favor del reclamante, 6 en contra y 11 mixtos. Jurisdicción: 18 PBA, 6 CABA y 3 CSJN.

## Cómo se verificó (leer antes de citar)

- **La red del entorno de trabajo bloqueaba** saij.gob.ar, cij.gov.ar, sj.csjn.gov.ar, infoleg.gob.ar, juba.scba.gov.ar, pjn.gov.ar y normas.gba.gob.ar. No se pudo abrir ninguna página de forma directa.
- Lo único disponible fue el **buscador web**, que indexa esas páginas oficiales. Un fallo entró a `jurisprudencia.json` solo si, para una URL de dominio oficial, el contenido indexado mostraba **carátula, tribunal y fecha**, y además el tema y el sentido de lo resuelto. Todos los fallos llevan el campo extra `"verificacion": "indice_buscador"` para que la app los marque.
- **Antes de usar un fallo en un escrito, conviene abrir el enlace y cotejarlo.** Los resúmenes que da el buscador pueden tener errores de detalle (montos, quién apeló).
- Fechas de los PDF del CIJ: se tomó la fecha que figura en el documento. Cuando no estaba explícita, se usó la fecha de firma digital que aparece en el encabezado del PDF (`#expte#doc#AAAAMMDD…`). Los enlaces del CIJ se normalizaron a la forma `https://www.cij.gov.ar/d/sentencia-SGU-<id>.pdf`, porque el índice devolvía variantes con prefijos espurios (`/scp/`, `/m/`, `/sorteos/`).
- Los fallos de la CSJN (Flores, Ontiveros, Grippo) se enlazan a **compilaciones oficiales de la Secretaría de Jurisprudencia** que los citan, porque no se encontró el documento individual en sj.csjn.gov.ar. En Ontiveros y Grippo la carátula está abreviada: conviene cotejar la completa.
- En Vera (SCBA) el enlace es una nota institucional de la Cámara de San Isidro, Sala I, que reseña el fallo, no el texto de la sentencia.
- Sumarios: todos son propios (`sumario_oficial: false`). No se pudo leer el sumario oficial de SAIJ ni de JUBA.
- Doctrina: solo referencias. No se copió texto de obras pagas. `anio: null` en Díaz (ReDeA) porque no se pudo confirmar el año. `url: null` en el CCyC Comentado de Infojus: es de distribución libre en SAIJ, pero no se confirmó la URL de cada tomo.

## Fuentes usadas

- **PBA**: blogs oficiales de las cámaras en blogs.scba.gov.ar (Trenque Lauquen, La Plata Cámara II, San Isidro Sala I y San Nicolás), JUBA (juba.scba.gov.ar) y descargas de sentencias de scba.gov.ar.
- **CABA / Nación**: PDF de sentencias de la Cámara Nacional Civil publicados en el CIJ (cij.gov.ar) y el plenario Samudio en old.pjn.gov.ar.
- **CSJN**: notas y suplementos de la Secretaría de Jurisprudencia (sj.csjn.gov.ar).
- **Normas**: InfoLEG (servicios.infoleg.gob.ar), argentina.gob.ar/normativa y normas.gba.gob.ar.
- **Doctrina**: repositorios de UNL, UCA y UNLP, y publicaciones oficiales de la CSJN y la SCBA.

## Criterios

- Prioridad a fallos posteriores a 2015 (CCyC). Las excepciones son el plenario Samudio (2009), Santucho (febrero de 2015, ya con la Ley 24.449) y Cabrera (2016).
- Se incluyeron fallos **en contra** cuando marcan un riesgo concreto: Flores (CSJN, límite de cobertura oponible), Bernoldi (privación de uso sin prueba en PBA), Cassini (mediación obligatoria aunque la demanda sea interruptiva) y Roldán (caducidad de la mediación).
- Tres fallos no son de tránsito pero sus reglas se aplican igual: Roldán (prescripción y mediación), Paroni (honorarios del mediador y art. 730) y Pehuajó (prescripción del art. 58 en una acción del asegurado).
- La diferencia CABA/PBA en privación de uso es central. La Cámara Nacional Civil la presume (Colque). La SCBA exige prueba porque no la considera daño in re ipsa (Bernoldi; en Lamoglia se reconoció parcialmente el gasto de transporte).

## Huecos importantes

1. **Volumen**: 27 fallos contra el objetivo de 40 a 60, y 7 referencias de doctrina contra 15 a 25. Se llegó al **límite de 200 búsquedas web** del turno antes de terminar. Las búsquedas de doctrina sobre privación de uso, desvalorización, concurrencia, intereses, prescripción y mediación no se llegaron a hacer.
2. **Daño moral, citación en garantía y franquicia** tienen 2 fallos cada uno, por debajo del mínimo de 3. Hay candidatos en `a_revisar.json`: Baeza (CSJN), González c/ Acosta (SCBA), Lombardo (SCBA) y los plenarios y fallos de la CSJN de Obarrio y Gauna, Cuello y Buffoni.
3. **CABA tiene pocos fallos** (6). El CIJ indexa los PDF con títulos opacos y muchas veces no se pudo extraer la carátula. Hay 10 sentencias de la CNCiv en `a_revisar.json` con enlace y tema identificados; solo falta la carátula o el resultado.
4. **Faltan fallos clave de la CSJN** con enlace oficial: Arostegui (2008), Baeza (2011), Cuello (2007), Obarrio y Gauna (2008) y Buffoni (2014).
5. **Faltan plenarios de la CNCiv** sobre franquicia (Obarrio y Gauna, 2006) y sobre capitalización de intereses: no se buscaron.
6. **SAIJ**: no se pudo usar como fuente (no se pudo abrir y casi no aparece en el buscador), así que no hay sumarios oficiales.

## Para completar

- Habilitar en la configuración de red del entorno los dominios saij.gob.ar, cij.gov.ar, sj.csjn.gov.ar, juba.scba.gov.ar, servicios.infoleg.gob.ar, pjn.gov.ar y normas.gba.gob.ar, para abrir los documentos y cotejarlos.
- Resolver primero `a_revisar.json`: casi todos los pendientes tienen URL candidata.
- Hacer una segunda tanda de búsquedas de doctrina (SAIJ Doctrina, Revista Pensamiento Civil y revistas universitarias).

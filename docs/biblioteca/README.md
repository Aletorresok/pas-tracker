# Biblioteca de ATG Lex: jurisprudencia, doctrina y normas

Relevamiento del 07/10/2026 para la "Biblioteca" de ATG Lex, sobre reclamos por accidentes de tránsito contra aseguradoras en CABA y Provincia de Buenos Aires. Hay tres tandas: el primer lote, el agregado sobre suma asegurada y la segunda tanda. Son datos para cargar; no se tocó el código de la app.

| Archivo | Contenido | Cantidad |
|---|---|---|
| `jurisprudencia.json` | Fallos verificados en la fuente oficial | 99 |
| `doctrina.json` | Referencias bibliográficas (32 de acceso abierto; 15 posteriores a 2015) | 32 |
| `normas.json` | Normas por tema, con artículo y link oficial | 23 |
| `a_revisar.json` | Lo que no se pudo verificar, con lo que se sabe y el motivo | 6 |

## Cantidad por tema

Un fallo puede tener más de un tema, por eso la suma supera 99.

| Tema | Fallos | A favor | En contra | Mixto | Doctrina | Normas |
|---|---|---|---|---|---|---|
| privación de uso | 14 | 6 | 2 | 6 | 1 | 1 |
| desvalorización | 11 | 5 | 4 | 2 | 0 | 1 |
| daño emergente | 7 | 4 | 0 | 3 | 1 | 1 |
| incapacidad | 11 | 4 | 0 | 7 | 5 | 1 |
| daño moral | 6 | 4 | 0 | 2 | 5 | 1 |
| concurrencia | 10 | 1 | 1 | 8 | 2 | 4 |
| citación en garantía | 25 | 16 | 7 | 2 | 6 | 3 |
| franquicia | 12 | 2 | 9 | 1 | 5 | 2 |
| suma asegurada | 23 | 17 | 3 | 3 | 7 | 2 |
| intereses | 13 | 3 | 2 | 8 | 5 | 1 |
| prescripción | 13 | 6 | 4 | 3 | 1 | 3 |
| mediación | 10 | 4 | 1 | 5 | 2 | 3 |

Por jurisdicción: 50 de la justicia nacional ordinaria con asiento en CABA (CNCiv, CNCom y juzgados civiles), 38 de PBA (SCBA y cámaras departamentales) y 11 de la CSJN. 89 de los 99 son de 2015 en adelante.

**Lista fija de temas** (para la app): privación de uso, desvalorización, daño emergente, incapacidad, daño moral, concurrencia, citación en garantía, franquicia, suma asegurada, intereses, prescripción, mediación.

## Qué se sumó en la segunda tanda

| Punto | Agregado |
|---|---|
| 1. Doctrina posterior a 2015 | 13 trabajos de acceso abierto: Acciarri y Filipini (art. 1746); Wilhelm, Martínez Paz y Leonhardt (daño moral e intereses); Parellada y otros (intereses); Díaz Gamba, Guffanti, Romero Boue y 4 de Sobrino en SAIJ (suma asegurada y franquicia). |
| 2. Desvalorización a favor | 5 fallos desde 2017: CNCom salas A, B, C y E y CC0202 La Plata ("Ogando"). "Almada" sigue sin texto completo. |
| 3. Intereses | SCBA "Vera" (C. 120.536, 18/4/2018), "Nidera" (C. 121.134, 3/5/2018) y "Barrios" (C. 124.096, 17/4/2024), abiertos en JUBA. "Samudio" sigue sin fuente oficial. |
| 4. Suma asegurada | SCBA "Martínez c/ Boito" (C. 119.088, 21/2/2018) y, en normas, las resoluciones SSN 589/2025 (vigente desde 1/1/2026) y 551/2024 (pólizas de 2025), del Boletín Oficial. |
| 5. Prescripción | 6 fallos: LP Sala III ("Gomez", mediación al límite), San Martín ("Céspedes"), CNCiv H ("Doval", plazo del pasajero), CNCiv G y de feria, y CNCom D ("Riep", caducidad de la mediación, en contra). |
| 6. Incapacidad | CSJN "Arostegui" (Fallos 331:570) y "Ontiveros" (Fallos 340:1038). "Vuoto" y "Méndez" siguen a revisar. |
| 7. Franquicia | CNCiv Sala M 2026 ("Berterreche", ferrocarril) y Sala J 2026 ("Díaz Paniagua", ya cargado, con el tema agregado). En contra, CSJN "Obarrio" y "Gauna" (2008). |
| 8. Daño emergente | CNCiv Sala G 2026 ("Orellana", presupuesto no rebatido) y CNCom 2026 ("Sapia", repuestos). |
| 9. Repaso de `a_revisar` | Pasaron a la lista principal "Vera", "Palamara", "Obarrio" (con "Gauna"), "Arostegui", "Ontiveros", "Martínez c/ Boito" y el trabajo de Acciarri. Quedan 6 ítems. |

## Control de calidad

Se volvieron a abrir 10 fallos del lote anterior, elegidos al azar con una semilla fija. Se cotejaron carátula, tribunal, sala y fecha contra la fuente: los 10 coinciden.

| Fallo | Fuente | Resultado |
|---|---|---|
| De la Portilla c/ Moabro | JUBA | Coincide |
| Guardia c/ Pérez (SCBA) | JUBA | Coincide |
| Ferreyra c/ Ministerio de Seguridad (SCBA) | JUBA | Coincide |
| Zampatti c/ Petroccelli | JUBA | Coincide |
| Zaglio c/ Godoy | JUBA | Coincide |
| Ontiveros, Damián c/ Huachuhuillca (Juz. Civ. 34) | SAIJ | Coincide |
| Ferrari c/ Boglione (CNCiv C) | SAIJ | Coincide |
| Ayala c/ Caja de Seguros (CNCom D) | SAIJ | Coincide |
| Silva c/ Lago (CNCiv H) | SAIJ | Coincide |
| Cantavenera c/ Cahill (CNCiv E) | SAIJ | Coincide |

## Fuentes usadas

- **SAIJ** (saij.gob.ar): fallos de la CNCiv, CNCom, CSJN y algunos de PBA, y parte de la doctrina. El link de cada fallo apunta a la ficha de la sentencia, donde se ven carátula, tribunal, sala y fecha.
- **JUBA - SCBA** (juba.scba.gov.ar): fallos de PBA. El link es `VerTextoCompleto.aspx?idFallo=…`, que muestra tribunal emisor, causa, fecha y carátula. Para los fallos de la SCBA se buscó por número de causa.
- **Secretaría de Jurisprudencia de la CSJN** (sjconsulta.csjn.gov.ar): "Grippo", "Buffoni", "Flores", "Arostegui", "Ontiveros", "Obarrio" y "Gauna". El link muestra la carátula y el número de Fallos; la fecha figura en el listado de la búsqueda.
- **Normas:** InfoLEG (CCyC, Leyes 17.418, 24.449 y 26.589, Decreto 1467/2011), Normas PBA (Leyes 13.951 y 13.927) y el Boletín Oficial (resoluciones SSN).
- **Doctrina de acceso abierto fuera de SAIJ:** repositorios de la UCA y de la UNLP (SEDICI), Pensamiento Civil, la revista "Diálogos y Voces Judiciales" (Jujuy) y el sitio de la SCBA, que reproduce el trabajo de Acciarri publicado en La Ley.

## Criterios

- **Verificación.** Cada fallo de la lista principal se abrió en la fuente oficial y se cotejaron carátula, tribunal, sala y fecha. Lo que solo apareció citado en otro fallo, o no tenía link estable, va a `a_revisar.json`.
- **Sumarios.** Todos están redactados por nosotros (`sumario_oficial: false`) a partir del sumario oficial de SAIJ, JUBA o la CSJN.
  - Cuando la fuente no tiene sumario propio ("Barrios", "Obarrio", "Gauna"), el sumario se apoya en cómo lo describen fallos posteriores verificados, y se aclara.
- **Resultado.** Se indica respecto del reclamante:
  - *mixto*: el fallo admite un rubro y rechaza otro, o fija una regla que juega a favor o en contra según el caso. Por ejemplo, en prioridad de paso depende de qué lado venía el cliente; la tasa pura de la SCBA reconoce valores actuales pero baja la tasa del tramo anterior.
- **Sala.** Va `null` cuando el tribunal no tiene salas o cuando la fuente no la informa; se aclara en el sumario.
- **Jurisdicción.** La justicia nacional ordinaria de Capital (CNCiv, CNCom) se marcó como `"Nacional"`. `"CABA"` queda reservado para la justicia local de la Ciudad; no hay fallos de ese fuero.
- **Fecha.** Se priorizó 2015 en adelante. Las excepciones son referencias vigentes o pedidas expresamente:
  - CSJN: "Ledesma" (2008), "Arostegui" (2008), "Obarrio" y "Gauna" (2008), "Buffoni" (2014).
  - SCBA: "Díaz c/ Moreno" (2011), "Palamara" (2012).
  - CNCiv: "Vargas Torres" (2010), "Volpini" (2013).
  - Cám. Pergamino: "Luca" (2013).
- **Fallos de consumo y de seguro propio.** Algunos fallos de la CNCom sobre desvalorización, daño emergente o suma asegurada resuelven reclamos de un consumidor contra el fabricante o del asegurado contra su compañía; se indica en el sumario.

## Huecos que siguen

1. **"Samudio" (CNCiv, en pleno, 2009).** No está en SAIJ ni en la base de la CSJN, y no se encontró en una fuente oficial del PJN. Lo citan muchos fallos verificados.
2. **"Vuoto" y "Méndez".** Los fallos de origen de la CNAT, Sala III, no están en fuentes oficiales abiertas. De "Méndez" solo se verificó la queja ante la CSJN (2009), que confirma la carátula. "Acuña" sigue sin identificar.
3. **Desvalorización en la CNCiv.** Los 5 fallos a favor son de la CNCom y de PBA; en la Cámara Civil solo aparecieron fallos que exigen pericia. "Almada" (Quilmes, 2017) sigue sin texto completo en JUBA.
4. **Prescripción del art. 2561 para el tercero.** No apareció un fallo que la trate como tema central. Lo más cercano es "Doval", sobre el pasajero transportado tras la reforma del art. 50 de la LDC.
5. **Franquicia.** Los fallos de inoponibilidad de la CNCiv son de 2026 (salas J, L y M); no se encontraron otros desde 2020 en SAIJ. La CSJN y la SCBA mantienen la oponibilidad.
6. **Doctrina sobre privación de uso y desvalorización.** No se encontraron trabajos de acceso abierto posteriores a 2015 sobre estos dos rubros. Tampoco se cargaron obras pagas, porque no se pudo verificar la referencia en una fuente.
7. **Doctrina reciente en SAIJ.** La mayor parte de la doctrina de SAIJ sobre estos temas es anterior al CCyC o es del mismo autor (Sobrino).

## Nota técnica para la carga

SAIJ limita las consultas seguidas a su API (`/view-document`). Si la app va a validar los links automáticamente, conviene espaciar las peticiones; en este relevamiento hizo falta esperar alrededor de 1,5 segundos entre consultas.

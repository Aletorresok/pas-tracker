# Biblioteca: primer lote (relevamiento del 07/10/2026)

Lote inicial de jurisprudencia, doctrina y normas para la "Biblioteca" de ATG Lex, sobre reclamos por accidentes de tránsito contra aseguradoras en CABA y Provincia de Buenos Aires. Son datos para cargar; no se tocó el código de la app.

| Archivo | Contenido | Cantidad |
|---|---|---|
| `jurisprudencia.json` | Fallos verificados en la fuente oficial | 60 |
| `doctrina.json` | Referencias bibliográficas (todas de acceso abierto en SAIJ) | 19 |
| `normas.json` | Normas por tema, con artículo y link oficial | 20 |
| `a_revisar.json` | Lo que no se pudo verificar, con lo que se sabe y el motivo | 12 |

## Cantidad por tema

Un fallo puede tener más de un tema, por eso la suma supera 60.

| Tema | Fallos | A favor | En contra | Mixto | Doctrina | Normas |
|---|---|---|---|---|---|---|
| privación de uso | 14 | 6 | 2 | 6 | 1 | 1 |
| desvalorización | 6 | 0 | 4 | 2 | 0 | 1 |
| daño emergente | 5 | 2 | 0 | 3 | 1 | 1 |
| incapacidad | 9 | 2 | 0 | 7 | 3 | 1 |
| daño moral | 5 | 3 | 0 | 2 | 2 | 1 |
| concurrencia | 9 | 1 | 1 | 7 | 2 | 4 |
| citación en garantía | 9 | 2 | 5 | 2 | 5 | 3 |
| franquicia | 8 | 0 | 7 | 1 | 2 | 1 |
| intereses | 9 | 2 | 3 | 4 | 2 | 1 |
| prescripción | 7 | 3 | 3 | 1 | 1 | 3 |
| mediación | 6 | 2 | 0 | 4 | 2 | 3 |

Por jurisdicción: 28 de la justicia nacional ordinaria con asiento en CABA (CNCiv, CNCom y juzgados civiles), 25 de PBA (SCBA y cámaras departamentales) y 7 de la CSJN. 54 de los 60 son de 2015 en adelante.

## Fuentes usadas

- **SAIJ** (saij.gob.ar): fallos de la CNCiv, CNCom, CSJN y algunos de PBA, y toda la doctrina. El link de cada fallo apunta a la ficha de la sentencia, donde se ven carátula, tribunal, sala y fecha.
- **JUBA - SCBA** (juba.scba.gov.ar): fallos de PBA. El link es `VerTextoCompleto.aspx?idFallo=…`, que muestra tribunal emisor, causa, fecha y carátula.
- **Secretaría de Jurisprudencia de la CSJN** (sjconsulta.csjn.gov.ar): "Grippo", "Buffoni" y "Flores". El link muestra la carátula y el número de Fallos; la fecha figura en el listado de la búsqueda y en el análisis del fallo.
- **InfoLEG** (CCyC, Ley 17.418, Ley 24.449, Ley 26.589, Decreto 1467/2011) y **Normas PBA** (normas.gba.gob.ar: Leyes 13.951 y 13.927).

## Criterios

- **Verificación.** Cada fallo de la lista principal se abrió en la fuente oficial el 07/10/2026 y se cotejaron carátula, tribunal y fecha. Lo que solo apareció citado en otro fallo, o no tenía link estable, va a `a_revisar.json`.
- **Sumarios.** Todos están redactados por nosotros (`sumario_oficial: false`) a partir del sumario oficial de SAIJ o JUBA, que se puede leer en el link.
- **Resultado.** Se indica respecto del reclamante:
  - *mixto*: el fallo admite un rubro y rechaza otro, o fija una regla que juega a favor o en contra según el caso. Por ejemplo, en prioridad de paso depende de qué lado venía el cliente.
- **Sala.** Va `null` cuando el tribunal no tiene salas o cuando la fuente no la informa (dos fallos de la CNCiv: García c/ Álvarez y Vargas Torres); se aclara en el sumario.
- **Jurisdicción.** La justicia nacional ordinaria de Capital (CNCiv, CNCom) se marcó como `"Nacional"`. `"CABA"` queda reservado para la justicia local de la Ciudad (TSJ, Cámara CAyT y de Relaciones de Consumo); en este lote no hay fallos de ese fuero.
- **Fecha.** Se priorizó 2015 en adelante. Las excepciones son referencias que siguen vigentes: CSJN "Ledesma" (2008) y "Buffoni" (2014), SCBA "Díaz c/ Moreno" (2011), CNCiv "Vargas Torres" (2010) y "Volpini" (2013), y Cám. Pergamino "Luca" (2013, única sobre repuestos y presupuesto).
- **Doctrina.** Solo referencias bibliográficas. El resumen está hecho sobre el abstract que publica SAIJ; la publicación original (La Ley, El Derecho, Jurisprudencia Argentina) se indica entre paréntesis con el identificador SAIJ.

## Huecos que quedaron

1. **Desvalorización a favor.** Los 6 fallos verificados son en contra o mixtos (exigen pericia). El único reciente claramente a favor ("Almada", Quilmes 2017: no hace falta reparar para reclamar) no tiene texto completo en JUBA y quedó a revisar. Tampoco se encontró doctrina abierta sobre el rubro.
2. **Daño emergente según presupuesto o factura.** Hay poca jurisprudencia posterior a 2015 específica sobre presupuesto, factura y repuestos; lo más claro es "Luca" (2013). Conviene buscar en la CNCiv por "presupuesto" y "factura" dentro del texto completo.
3. **Fórmulas Vuoto, Méndez y Acuña.** Los fallos de origen no tienen una fuente oficial pública verificable (los dos primeros son del fuero laboral). "Acuña" no se pudo identificar. Del criterio de la CSJN quedó "Grippo" (2021); "Arostegui" (2008) y "Ontiveros" (2017) quedaron a revisar.
4. **Plenario "Samudio" (CNCiv, 2009)** y doctrina SCBA "Vera", "Nidera" y "Barrios" sobre intereses: están citados en fallos verificados, pero no se abrieron los fallos originales.
5. **Prescripción trienal del art. 2561 para el tercero.** No apareció un fallo que la trate como tema central. Lo verificado sobre prescripción se refiere al art. 58 de la Ley de Seguros (acciones del asegurado) y a la suspensión por mediación.
6. **Franquicia.** La CSJN y la SCBA sostienen la oponibilidad. El único fallo a favor de la inoponibilidad es de la CNCiv, Sala L (2026), además de la doctrina de Sobrino. Falta relevar si otras salas siguieron esa línea.
7. **Doctrina reciente.** La doctrina abierta de SAIJ sobre estos temas es en su mayoría anterior al CCyC. Para trabajos posteriores a 2015 habría que relevar revistas universitarias (UBA, UNLP, UNS) y la Revista de Derecho Privado.
8. **Justicia local de CABA.** No se relevaron fallos del TSJ ni de la Cámara CAyT, porque los reclamos de tránsito entre particulares tramitan en la justicia nacional civil.

## Nota técnica para la carga

SAIJ limita las consultas seguidas a su API (`/view-document`). Si la app va a validar los links automáticamente, conviene espaciar las peticiones; en este relevamiento hizo falta esperar alrededor de 1,5 segundos entre consultas.

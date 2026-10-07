import { useEffect, useState } from "react";
import { fmtMoney } from "../../utils/formatters.js";
import { referenciaOferta, datosCompania, MINIMO_CASOS } from "../../utils/referenciaOferta.js";
import { CULPA_CONCURRENCIA } from "../../constants.js";

const COLOR = { en_linea: "var(--ok)", cerca: "var(--warn)", abajo: "var(--bad)" };
const TITULO = { en_linea: "En línea con lo que suele pagar", cerca: "Cerca de lo que suele pagar", abajo: "Por debajo de lo que suele pagar" };

// Debajo de las ofertas: compara el último ofrecimiento sin responder con lo que la compañía cerró en los otros casos.
export default function ReferenciaOferta({ caso, monto, Th }) {
  const cia = caso.compania_aseguradora;
  const [datos, setDatos] = useState(undefined); // undefined = cargando, null = no se pudo leer
  useEffect(() => { let vivo = true; setDatos(undefined); datosCompania(cia).then(d => { if (vivo) setDatos(d); }); return () => { vivo = false; }; }, [cia]);

  if (!cia || !datos) return null;
  const r = referenciaOferta({ caso, monto, casosCompania: datos.casos, ofertasPorCaso: datos.ofertas });
  if (!r) return null;

  const color = COLOR[r.veredicto] || "var(--border)";
  const casos = n => `${n} ${n === 1 ? "caso" : "casos"}`;
  let titulo, texto;
  if (r.tipo === "franquicia") {
    titulo = "Franquicia";
    texto = "La franquicia se paga entera: comparala con la que figura en la póliza.";
  } else if (!r.veredicto) {
    titulo = "Pocos casos para comparar";
    texto = r.n
      ? `${cia} cerró ${casos(r.n)} en ${r.cierre}% del reclamo; esta oferta es ${r.pctOferta}%. Con menos de ${MINIMO_CASOS} casos cerrados no se sugiere nada.`
      : `Todavía no hay casos cerrados de ${cia} para comparar.`;
  } else {
    titulo = TITULO[r.veredicto];
    const comparacion = `Esta oferta es ${r.pctOferta}% del reclamo; ${cia} cerró en ${r.cierre}% (mediana de ${casos(r.n)}).`;
    const subio = r.nSuba ? ` Entre la primera y la última oferta suele subir ${r.suba}% (${casos(r.nSuba)}).` : "";
    texto = r.veredicto === "en_linea" ? `${comparacion} Aceptar es razonable.`
      : r.veredicto === "cerca" ? `${comparacion} Se puede pedir una mejora chica, hasta unos ${fmtMoney(r.montoHabitual)}.${subio}`
      : `${comparacion} Conviene pedir reconsideración: suele llegar a unos ${fmtMoney(r.montoHabitual)}.${subio}`;
  }
  const concurrencia = caso.tipo_reclamo === "concurrencia"
    ? ` Medido sobre la parte del tercero (${Number(caso.porcentaje_culpa) || CULPA_CONCURRENCIA}%).` : "";

  return (
    <div role="note" style={{ borderLeft: `3px solid ${color}`, background: "var(--card2)", borderRadius: "var(--r-sm)", padding: "10px 12px", marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: r.veredicto ? color : Th.text }}>¿Conviene aceptar? · {titulo}</div>
      <div style={{ fontSize: 13, color: Th.sub, marginTop: 4, lineHeight: 1.45 }}>{texto}{concurrencia}</div>
      <div style={{ fontSize: 11, color: Th.muted, marginTop: 4 }}>Referencia con los casos del estudio, no una regla.</div>
    </div>
  );
}

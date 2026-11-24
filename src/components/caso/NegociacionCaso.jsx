import { useEffect, useState } from "react";
import { fmtMoney, fmtDate } from "../../utils/formatters.js";
import { cargarOfertas } from "../../utils/ofertas.js";
import { referenciaOferta, datosCompania } from "../../utils/referenciaOferta.js";
import { INSTANCIAS } from "../../constants.js";

const num = v => Number(v) || 0;
const COLOR = { en_linea: "var(--ok)", cerca: "var(--warn)", abajo: "var(--bad)" };
const TITULO = { en_linea: "En línea con lo habitual.", cerca: "Cerca de lo habitual.", abajo: "Por debajo de lo habitual." };
const instanciaDe = k => INSTANCIAS.find(i => i.key === k)?.label.toLowerCase();

// "La negociación" (Resumen de la ficha, estilo Tinta y oro): lo reclamado contra cada ofrecimiento en barras,
// con una marca dorada en lo que esa compañía suele cerrar en los casos del estudio, y el veredicto en una línea.
// Mismo cálculo que "¿Conviene aceptar?" (utils/referenciaOferta.js). Sin reclamado o sin ofertas no se muestra.
export default function NegociacionCaso({ casoId, formData, irA, Th }) {
  const [ofertas, setOfertas] = useState(null);
  const [datos, setDatos] = useState(null);
  const cia = formData.compania_aseguradora;
  const ultimoCargado = num(formData.monto_ofrecimiento);

  // Se recarga cuando cambia el último ofrecimiento (se cargó una oferta nueva en Montos)
  useEffect(() => { let vivo = true; if (casoId) cargarOfertas(casoId).then(o => { if (vivo) setOfertas(o || []); }); return () => { vivo = false; }; }, [casoId, ultimoCargado]);
  useEffect(() => { let vivo = true; datosCompania(cia).then(d => { if (vivo) setDatos(d); }); return () => { vivo = false; }; }, [cia]);

  const reclamado = num(formData.monto_reclamado);
  const lista = (ofertas || []).filter(o => num(o.monto) > 0);
  if (!reclamado || formData.tipo_reclamo === "franquicia") return null;
  // Sin historial cargado pero con un ofrecimiento en la ficha: se muestra ese solo
  const barras = lista.length ? lista : ultimoCargado ? [{ id: "ultimo", monto: ultimoCargado, fecha: formData.fecha_ofrecimiento }] : [];
  if (!barras.length) return null;

  const ultima = num(barras[barras.length - 1].monto);
  const ref = datos ? referenciaOferta({ caso: formData, monto: ultima, casosCompania: datos.casos, ofertasPorCaso: datos.ofertas }) : null;
  const escala = Math.max(reclamado, ...barras.map(o => num(o.monto)), ref?.montoHabitual || 0);
  const ancho = v => `${Math.max(2, Math.round((num(v) / escala) * 100))}%`;
  const marca = ref?.veredicto ? ancho(ref.montoHabitual) : null;
  const casos = n => `${n} ${n === 1 ? "caso" : "casos"}`;

  const fila = { display: "grid", gridTemplateColumns: "minmax(0, 132px) minmax(0, 1fr) auto", gap: 12, alignItems: "center" };
  const pista = { position: "relative", height: 12, borderRadius: 6, background: "var(--card2)" };

  return (
    <section aria-label="La negociación" style={{ background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-md)", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span className="display" style={{ fontSize: 16, fontWeight: 600, color: Th.text }}>La negociación</span>
        <button type="button" onClick={() => irA("montos")} style={{ background: "none", border: "none", color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}>Ofertas →</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={fila}>
          <span style={{ fontSize: 13, color: Th.sub }}>Reclamado</span>
          <span style={pista}><span style={{ position: "absolute", inset: 0, width: ancho(reclamado), borderRadius: 6, background: "var(--border2)" }} /></span>
          <b className="num" style={{ fontSize: 14, fontWeight: 600, textAlign: "right" }}>{fmtMoney(reclamado)}</b>
        </div>
        {barras.map((o, i) => {
          const esUltima = i === barras.length - 1;
          return (
            <div key={o.id || i} style={fila}>
              <span style={{ fontSize: 13, color: Th.sub, minWidth: 0 }}>
                {barras.length > 1 ? `${i + 1}.º ofrecimiento` : "Ofrecimiento"}
                <span style={{ display: "block", fontSize: 11.5, color: Th.muted }}>{[instanciaDe(o.instancia), o.fecha && fmtDate(o.fecha)].filter(Boolean).join(" · ")}</span>
              </span>
              <span style={pista}>
                <span style={{ position: "absolute", inset: 0, width: ancho(o.monto), borderRadius: 6, background: esUltima ? "var(--e-con_ofrecimiento)" : "color-mix(in srgb, var(--e-con_ofrecimiento) 55%, transparent)" }} />
                {esUltima && marca && <span aria-hidden="true" title={`Lo que ${cia} suele cerrar en tus casos`} style={{ position: "absolute", left: marca, top: -5, width: 2, height: 22, borderRadius: 1, background: "var(--oro)" }} />}
              </span>
              <b className="num" style={{ fontSize: 14, fontWeight: 600, textAlign: "right", color: esUltima ? Th.text : Th.sub }}>{fmtMoney(o.monto)}</b>
            </div>
          );
        })}
      </div>

      {ref?.tipo === "comparacion" && (
        <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "12px 14px", borderRadius: "var(--r-sm)", background: Th.card2, flexWrap: "wrap" }}>
          <span className="cifra num" style={{ fontSize: 30, color: COLOR[ref.veredicto] || Th.text }}>{ref.pctOferta}%</span>
          <span style={{ flex: "1 1 220px", fontSize: 13, lineHeight: 1.5, color: Th.sub }}>
            {ref.veredicto
              ? <><b style={{ color: Th.text }}>{TITULO[ref.veredicto]}</b> {cia} cerró en {ref.cierre}% del reclamo (mediana de {casos(ref.n)}){ref.veredicto !== "en_linea" ? `; suele llegar a unos ${fmtMoney(ref.montoHabitual)}.` : "."}</>
              : <>del reclamo. {ref.n ? `${cia} cerró ${casos(ref.n)}: pocos para comparar.` : `Todavía no hay casos cerrados de ${cia} para comparar.`}</>}
          </span>
        </div>
      )}
      {marca && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: Th.muted }}>
          <span aria-hidden="true" style={{ width: 2, height: 12, background: "var(--oro)", borderRadius: 1 }} /> Lo que {cia} suele cerrar en tus casos
        </div>
      )}
    </section>
  );
}

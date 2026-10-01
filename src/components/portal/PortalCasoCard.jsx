import { useEffect, useState } from "react";
import { fmtDate, fmtMoney } from "./portalTheme.js";
import { subirArchivosYNotificar } from "../../utils/portalStorageUtils.js";
import BarraAvance from "../ui/BarraAvance.jsx";
import EstadoPill from "../ui/EstadoPill.jsx";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";
import ModalGenerarEscrito from "../caso/ModalGenerarEscrito.jsx";
import { THEME } from "../../utils/theme.js";
import { diasDesde, primerNombre } from "../../utils/formatters.js";
import { linkWhatsApp, linkVistaCliente, clientePuedeEntrar, TELEFONO_ESTUDIO } from "../../utils/mensajes.js";
import { adjuntosDelCaso } from "../../utils/adjuntosPas.js";
import SelectorArchivos from "./SelectorArchivos.jsx";
import { fechaPagoEstimada } from "../../utils/vistaCliente.js";

// Último movimiento del caso: lo más nuevo entre la bitácora que ve el PAS y las fechas que se actualizan con lo interno
// (reiteraciones, próxima acción), así un reclamo reiterado no figura como quieto
const ultimoMovimiento = c => [c.movimientos?.[0]?.fecha, c.fecha_ultimo_movimiento, c.fecha_ultimo_reclamo, c.fecha_reclamo, c.fecha_inicio_reclamo]
  .map(f => String(f || "").slice(0, 10)).filter(Boolean).sort().pop() || null;

// Una línea con lo que sigue y cuándo, para contestarle al cliente sin abrir nada
function queSigue(caso, plazoCia) {
  const cia = caso.compania_aseguradora || "La compañía";
  if (caso.estado === "reclamado") {
    const desde = ultimoMovimiento(caso);
    const d = desde ? diasDesde(desde) : null;
    if (d === null) return plazoCia ? `${cia} suele responder en unos ${plazoCia} días` : null;
    const cuando = d <= 0 ? "hoy" : `hace ${d} ${d === 1 ? "día" : "días"}`;
    return `Reclamado · último movimiento ${cuando}${plazoCia ? ` · ${cia} suele responder en unos ${plazoCia} días` : ""}`;
  }
  if (caso.estado === "con_ofrecimiento") {
    return Number(caso.monto_ofrecimiento) > 0 ? `Ofrecieron ${fmtMoney(caso.monto_ofrecimiento)}` : `${cia} hizo un ofrecimiento`;
  }
  if (caso.estado === "esperando_pago") {
    const fecha = fechaPagoEstimada(caso);
    if (!fecha) return "Hay acuerdo · fecha de pago a confirmar";
    const d = -diasDesde(fecha);
    return `Pago estimado ${fmtDate(fecha)} · ${d > 0 ? `en ${d} días` : d === 0 ? "hoy" : `vencido hace ${-d} días`}`;
  }
  return null;
}

const FECHAS = [
  { k: "fecha_derivacion", l: "Derivación" },
  { k: "fecha_inicio_reclamo", l: "Inicio del reclamo" },
  { k: "fecha_ofrecimiento", l: "Ofrecimiento" },
  { k: "fecha_mediacion", l: "Mediación" },
  { k: "fecha_pago", l: "Pago" },
  { k: "fecha_cobro", l: "Cobro" },
];
const MONTOS = [
  { k: "monto_ofrecimiento", l: "Ofrecimiento" },
  { k: "monto_cobro_asegurado", l: "Cobró el asegurado" },
  { k: "monto_comision_pas", l: "Tu comisión", destacado: true },
];

// Tarjeta de un caso en el portal del PAS: lo esencial arriba, el detalle al tocar
export default function PortalCasoCard({ caso, pasNombre, proximoEvento, plazoCia }) {
  const [open, setOpen] = useState(false);
  const [escrito, setEscrito] = useState(false);
  const abierto = !["cobrado", "desistido"].includes(caso.estado) && !caso._demo;
  const sigue = queSigue(caso, plazoCia);
  // El cliente entra a su vista con la patente y los últimos 3 números del DNI: hacen falta los dos
  const puedeSeguirlo = abierto && clientePuedeEntrar(caso);
  const textoCliente = `Hola ${primerNombre(caso.asegurado || "")}, podés seguir cómo va tu reclamo cuando quieras en ${linkVistaCliente(caso.patente)} (entrás con la patente y los últimos 3 números de tu DNI).`;
  const linkCliente = puedeSeguirlo ? (linkWhatsApp(caso.telefono_asegurado, textoCliente) || `https://wa.me/?text=${encodeURIComponent(textoCliente)}`) : null;
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo, texto }
  const [archivos, setArchivos] = useState([]);
  const [enviados, setEnviados] = useState(null); // lo que ya mandó el PAS (null = no se puede ver: falta el SQL 29)
  // El escrito para que firme el asegurado sirve hasta que se reclama
  const conEscrito = ["doc_pendiente", "iniciado", "reclamado"].includes(caso.estado) && !caso._demo;
  // Consulta por WhatsApp con el caso ya identificado
  const consulta = linkWhatsApp(TELEFONO_ESTUDIO, `Hola Alexis, te consulto por el caso de ${caso.asegurado || "mi asegurado"}${[caso.patente, caso.compania_aseguradora].filter(Boolean).length ? ` (${[caso.patente, caso.compania_aseguradora].filter(Boolean).join(", ")})` : ""}: `);

  const cargarEnviados = () => adjuntosDelCaso(caso.pas_id, caso.id).then(r => setEnviados(r ? r.delCaso : null));
  useEffect(() => { if (open && !caso._demo) cargarEnviados(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const historial = [...(caso.movimientos || [])].sort((a, b) => b.ts - a.ts);
  const ultima = historial[0];
  const fechas = FECHAS.filter(f => caso[f.k]);
  const montos = MONTOS.filter(f => Number(caso[f.k]) > 0);

  const subir = async () => {
    if (!archivos.length) return;
    setSubiendo(true);
    setAviso(null);
    try {
      const { subidos, fallidos } = await subirArchivosYNotificar({
        pasId: caso.pas_id,
        casoId: caso.id,
        pasNombre: pasNombre || "Productor",
        casoData: {
          asegurado: caso.asegurado + " (NUEVA DOCUMENTACIÓN)",
          telefono: caso.telefono_asegurado || caso.tercero_contacto || "Ya registrado",
          fecha_siniestro: caso.fecha_siniestro || "Ya registrada",
          compania: caso.compania_aseguradora,
        },
        archivos,
      });
      if (!subidos.length) throw new Error("no se subió ningún archivo");
      setAviso(fallidos.length
        ? { tipo: "error", texto: `Se mandaron ${subidos.length}; ${fallidos.length === 1 ? "uno no se pudo subir" : `${fallidos.length} no se pudieron subir`} (${fallidos.join(", ")}). Probá de nuevo con esos.` }
        : { tipo: "ok", texto: `${subidos.length === 1 ? "Archivo enviado" : `${subidos.length} archivos enviados`}. Ya le avisamos al estudio.` });
      setArchivos(a => a.filter(f => fallidos.includes(f.name)));
      cargarEnviados();
    } catch (err) {
      console.error("Error al subir:", err);
      setAviso({ tipo: "error", texto: "No se pudo subir. Revisá la conexión y probá de nuevo." });
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <article style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-1)", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)", overflowWrap: "anywhere" }}>{caso.asegurado || "Sin nombre"}</h3>
            <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {caso.compania_aseguradora && <span>{caso.compania_aseguradora}</span>}
              {caso.patente && <span style={{ fontFamily: "var(--mono)" }}>{caso.patente}</span>}
              {caso.fecha_derivacion && <span>derivado {fmtDate(caso.fecha_derivacion)}</span>}
            </div>
          </div>
          <EstadoPill estado={caso.estado} size="sm" />
        </div>

        <BarraAvance estado={caso.estado} conPill={false} conEtiquetas />

        {sigue && <div className="num" style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{sigue}</div>}

        {proximoEvento && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text)", background: "color-mix(in srgb, var(--info) 10%, var(--card))", border: "1px solid color-mix(in srgb, var(--info) 30%, transparent)", borderRadius: "var(--r-sm)", padding: "8px 10px" }}>
            <Icono nombre="calendario" size={16} />
            <span><b>{proximoEvento.tipo === "audiencia" ? "Audiencia" : "Mediación"}:</b> <span className="num">{new Date(proximoEvento.inicio).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}, {new Date(proximoEvento.inicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} hs</span></span>
          </div>
        )}

        {caso.origen === "portal" && (
          <div style={{ fontSize: 12, color: caso.revisado_en ? "var(--ok)" : "var(--muted)" }}>
            {caso.revisado_en ? `✓ El estudio tomó el caso el ${fmtDate(String(caso.revisado_en).slice(0, 10))}` : "Recibido · el estudio todavía no lo abrió"}
          </div>
        )}

        {caso.mensaje_cliente && (
          <div style={{ background: "color-mix(in srgb, var(--accent) 9%, var(--card))", borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-ink)", marginBottom: 3 }}>Mensaje del estudio</div>
            <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.45 }}>{caso.mensaje_cliente}</div>
          </div>
        )}

        {ultima && (
          <div style={{ fontSize: 13, color: "var(--sub)" }}>
            <span className="num" style={{ color: "var(--muted)" }}>{fmtDate(ultima.fecha)} · </span>{ultima.texto}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
            style={{ background: "none", border: "none", padding: 0, color: "var(--accent-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
            {open ? "Ocultar detalle" : "Detalle y documentación"}
          </button>
          <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
            {linkCliente && (
              <a href={linkCliente} target="_blank" rel="noreferrer" title="Le manda por WhatsApp el link para que siga el caso solo"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, textDecoration: "none", color: "var(--text)", background: "var(--card)", border: "1px solid var(--border2)", whiteSpace: "nowrap" }}>
                <Icono nombre="mensaje" size={14} />Pasale el seguimiento al cliente
              </a>
            )}
            {conEscrito && <Boton tamaño="sm" icono="escrito" onClick={() => setEscrito(true)}>Generar escrito</Boton>}
            {consulta && !caso._demo && (
              <a href={consulta} target="_blank" rel="noreferrer" title="Te abre WhatsApp con el caso ya identificado"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, textDecoration: "none", color: "var(--text)", background: "var(--card)", border: "1px solid var(--border2)", whiteSpace: "nowrap" }}>
                <Icono nombre="telefono" size={14} />Consultar al estudio
              </a>
            )}
          </span>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--border)", background: "var(--card2)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {montos.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
              {montos.map(m => (
                <div key={m.k} style={{ background: "var(--card)", borderRadius: "var(--r-sm)", padding: "8px 10px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 12, color: "var(--sub)" }}>{m.l}</div>
                  <div className="num" style={{ fontSize: 16, fontWeight: 700, color: m.destacado ? "var(--accent-ink)" : "var(--text)" }}>{fmtMoney(caso[m.k])}</div>
                  {m.k === "monto_comision_pas" && caso.fecha_pago_comision !== undefined && (
                    <div className="num" style={{ fontSize: 12, color: caso.fecha_pago_comision ? "var(--ok)" : "var(--muted)" }}>{caso.fecha_pago_comision ? `Pagada el ${fmtDate(caso.fecha_pago_comision)}` : "Pendiente"}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {fechas.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 13 }}>
              {fechas.map(f => (
                <span key={f.k}><span style={{ color: "var(--muted)" }}>{f.l}: </span><span className="num" style={{ color: "var(--text)" }}>{fmtDate(caso[f.k])}</span></span>
              ))}
            </div>
          )}

          {historial.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Movimientos</div>
              {historial.map((n, i) => (
                <div key={n.ts || i} style={{ display: "grid", gridTemplateColumns: "64px minmax(0, 1fr)", gap: 8, padding: "5px 0", borderTop: i ? "1px solid var(--border)" : "none", fontSize: 13 }}>
                  <span className="num" style={{ color: "var(--muted)" }}>{fmtDate(n.fecha)}</span>
                  <span style={{ color: "var(--sub)" }}>{n.texto}</span>
                </div>
              ))}
            </div>
          )}

          {enviados?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Documentación que mandaste ({enviados.length})</div>
              {enviados.map((a, i) => (
                <div key={a.ruta} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "5px 0", borderTop: i ? "1px solid var(--border)" : "none", fontSize: 13 }}>
                  <span style={{ color: "var(--sub)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nombre}</span>
                  <span className="num" style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{fmtDate(String(a.creado || "").slice(0, 10))}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Adjuntar documentación</div>
            <SelectorArchivos archivos={archivos} onChange={setArchivos} disabled={subiendo || caso._demo} />
            {archivos.length > 0 && (
              <Boton variante="primario" icono="adjuntar" onClick={subir} disabled={subiendo} style={{ marginTop: 10 }}>
                {subiendo ? "Enviando…" : `Enviar ${archivos.length === 1 ? "1 archivo" : `${archivos.length} archivos`} al estudio`}
              </Boton>
            )}
            {aviso && (
              <div role="status" style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: aviso.tipo === "ok" ? "var(--ok)" : "var(--bad)" }}>{aviso.texto}</div>
            )}
          </div>
        </div>
      )}
      {/* El mismo modal y el mismo escrito que usa el estudio en la ficha del caso */}
      <ModalGenerarEscrito isOpen={escrito} onClose={() => setEscrito(false)} caso={caso} dniInicial={caso.dni_asegurado || ""} Th={THEME()}
        onSuccess={() => { setOpen(true); setAviso({ tipo: "ok", texto: "Escrito descargado. Imprimilo y que lo firme el asegurado." }); }}
        onError={msg => { setOpen(true); setAviso({ tipo: "error", texto: msg }); }} />
    </article>
  );
}

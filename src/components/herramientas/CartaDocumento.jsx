import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../../supabase.js";
import { generarCarta, fechaCarta, completarModelo, MODELOS_BASE, LINEAS_MAXIMAS } from "../../utils/cartaDocumento.js";
import { abrirPdf, dibujarPagina, canvasABlob } from "../../utils/pdfjs.js";
import { elegirDestino, escribirEn, puedeElegirDestino } from "../../utils/pdfEditor.js";
import { fechaLocalISO } from "../../utils/formatters.js";
import Boton from "../ui/Boton.jsx";
import { useDirectorio, guardarCompania, nombreLegal, domicilioDe } from "../../utils/companias.js";
import { abrirCompania } from "../../utils/companiaAbierta.js";

const VACIO = { nombre: "", domicilio: "", cp: "", localidad: "", provincia: "" };
const CLAVE_AJUSTE = "carta_documento_ajuste"; // corrimiento de la impresora: queda en esta compu
const leerAjuste = () => { try { return { x: 0, y: 0, ...JSON.parse(localStorage.getItem(CLAVE_AJUSTE) || "{}") }; } catch { return { x: 0, y: 0 }; } };

const campo = { padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", width: "100%" };
const etiqueta = { display: "block", fontSize: 12, color: "var(--sub)", marginBottom: 3 };
const tarjeta = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 14, display: "flex", flexDirection: "column", gap: 10 };
const titulo = { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--muted)" };

function Persona({ valor, onChange, sugerencias }) {
  const cambiar = (k, v) => onChange({ ...valor, [k]: v });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8 }}>
      <label style={{ gridColumn: "span 6" }}><span style={etiqueta}>Nombre y apellido / razón social</span>
        <input value={valor.nombre} onChange={e => cambiar("nombre", e.target.value)} list={sugerencias ? "companias-carta" : undefined} style={campo} /></label>
      <label style={{ gridColumn: "span 6" }}><span style={etiqueta}>Domicilio</span>
        <input value={valor.domicilio} onChange={e => cambiar("domicilio", e.target.value)} style={campo} /></label>
      <label style={{ gridColumn: "span 2" }}><span style={etiqueta}>CP</span>
        <input value={valor.cp} onChange={e => cambiar("cp", e.target.value)} style={campo} /></label>
      <label style={{ gridColumn: "span 2" }}><span style={etiqueta}>Localidad</span>
        <input value={valor.localidad} onChange={e => cambiar("localidad", e.target.value)} style={campo} /></label>
      <label style={{ gridColumn: "span 2" }}><span style={etiqueta}>Provincia</span>
        <input value={valor.provincia} onChange={e => cambiar("provincia", e.target.value)} style={campo} /></label>
    </div>
  );
}

// Carta documento para imprimir sobre el formulario preimpreso de Correo Argentino.
export default function CartaDocumento({ allCasos = [] }) {
  const [caso, setCaso] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [tipoRem, setTipoRem] = useState("estudio"); // cliente | estudio
  const [rem, setRem] = useState(VACIO);
  const [dest, setDest] = useState(VACIO);
  const [lugar, setLugar] = useState("");
  const [fecha, setFecha] = useState(fechaLocalISO());
  const [texto, setTexto] = useState("");
  const [firma, setFirma] = useState(["", ""]);
  const [ajuste, setAjuste] = useState(leerAjuste);
  const [referencias, setReferencias] = useState(false);
  const dir = useDirectorio(); // directorio de compañías (pestaña Compañías)
  const [ciaDest, setCiaDest] = useState(null); // nombre corto de la compañía destinataria, si es una
  const [misDatos, setMisDatos] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [vista, setVista] = useState(null);
  const [renglones, setRenglones] = useState(0);
  const [aviso, setAviso] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const urlVista = useRef(null);

  // Datos guardados (si falta el SQL 27, la carta igual funciona, solo no recuerda domicilios)
  useEffect(() => {
    supabase.from("pas_ajustes").select("valor").eq("clave", "remitente_estudio").maybeSingle().then(({ data }) => {
      if (data?.valor) { setMisDatos(data.valor); setRem(r => (r.nombre ? r : { ...VACIO, ...data.valor })); setFirma(f => (f[0] ? f : [data.valor.nombre || "", data.valor.firma2 || ""])); setLugar(l => l || data.valor.localidad || ""); }
    });
    cargarModelos();
  }, []);
  const cargarModelos = () => supabase.from("modelos_carta").select("id, titulo, texto").order("titulo").then(({ data }) => setModelos(data || []));

  useEffect(() => { try { localStorage.setItem(CLAVE_AJUSTE, JSON.stringify(ajuste)); } catch { /* sin almacenamiento */ } }, [ajuste]);

  // Busca por nombre corto o por razón social
  const companias = useMemo(() => Object.values(dir?.fichas || {}), [dir]);
  const datosCompania = nombre => {
    const n = (nombre || "").trim().toLowerCase();
    return n ? companias.find(c => c.compania.toLowerCase() === n || (c.razon_social || "").trim().toLowerCase() === n) : null;
  };
  // Destinatario = la compañía: razón social y domicilio de su ficha
  const destinoCompania = (cia, nombreCorto) => ({ nombre: nombreLegal(cia, nombreCorto), ...domicilioDe(cia) });
  const cambiarDest = v => {
    const c = v.nombre !== dest.nombre ? datosCompania(v.nombre) : null;
    if (c) { setCiaDest(c.compania); setDest({ ...destinoCompania(c), ...Object.fromEntries(Object.entries(v).filter(([k, x]) => k !== "nombre" && x)) }); return; }
    if (v.nombre !== dest.nombre) setCiaDest(null);
    setDest(v);
  };

  const elegirCaso = c => {
    setCaso(c); setBusqueda("");
    const comp = datosCompania(c.compania_aseguradora);
    setCiaDest(c.compania_aseguradora || null);
    setDest(destinoCompania(comp, c.compania_aseguradora || ""));
    if (tipoRem === "cliente") usarCliente(c);
    if (texto) setTexto(completarModelo(texto, c));
  };
  const usarCliente = (c = caso) => {
    setTipoRem("cliente");
    if (!c) return;
    const r = { nombre: c.asegurado || "", domicilio: c.domicilio_asegurado || "", cp: c.cp_asegurado || "", localidad: c.localidad_asegurado || "", provincia: c.provincia_asegurado || "" };
    setRem(r); setLugar(r.localidad);
    setFirma([c.asegurado || "", c.dni_asegurado ? `DNI ${c.dni_asegurado}` : ""]);
  };
  const usarEstudio = () => {
    setTipoRem("estudio");
    if (misDatos) { setRem({ ...VACIO, ...misDatos }); setLugar(misDatos.localidad || ""); setFirma([misDatos.nombre || "", misDatos.firma2 || ""]); }
  };
  const guardarMisDatos = async () => {
    const valor = { ...rem, firma2: firma[1] };
    const { error } = await supabase.from("pas_ajustes").upsert({ clave: "remitente_estudio", valor, actualizado: new Date().toISOString() });
    setAviso(error ? { error: "No se pudo guardar (¿falta el SQL 27?)." } : { ok: "Tus datos de remitente quedaron guardados." });
    if (!error) setMisDatos(valor);
  };

  const coincidencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (q.length < 2) return [];
    return allCasos.filter(c => [c.asegurado, c.patente, c.nro_siniestro, c.compania_aseguradora].some(v => String(v || "").toLowerCase().includes(q))).slice(0, 8);
  }, [busqueda, allCasos]);

  const todosLosModelos = [...MODELOS_BASE, ...modelos.map(m => ({ ...m, propio: true }))];
  const usarModelo = id => { const m = todosLosModelos.find(x => String(x.id) === id); if (m) setTexto(completarModelo(m.texto, caso)); };
  const guardarModelo = async () => {
    const t = window.prompt("Nombre del modelo:");
    if (!t?.trim()) return;
    const { error } = await supabase.from("modelos_carta").insert({ titulo: t.trim(), texto });
    setAviso(error ? { error: "No se pudo guardar el modelo (¿falta el SQL 27?)." } : { ok: `Modelo "${t.trim()}" guardado.` });
    cargarModelos();
  };
  const borrarModelo = async m => {
    if (!window.confirm(`¿Borrar el modelo "${m.titulo}"?`)) return;
    await supabase.from("modelos_carta").delete().eq("id", m.id);
    cargarModelos();
  };

  const datos = { remitente: rem, destinatario: dest, fecha: fechaCarta(lugar.trim() || rem.localidad, fecha), cuerpo: texto, firma };
  const opciones = { corrimientoX: Number(ajuste.x) || 0, corrimientoY: Number(ajuste.y) || 0, referencias };

  // Vista previa: el PDF real dibujado con pdf.js
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const { bytes, renglones: n } = await generarCarta(datos, opciones);
        const doc = await abrirPdf(bytes);
        const { canvas } = await dibujarPagina(doc, 0, { ancho: 900 });
        doc.destroy();
        const url = URL.createObjectURL(await canvasABlob(canvas, "image/png"));
        if (!vivo) { URL.revokeObjectURL(url); return; }
        if (urlVista.current) URL.revokeObjectURL(urlVista.current);
        urlVista.current = url;
        setVista(url); setRenglones(n);
      } catch (e) { console.error("[carta] vista previa:", e); }
    }, 350);
    return () => { vivo = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(datos), JSON.stringify(opciones)]);
  useEffect(() => () => { if (urlVista.current) URL.revokeObjectURL(urlVista.current); }, []);

  // La próxima vez, los domicilios se completan solos
  const recordarDomicilios = async () => {
    const d = { domicilio: dest.domicilio || null, cp: dest.cp || null, localidad: dest.localidad || null, provincia: dest.provincia || null };
    // Solo si es una compañía y su ficha todavía no tiene domicilio (no pisa lo que cargaste en Compañías)
    const ficha = ciaDest && datosCompania(ciaDest);
    if (ciaDest && dest.domicilio && !ficha?.domicilio) await guardarCompania(ciaDest, d);
    if (caso && tipoRem === "cliente" && rem.domicilio)
      await supabase.from("pas_casos").update({ domicilio_asegurado: rem.domicilio, cp_asegurado: rem.cp || null, localidad_asegurado: rem.localidad || null, provincia_asegurado: rem.provincia || null }).eq("id", caso.id);
  };

  const nombreArchivo = `Carta documento - ${(dest.nombre || "destinatario").trim()} - ${fecha.split("-").reverse().join("-")}.pdf`;

  const imprimir = async () => {
    setTrabajando(true); setAviso(null);
    try {
      const { bytes } = await generarCarta(datos, opciones);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0";
      iframe.src = url;
      iframe.onload = () => setTimeout(() => {
        try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch { window.open(url, "_blank"); }
      }, 300);
      document.body.appendChild(iframe);
      setTimeout(() => { iframe.remove(); URL.revokeObjectURL(url); }, 120000);
      recordarDomicilios();
    } catch (e) { setAviso({ error: `No se pudo generar: ${e.message}` }); }
    setTrabajando(false);
  };

  const guardar = async () => {
    setAviso(null);
    let destino;
    try { destino = await elegirDestino(nombreArchivo); } catch (e) { setAviso({ error: e.message }); return; }
    if (!destino) return;
    setTrabajando(true);
    try {
      const { bytes } = await generarCarta(datos, opciones);
      const n = await escribirEn(destino, bytes, nombreArchivo);
      setAviso({ ok: `${destino === "descargar" ? "Descargada" : "Guardada"}: ${n}` });
      recordarDomicilios();
    } catch (e) { setAviso({ error: `No se pudo guardar: ${e.message}` }); }
    setTrabajando(false);
  };

  const pasado = renglones > LINEAS_MAXIMAS;

  return (
    <div className="carta-cuerpo" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.8fr)", gap: 16, alignItems: "start" }}>
      <datalist id="companias-carta">{companias.map(c => <option key={c.compania} value={c.razon_social || c.compania}>{c.razon_social ? c.compania : ""}</option>)}</datalist>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={tarjeta}>
          <div style={titulo}>Caso (opcional)</div>
          {caso ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}><b>{caso.asegurado}</b>{caso.patente ? ` · ${caso.patente}` : ""}{caso.compania_aseguradora ? ` · ${caso.compania_aseguradora}` : ""}</span>
              <Boton tamaño="sm" variante="fantasma" onClick={() => setCaso(null)}>Quitar</Boton>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por asegurado, patente o siniestro para completar los datos" style={campo} />
              {coincidencias.length > 0 && (
                <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 20, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", boxShadow: "var(--shadow)", marginTop: 4, overflow: "hidden" }}>
                  {coincidencias.map(c => (
                    <button key={c.id} type="button" onClick={() => elegirCaso(c)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", font: "inherit", fontSize: 13, color: "var(--text)" }}>
                      <b>{c.asegurado || "Sin nombre"}</b> <span style={{ color: "var(--muted)" }}>{[c.patente, c.compania_aseguradora].filter(Boolean).join(" · ")}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={tarjeta}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={titulo}>Remitente</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Boton tamaño="sm" variante={tipoRem === "estudio" ? "secundario" : "fantasma"} onClick={usarEstudio}>Yo (el estudio)</Boton>
              <Boton tamaño="sm" variante={tipoRem === "cliente" ? "secundario" : "fantasma"} onClick={() => usarCliente()} disabled={!caso} title={caso ? "" : "Elegí un caso primero"}>El cliente del caso</Boton>
            </div>
          </div>
          <Persona valor={rem} onChange={setRem} />
          {tipoRem !== "cliente" && <div><Boton tamaño="sm" variante="fantasma" onClick={guardarMisDatos}>Guardar como mis datos</Boton></div>}
        </div>

        <div style={tarjeta}>
          <div style={titulo}>Destinatario</div>
          <Persona valor={dest} onChange={cambiarDest} sugerencias />
          {ciaDest && (() => {
            const f = datosCompania(ciaDest);
            const sinDom = !f?.domicilio;
            return (
              <div style={{ fontSize: 12, color: sinDom ? "var(--warn)" : "var(--muted)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {sinDom ? `${ciaDest} no tiene domicilio en su ficha: el que escribas acá se guarda al imprimir.` : `Datos de la ficha de ${ciaDest}.`}
                <button type="button" onClick={() => abrirCompania(ciaDest)} style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--accent-ink)", fontWeight: 600, cursor: "pointer" }}>{sinDom ? "Completar ficha" : "Ver ficha"}</button>
              </div>
            );
          })()}
        </div>

        <div style={tarjeta}>
          <div style={titulo}>Texto</div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 150px", gap: 8 }}>
            <label><span style={etiqueta}>Lugar</span><input value={lugar} onChange={e => setLugar(e.target.value)} placeholder={rem.localidad || "Localidad"} style={campo} /></label>
            <label><span style={etiqueta}>Fecha</span><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={campo} /></label>
          </div>
          <label><span style={etiqueta}>Empezar desde un modelo</span>
            <select value="" onChange={e => usarModelo(e.target.value)} style={campo}>
              <option value="">Elegí un modelo…</option>
              {todosLosModelos.map(m => <option key={m.id} value={m.id}>{m.propio ? "★ " : ""}{m.titulo}</option>)}
            </select></label>
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={11} placeholder="Texto de la carta. Lo que queda entre [corchetes] hay que completarlo."
            style={{ ...campo, lineHeight: 1.5, resize: "vertical", borderColor: pasado ? "var(--bad)" : "var(--border)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="num" style={{ fontSize: 12, fontWeight: 600, color: pasado ? "var(--bad)" : "var(--muted)" }}>
              {renglones} de {LINEAS_MAXIMAS} renglones{pasado ? " · no entra en el formulario: acortalo" : ""}
            </span>
            <span style={{ display: "flex", gap: 6 }}>
              {texto.trim() && <Boton tamaño="sm" variante="fantasma" onClick={guardarModelo}>Guardar como modelo</Boton>}
            </span>
          </div>
          {/\[[^\]]+\]/.test(texto) && <div style={{ fontSize: 12, color: "var(--warn)" }}>Quedan datos entre [corchetes] para completar.</div>}
          {modelos.length > 0 && (
            <details><summary style={{ fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>Mis modelos ({modelos.length})</summary>
              {modelos.map(m => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                  <span>{m.titulo}</span>
                  <button type="button" onClick={() => borrarModelo(m)} style={{ background: "none", border: "none", color: "var(--bad)", cursor: "pointer", fontSize: 12 }}>Borrar</button>
                </div>
              ))}
            </details>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label><span style={etiqueta}>Firma (renglón 1)</span><input value={firma[0]} onChange={e => setFirma([e.target.value, firma[1]])} style={campo} /></label>
            <label><span style={etiqueta}>Firma (renglón 2)</span><input value={firma[1]} onChange={e => setFirma([firma[0], e.target.value])} placeholder="DNI 12.345.678" style={campo} /></label>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 12 }}>
        <div style={{ ...tarjeta, padding: 10, alignItems: "center", background: "var(--card2)" }}>
          {vista ? <img src={vista} alt="Vista previa de la carta" style={{ width: "100%", maxWidth: 440, background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,.2)" }} /> : <div style={{ fontSize: 13, color: "var(--muted)", padding: 40 }}>Armando la vista previa…</div>}
        </div>
        <div style={tarjeta}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Boton variante="primario" onClick={imprimir} disabled={trabajando}>Imprimir</Boton>
            <Boton onClick={guardar} disabled={trabajando}>{puedeElegirDestino() ? "Guardar PDF…" : "Descargar PDF"}</Boton>
          </div>
          <div style={{ fontSize: 12, color: "var(--sub)", lineHeight: 1.5 }}>
            Poné el formulario de Correo Argentino en la impresora. En la ventana de impresión elegí papel <b>Oficio / Legal</b> y escala <b>100 %</b> (no "Ajustar a la página").
          </div>
          <details>
            <summary style={{ fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>Si sale corrido: ajuste de impresión</summary>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              <label><span style={etiqueta}>Mover a la derecha (mm)</span><input type="number" step="0.5" value={ajuste.x} onChange={e => setAjuste(a => ({ ...a, x: e.target.value }))} style={campo} /></label>
              <label><span style={etiqueta}>Mover hacia abajo (mm)</span><input type="number" step="0.5" value={ajuste.y} onChange={e => setAjuste(a => ({ ...a, y: e.target.value }))} style={campo} /></label>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Números negativos: a la izquierda / hacia arriba. Queda guardado en esta compu.</div>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--sub)", marginTop: 8 }}>
              <input type="checkbox" checked={referencias} onChange={e => setReferencias(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
              Imprimir con referencias (para probar en una hoja común)
            </label>
          </details>
          {aviso && <div role="status" style={{ fontSize: 13, color: aviso.error ? "var(--bad)" : "var(--ok)" }}>{aviso.error || aviso.ok}</div>}
        </div>
      </div>
    </div>
  );
}

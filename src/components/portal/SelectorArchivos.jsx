import { useRef } from "react";
import Boton from "../ui/Boton.jsx";
import Icono from "../ui/Icono.jsx";

const MAX_MB = 15;
const peso = b => b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
// En celular (pantalla táctil) se ofrece sacar la foto en el momento
const esTactil = () => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

// Elegir fotos o PDF (o sacar la foto con el celular), ver la lista y quitar alguno antes de mandar
export default function SelectorArchivos({ archivos, onChange, disabled }) {
  const elegir = useRef(null);
  const camara = useRef(null);

  const sumar = e => {
    const nuevos = Array.from(e.target.files || []);
    e.target.value = "";
    if (!nuevos.length) return;
    // Sin repetir el mismo archivo si lo eligen dos veces
    const clave = f => `${f.name}|${f.size}`;
    const ya = new Set(archivos.map(clave));
    onChange([...archivos, ...nuevos.filter(f => !ya.has(clave(f)))]);
  };
  const quitar = i => onChange(archivos.filter((_, j) => j !== i));
  const pesados = archivos.filter(f => f.size > MAX_MB * 1024 * 1024 && !f.type.startsWith("image/"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input ref={elegir} type="file" multiple accept="image/*,application/pdf" onChange={sumar} style={{ display: "none" }} />
      <input ref={camara} type="file" accept="image/*" capture="environment" onChange={sumar} style={{ display: "none" }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {esTactil() && <Boton icono="camara" onClick={() => camara.current?.click()} disabled={disabled}>Sacar foto</Boton>}
        <Boton icono="adjuntar" onClick={() => elegir.current?.click()} disabled={disabled}>{esTactil() ? "Elegir archivos" : "Elegir fotos o PDF"}</Boton>
      </div>
      {archivos.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {archivos.map((f, i) => (
            <li key={`${f.name}-${f.size}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--border)", fontSize: 13 }}>
              <Icono nombre={f.type === "application/pdf" ? "escrito" : "camara"} size={14} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{f.name}</span>
              <span className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{peso(f.size)}</span>
              <button type="button" onClick={() => quitar(i)} disabled={disabled} aria-label={`Quitar ${f.name}`}
                style={{ background: "none", border: "none", padding: 2, cursor: "pointer", color: "var(--muted)", display: "flex" }}><Icono nombre="cerrar" size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <span style={{ fontSize: 12, color: pesados.length ? "var(--warn)" : "var(--muted)" }}>
        {pesados.length ? `${pesados.length === 1 ? "Un PDF pesa" : "Algunos PDF pesan"} más de ${MAX_MB} MB y puede tardar o fallar.` : "Fotos o PDF (DNI, cédula, denuncia, fotos de los daños…). Las fotos se achican solas."}
      </span>
    </div>
  );
}

import { useState } from "react";

const esLinkGmail = v => /^https:\/\/mail\.google\.com\//.test(String(v || "").trim());

// Link a la conversación de Gmail con la compañía: se pega una vez y después se abre con un toque.
// Gmail no se puede mostrar dentro de la app (Google lo bloquea), así que se abre en otra pestaña.
export default function HiloGmail({ formData, onChange, Th }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const caja = { background: Th.card, border: `1px solid ${Th.border}`, borderRadius: "var(--r-md)", padding: "12px 16px" };
  const link = { background: "none", border: "none", padding: 0, font: "inherit", fontSize: 13, fontWeight: 600, color: "var(--accent-ink)", cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap" };

  if (!("hilo_gmail" in formData)) {
    return <div style={{ ...caja, fontSize: 13, color: "var(--warn)" }}>Hilo con la compañía: falta correr el SQL 28 en Supabase.</div>;
  }
  const hilo = formData.hilo_gmail;
  const guardar = () => {
    const v = valor.trim();
    if (v && !esLinkGmail(v)) return;
    onChange("hilo_gmail", v);
    setEditando(false);
  };

  return (
    <div style={caja}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: Th.text }}>Hilo con la compañía</span>
        {hilo && !editando && <button type="button" onClick={() => { setValor(hilo); setEditando(true); }} style={{ ...link, color: Th.muted, fontWeight: 500 }}>Cambiar</button>}
      </div>
      {hilo && !editando && (
        <a href={hilo} target="_blank" rel="noreferrer" className="btn-wa-grande" style={{ marginTop: 8, padding: "8px 14px", fontSize: 14, background: "var(--accent)", color: "var(--on-accent)" }}>Abrir el hilo en Gmail</a>
      )}
      {!hilo && !editando && (
        <div style={{ fontSize: 13, color: Th.sub, marginTop: 4, lineHeight: 1.45 }}>
          Abrí la conversación con la compañía en Gmail, copiá la dirección de arriba y pegala acá. Después la abrís desde el caso.{" "}
          <button type="button" onClick={() => { setValor(""); setEditando(true); }} style={link}>Pegar link</button>
        </div>
      )}
      {editando && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          <input autoFocus value={valor} onChange={e => setValor(e.target.value)} onKeyDown={e => e.key === "Enter" && guardar()}
            placeholder="https://mail.google.com/mail/u/0/#inbox/…" aria-label="Link del hilo de Gmail" style={{ ...Th.input, fontSize: 13 }} />
          {valor.trim() && !esLinkGmail(valor) && <span style={{ fontSize: 12, color: "var(--bad)" }}>Tiene que ser un link de Gmail (empieza con https://mail.google.com/).</span>}
          <span style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            {hilo && <button type="button" onClick={() => { onChange("hilo_gmail", ""); setEditando(false); }} style={{ ...link, color: "var(--bad)", fontWeight: 500 }}>Quitar</button>}
            <button type="button" onClick={() => setEditando(false)} style={{ ...link, color: Th.muted, fontWeight: 500 }}>Cancelar</button>
            <button type="button" onClick={guardar} disabled={valor.trim() && !esLinkGmail(valor)} style={link}>Guardar</button>
          </span>
        </div>
      )}
    </div>
  );
}

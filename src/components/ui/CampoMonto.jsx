import { useState } from "react";

// Campo de pesos: muestra 840.000 y guarda el número sin separadores
// Un número de la base (800000 o "800000.50"; "800.000" se toma como miles) se redondea; lo que se escribe queda solo con dígitos
const soloDigitos = v => {
  if (typeof v === "number" || /^\d+\.\d{1,2}$/.test(String(v ?? ""))) return String(Math.round(Number(v)));
  return String(v ?? "").replace(/[^\d]/g, "");
};
const conMiles = v => (soloDigitos(v) ? Number(soloDigitos(v)).toLocaleString("es-AR") : "");

export default function CampoMonto({ id, value, onChange, style, ...rest }) {
  const [enfocado, setEnfocado] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <span aria-hidden="true" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 13 }}>$</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={enfocado ? soloDigitos(value) : conMiles(value)}
        onFocus={e => { setEnfocado(true); const el = e.target; setTimeout(() => el.select(), 0); }}
        onBlur={() => setEnfocado(false)}
        onChange={e => onChange(soloDigitos(e.target.value))}
        style={{
          width: "100%", boxSizing: "border-box", padding: "7px 10px 7px 22px", borderRadius: 7,
          border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)",
          fontSize: 14, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "inherit", ...style,
        }}
        {...rest}
      />
    </div>
  );
}

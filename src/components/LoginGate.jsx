import { useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";

const APP_PIN = "3934";

export default function LoginGate({ onUnlock }) {
  const { T, COLORES } = useTheme();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === APP_PIN) {
      sessionStorage.setItem("pas_unlocked", "1");
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16, padding: "40px 32px", textAlign: "center",
        boxShadow: "0 8px 32px #0002", maxWidth: 340, width: "100%",
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: COLORES.primaryGradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 4 }}>PAS Tracker</div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 24 }}>Ingresá tu clave para continuar</div>
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          placeholder="Clave"
          autoFocus
          style={{
            ...T.input,
            textAlign: "center",
            letterSpacing: 8,
            borderColor: error ? COLORES.danger : T.border,
          }}
        />
        {error && <div style={{ color: COLORES.danger, fontSize: 12, marginTop: 8 }}>Clave incorrecta</div>}
        <button type="submit" style={{
          marginTop: 16, width: "100%", padding: "12px",
          background: COLORES.primaryGradient,
          border: "none", borderRadius: 10, color: "#fff",
          fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>Ingresar →</button>
      </form>
    </div>
  );
}
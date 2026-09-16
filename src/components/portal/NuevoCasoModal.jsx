import { useState } from "react";
import { supabase } from "../../supabase.js";
import { theme } from "./portalTheme.js";

export default function NuevoCasoModal({ pasId, pasNombre, onClose, onCasoCreado, dark }) {
  const T = theme(dark);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    asegurado: "",
    fecha_siniestro: "",
    compania: "",
  });
  const [archivos, setArchivos] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setArchivos(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.asegurado || !formData.fecha_siniestro || !formData.compania) {
      setError("Por favor completa los campos obligatorios.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Guardar el caso en Supabase para que te aparezca en el panel de Admin
      const nuevoCaso = {
        pas_id: pasId,
        asegurado: formData.asegurado,
        fecha_siniestro: formData.fecha_siniestro,
        compania: formData.compania,
        estado: "doc_pendiente", // Estado inicial por defecto
        fecha_derivacion: new Date().toISOString().slice(0, 10),
      };

      const { data, error: dbError } = await supabase
        .from("pas_casos")
        .insert([nuevoCaso])
        .select()
        .single();

      if (dbError) throw dbError;

      // TODO: Aquí integraremos el envío por mail (EmailJS) con los archivos adjuntos
      
      onCasoCreado?.(data);
      onClose();
    } catch (err) {
      console.error("Error al derivar caso:", err);
      setError("Hubo un error al registrar el caso. Intentalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, width: "100%", maxWidth: 460, padding: 24, boxShadow: "0 10px 25px #00000033" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>➕ Derivar Nuevo Caso</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {error && (
          <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, textTransform: "uppercase" }}>Apellido y Nombre del Titular *</label>
            <input 
              type="text" 
              name="asegurado" 
              value={formData.asegurado} 
              onChange={handleChange} 
              placeholder="Ej: Pérez Juan"
              style={{ width: "100%", background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 13, outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, textTransform: "uppercase" }}>Fecha del Siniestro *</label>
            <input 
              type="date" 
              name="fecha_siniestro" 
              value={formData.fecha_siniestro} 
              onChange={handleChange} 
              style={{ width: "100%", background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 13, outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, textTransform: "uppercase" }}>Compañía Aseguradora del Tercero *</label>
            <input 
              type="text" 
              name="compania" 
              value={formData.compania} 
              onChange={handleChange} 
              placeholder="Ej: Rivadavia, La Caja, etc."
              style={{ width: "100%", background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 13, outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, textTransform: "uppercase" }}>Documentación / Archivos</label>
            <input 
              type="file" 
              multiple 
              onChange={handleFileChange}
              style={{ width: "100%", color: T.muted, fontSize: 12 }}
            />
            <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>Podés seleccionar varios archivos (fotos, DNI, denuncia).</div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button type="button" onClick={onClose} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.sub, padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              {loading ? "Enviando..." : "Derivar Caso"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
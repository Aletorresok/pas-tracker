import { useState, useEffect } from "react";
import { supabase } from "../../supabase.js";
import { theme } from "./portalTheme.js";
import { subirArchivosYNotificar } from "../../utils/portalStorageUtils.js";

export default function NuevoCasoModal({ pasId, pasNombre, onClose, onCasoCreado, dark, companias = [] }) {
  const T = theme(dark);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState(() => {
    const borrador = sessionStorage.getItem("draft_nuevo_caso");
    return borrador ? JSON.parse(borrador) : {
      asegurado: "",
      telefono: "",
      patente: "",
      fecha_siniestro: "",
      compania: "",
    };
  });
  
  const [archivos, setArchivos] = useState([]);
  
  const [esOtraCompania, setEsOtraCompania] = useState(() => {
    return sessionStorage.getItem("draft_otra_compania") === "true";
  });

  useEffect(() => {
    sessionStorage.setItem("draft_nuevo_caso", JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    sessionStorage.setItem("draft_otra_compania", esOtraCompania);
  }, [esOtraCompania]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const finalValue = name === "patente" ? value.toUpperCase() : value;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: finalValue,
    }));
  };

  const handleFileChange = (e) => {
    setArchivos(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.asegurado || !formData.telefono || !formData.fecha_siniestro || !formData.compania) {
      setError("Por favor completa los campos obligatorios.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const valorPatente = (formData.patente || "").trim();

      const nuevoCaso = {
        pas_id: pasId,
        asegurado: formData.asegurado,
        telefono_asegurado: formData.telefono,
        origen: "portal",
        patente: valorPatente,
        fecha_siniestro: formData.fecha_siniestro,
        compania_aseguradora: formData.compania,
        estado: "doc_pendiente", 
        fecha_derivacion: new Date().toISOString().slice(0, 10),
        caso_id: Date.now(), 
      };

      const { data, error: dbError } = await supabase
        .from("pas_casos")
        .insert([nuevoCaso])
        .select()
        .single();

      if (dbError) throw dbError;

      // Llamada limpia a la utilidad compartida
      await subirArchivosYNotificar({
        pasId,
        pasNombre,
        casoData: formData,
        archivos
      });
      
      sessionStorage.removeItem("draft_nuevo_caso");
      sessionStorage.removeItem("draft_otra_compania");
      
      onCasoCreado?.(data);
      onClose();
    } catch (err) {
      console.error("Error al derivar caso o enviar email:", err);
      setError("El caso se guardó, pero hubo un problema procesando los archivos o enviando el aviso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-portal" style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, #000 60%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16, overflowY: "auto" }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, width: "100%", maxWidth: 460, padding: 24, boxShadow: "var(--shadow)", maxHeight: "100%", overflowY: "auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Derivar Nuevo Caso</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {error && (
          <div style={{ background: "color-mix(in srgb, var(--bad) 13%, transparent)", border: "1px solid var(--bad)", borderRadius: 8, padding: "10px 14px", color: "var(--bad)", fontSize: 12, marginBottom: 16 }}>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, textTransform: "uppercase" }}>Teléfono del Asegurado *</label>
              <input 
                type="text" 
                name="telefono" 
                value={formData.telefono} 
                onChange={handleChange} 
                placeholder="Ej: 11 2345-6789"
                style={{ width: "100%", background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 13, outline: "none" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, textTransform: "uppercase" }}>Patente</label>
              <input 
                type="text" 
                name="patente" 
                value={formData.patente} 
                onChange={handleChange} 
                placeholder="Ej: AB123CD"
                style={{ width: "100%", background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 13, outline: "none", textTransform: "uppercase", textAlign: "center" }}
              />
            </div>
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
            <select 
              name="compania" 
              value={esOtraCompania ? "OTRA" : formData.compania} 
              onChange={(e) => {
                if (e.target.value === "OTRA") {
                  setEsOtraCompania(true);
                  setFormData(prev => ({ ...prev, compania: "" }));
                } else {
                  setEsOtraCompania(false);
                  handleChange(e);
                }
              }} 
              style={{ width: "100%", background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 13, outline: "none", appearance: "none" }}
            >
              <option value="" disabled>Seleccionar compañía...</option>
              {companias.map((comp) => (
                <option key={comp.id || comp} value={comp.nombre || comp}>{comp.nombre || comp}</option>
              ))}
              <option value="OTRA">Otra nueva...</option>
            </select>

            {esOtraCompania && (
              <input 
                type="text" 
                name="compania" 
                value={formData.compania} 
                onChange={handleChange} 
                placeholder="Escribí el nombre de la compañía"
                style={{ width: "100%", background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 13, outline: "none", marginTop: 8 }}
              />
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, textTransform: "uppercase" }}>Documentación / Archivos</label>
            <input 
              type="file" 
              multiple 
              onChange={handleFileChange}
              style={{ width: "100%", color: T.muted, fontSize: 12 }}
            />
            <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Podés seleccionar varios archivos (fotos, DNI, denuncia).</div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button type="button" onClick={onClose} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.sub, padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ background: "var(--accent)", border: "none", borderRadius: 8, color: "var(--on-accent)", padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              {loading ? "Enviando..." : "Derivar Caso"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
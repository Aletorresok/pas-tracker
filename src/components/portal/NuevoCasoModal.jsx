import { useState } from "react";
import emailjs from "@emailjs/browser";
import { supabase } from "../../supabase.js";
import { theme } from "./portalTheme.js";

export default function NuevoCasoModal({ pasId, pasNombre, onClose, onCasoCreado, dark }) {
  const T = theme(dark);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    asegurado: "",
    telefono: "",
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
    if (!formData.asegurado || !formData.telefono || !formData.fecha_siniestro || !formData.compania) {
      setError("Por favor completa los campos obligatorios.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Guardar el caso en la base de datos usando 'tercero_contacto' para el teléfono
      const nuevoCaso = {
        pas_id: pasId,
        asegurado: formData.asegurado,
        tercero_contacto: formData.telefono, // Mapeado a la columna existente en la DB
        fecha_siniestro: formData.fecha_siniestro,
        compania: formData.compania,
        compania_aseguradora: formData.compania,
        estado: "doc_pendiente", 
        fecha_derivacion: new Date().toISOString().slice(0, 10),
        caso_id: Date.now(), // Es bigint en tu DB, va como número entero
      };

      const { data, error: dbError } = await supabase
        .from("pas_casos")
        .insert([nuevoCaso])
        .select()
        .single();

      if (dbError) throw dbError;

      // 2. Subir los archivos a Supabase Storage (balde 'adjuntos') y obtener links públicos
      const linksAdjuntos = [];
      if (archivos.length > 0) {
        for (let i = 0; i < archivos.length; i++) {
          const file = archivos[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const filePath = `${pasId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("adjuntos")
            .upload(filePath, file);

          if (!uploadError) {
            const { data: linkData } = supabase.storage.from("adjuntos").getPublicUrl(filePath);
            if (linkData?.publicUrl) {
              linksAdjuntos.push(linkData.publicUrl);
            }
          } else {
            console.error("Error subiendo archivo:", uploadError);
          }
        }
      }

      // 3. Armar el texto con los links para el mail
      const textoLinks = linksAdjuntos.length > 0
        ? linksAdjuntos.map((link, i) => `🔗 Descargar Archivo ${i + 1}: ${link}`).join('\n')
        : "No se adjuntaron archivos.";

      // 4. Enviar el correo con EmailJS
      const templateParams = {
        pas_nombre: pasNombre || "PAS",
        asegurado: formData.asegurado,
        telefono: formData.telefono,
        fecha_siniestro: formData.fecha_siniestro,
        compania: formData.compania,
        links_archivos: textoLinks,
      };

      await emailjs.send(
        "service_g5y3lf4",
        "template_7y6omo1",
        templateParams,
        "uQTfm1gg21u5Wj6Z_"
      );
      
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
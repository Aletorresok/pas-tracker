import CasoDetalle from "../../CasoUnificado.jsx";
import { useEffect } from "react";
import { useCompanias } from "./CompaniaSelector.jsx";
import { marcarRevisado } from "../../utils/storage.js";

// Abre la ficha de un caso por encima de cualquier pantalla. La ficha ya guarda su caso en Supabase;
// acá solo se refleja el cambio en memoria (sin volver a guardar todos los casos).
export default function CasoOverlay({ caso, pasId, casos, todosLosPas, onCasoLocal, onCambio, onClose, darkMode }) {
  const { companias, agregarCompania } = useCompanias(casos);

  // Abrir un caso nuevo del portal lo saca de la bandeja "Nuevos del portal"
  useEffect(() => {
    if (!caso || caso.origen !== "portal" || caso.revisado_en) return;
    marcarRevisado(caso.id).then(cambios => {
      if (!cambios) return;
      const { _pasId, _pasNombre, ...limpio } = caso;
      onCasoLocal(pasId, { ...limpio, ...cambios });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caso?.id]);

  if (!caso) return null;
  const pas = todosLosPas.find(p => String(p.id) === String(pasId));
  const pasNombre = pas?.nombre || caso._pasNombre || "";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, overflowY: "auto", background: "var(--bg)" }}>
      <CasoDetalle
        caso={caso} pasId={pasId} pasNombre={pasNombre} pasTelefono={(pas?.telefonos || [])[0] || ""} darkMode={darkMode}
        companias={companias} onAgregarCompania={agregarCompania}
        onUpdate={updated => {
          const { _pasId, _pasNombre, ...limpio } = updated;
          onCasoLocal(pasId, limpio);
          onCambio?.(updated);
        }}
        onClose={onClose}
      />
    </div>
  );
}

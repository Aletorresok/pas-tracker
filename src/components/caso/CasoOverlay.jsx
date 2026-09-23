import CasoDetalle from "../../CasoUnificado.jsx";
import { useCompanias } from "./CompaniaSelector.jsx";

// Abre la ficha de un caso por encima de cualquier pantalla. La ficha ya guarda su caso en Supabase;
// acá solo se refleja el cambio en memoria (sin volver a guardar todos los casos).
export default function CasoOverlay({ caso, pasId, casos, todosLosPas, onCasoLocal, onCambio, onClose, darkMode }) {
  const { companias, agregarCompania } = useCompanias(casos);
  if (!caso) return null;
  const pasNombre = todosLosPas.find(p => String(p.id) === String(pasId))?.nombre || caso._pasNombre || "";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, overflowY: "auto", background: "var(--bg)" }}>
      <CasoDetalle
        caso={caso} pasId={pasId} pasNombre={pasNombre} darkMode={darkMode}
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

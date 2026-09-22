import CasoDetalle from "../../CasoUnificado.jsx";
import { useCompanias } from "./CompaniaSelector.jsx";

// Abre la ficha de un caso por encima de cualquier pantalla y guarda los cambios en la lista.
export default function CasoOverlay({ caso, pasId, casos, todosLosPas, onSaveCasos, onCambio, onClose, darkMode }) {
  const { companias, agregarCompania } = useCompanias(casos);
  if (!caso) return null;
  const pasNombre = todosLosPas.find(p => String(p.id) === String(pasId))?.nombre || caso._pasNombre || "";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, overflowY: "auto", background: "var(--bg)" }}>
      <CasoDetalle
        caso={caso} pasId={pasId} pasNombre={pasNombre} darkMode={darkMode}
        companias={companias} onAgregarCompania={agregarCompania}
        onUpdate={updated => {
          const actuales = casos[String(pasId)] || [];
          onSaveCasos(pasId, actuales.map(c => (c.id === updated.id ? updated : c)), pasNombre);
          onCambio?.(updated);
        }}
        onClose={onClose}
      />
    </div>
  );
}

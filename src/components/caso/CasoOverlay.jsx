import CasoDetalle from "../../CasoUnificado.jsx";
import { useEffect } from "react";
import { useCompanias } from "./CompaniaSelector.jsx";
import { marcarRevisado, deleteCaso } from "../../utils/storage.js";

// Abre la ficha de un caso por encima de cualquier pantalla. La ficha ya guarda su caso en Supabase;
// acá solo se refleja el cambio en memoria (sin volver a guardar todos los casos).
// Con onQuitarCaso, la ficha muestra "Eliminar".
export default function CasoOverlay({ pestanaInicial, caso, pasId, casos, todosLosPas, onCasoLocal, onCambio, onClose, onQuitarCaso, darkMode }) {
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

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar definitivamente el caso de ${caso.asegurado || "este asegurado"}? Esta acción no se puede deshacer.`)) return;
    if (!(await deleteCaso(caso.id))) { window.alert("No se pudo eliminar el caso. Probá de nuevo."); return; }
    onQuitarCaso(pasId, caso.id);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, overflowY: "auto", background: "var(--bg)" }}>
      <CasoDetalle
        pestanaInicial={pestanaInicial} caso={caso} pasId={pasId} pasNombre={pasNombre} pasTelefono={(pas?.telefonos || [])[0] || ""} darkMode={darkMode}
        companias={companias} onAgregarCompania={agregarCompania}
        onUpdate={updated => {
          const { _pasId, _pasNombre, ...limpio } = updated;
          onCasoLocal(pasId, limpio);
          onCambio?.(updated);
        }}
        onClose={onClose}
        onEliminar={onQuitarCaso ? eliminar : undefined}
      />
    </div>
  );
}

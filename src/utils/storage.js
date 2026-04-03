import { supabase } from "../supabase.js";

// ── SAVE STORAGE ──────────────────────────────────────────────────────────────
// Guarda historial, casos, derivadores, recordatorios, descartados en Supabase

export async function saveStorage(tabla, data) {
  try {
    if (tabla === "pas_historial") {
      // data = { [pas_id]: [{fecha, resultados, nota, ts}] }
      const rows = [];
      Object.entries(data).forEach(([pas_id, entries]) => {
        entries.forEach(entry => {
          rows.push({
            pas_id: String(pas_id),
            fecha: entry.fecha,
            resultados: entry.resultados || [],
            nota: entry.nota || "",
            ts: entry.ts || Date.now(),
          });
        });
      });

      if (!rows.length) return;

      // Insertamos de a chunks para no superar límites
      const CHUNK = 200;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await supabase
          .from("pas_historial")
          .upsert(rows.slice(i, i + CHUNK), { onConflict: "pas_id,ts" });
        if (error) console.error("[saveStorage] pas_historial chunk error:", error);
      }

    } else if (tabla === "pas_casos") {
      // data = { [pas_id]: [{...caso}] }
      const rows = [];
      Object.entries(data).forEach(([pas_id, casosList]) => {
        casosList.forEach(caso => {
          rows.push({ ...caso, pas_id: String(pas_id) });
        });
      });

      if (!rows.length) return;

      const { error } = await supabase
        .from("pas_casos")
        .upsert(rows, { onConflict: "id" });
      if (error) console.error("[saveStorage] pas_casos error:", error);

    } else if (tabla === "pas_derivadores") {
      // data = { [pas_id]: true/false }
      const rows = Object.entries(data).map(([pas_id, activo]) => ({
        pas_id: String(pas_id),
        activo: !!activo,
      }));

      if (!rows.length) return;

      const { error } = await supabase
        .from("pas_derivadores")
        .upsert(rows, { onConflict: "pas_id" });
      if (error) console.error("[saveStorage] pas_derivadores error:", error);

    } else if (tabla === "pas_recordatorios") {
      // data = { [pas_id]: "fecha" }
      const rows = Object.entries(data).map(([pas_id, fecha]) => ({
        pas_id: String(pas_id),
        fecha_recordatorio: fecha,
      }));

      if (!rows.length) return;

      const { error } = await supabase
        .from("pas_recordatorios")
        .upsert(rows, { onConflict: "pas_id" });
      if (error) console.error("[saveStorage] pas_recordatorios error:", error);

    } else if (tabla === "pas_descartados") {
      // data = { [pas_id]: true/false }
      const rows = Object.entries(data).map(([pas_id, activo]) => ({
        pas_id: String(pas_id),
        activo: !!activo,
      }));

      if (!rows.length) return;

      const { error } = await supabase
        .from("pas_descartados")
        .upsert(rows, { onConflict: "pas_id" });
      if (error) console.error("[saveStorage] pas_descartados error:", error);
    }

  } catch (err) {
    console.error("[saveStorage] error:", err);
  }
}

// ── LOAD STORAGE ──────────────────────────────────────────────────────────────
export async function loadStorage(tabla) {
  try {
    const { data, error } = await supabase.from(tabla).select("*");
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[loadStorage] error:", err);
    return null;
  }
}

// ── PAS MANUALES ──────────────────────────────────────────────────────────────
export async function upsertPasManual(pas) {
  const row = {
    id: pas.id,
    nombre: pas.nombre,
    mail: pas.mail || "",
    telefonos: Array.isArray(pas.telefonos) ? pas.telefonos.join(",") : (pas.telefonos || ""),
    contacto: pas.contacto || "",
    respuesta: pas.respuesta || "",
    seguimiento: pas.seguimiento || "",
  };

  const { error } = await supabase
    .from("pas_manuales")
    .upsert(row, { onConflict: "id" });

  if (error) console.error("[upsertPasManual] error:", error);
}

export async function deletePasManual(id) {
  const { error } = await supabase
    .from("pas_manuales")
    .delete()
    .eq("id", id);

  if (error) console.error("[deletePasManual] error:", error);
}
import { supabase } from "../supabase.js";

// ── GENERADOR DE UUID ──────────────────────────────────────────────────────────
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── GENERADOR DE CASO_ID ───────────────────────────────────────────────────────
let casoIdCounter = Date.now();
function generateCasoId() {
  return ++casoIdCounter;
}

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
            pas_id: parseInt(pas_id, 10),
            fecha: entry.fecha || "",
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
          // Asegurar que tiene id, caso_id y estado_honorarios
          const row = {
            id: caso.id || generateUUID(),
            caso_id: caso.caso_id || generateCasoId(),
            pas_id: parseInt(pas_id, 10),
            estado_honorarios: caso.estado_honorarios || "pendiente",
            // Resto de campos
            asegurado: caso.asegurado || null,
            dni_asegurado: caso.dni_asegurado || null,
            estado: caso.estado || null,
            nota: caso.nota || null,
            compania: caso.compania || null,
            nro_siniestro: caso.nro_siniestro || null,
            fecha_siniestro: caso.fecha_siniestro || null,
            ubicacion: caso.ubicacion || null,
            presupuesto: caso.presupuesto || null,
            tercero_nombre: caso.tercero_nombre || null,
            tercero_dni: caso.tercero_dni || null,
            tercero_contacto: caso.tercero_contacto || null,
            vehiculo: caso.vehiculo || null,
            dominio: caso.dominio || null,
            motor: caso.motor || null,
            chasis: caso.chasis || null,
            vehiculo_tercero: caso.vehiculo_tercero || null,
            dominio_tercero: caso.dominio_tercero || null,
            relato: caso.relato || null,
            comentarios: caso.comentarios || null,
            fecha_derivacion: caso.fecha_derivacion || null,
            fecha_contacto_asegurado: caso.fecha_contacto_asegurado || null,
            fecha_inicio_reclamo: caso.fecha_inicio_reclamo || null,
            fecha_ultimo_movimiento: caso.fecha_ultimo_movimiento || null,
            monto_ofrecimiento: caso.monto_ofrecimiento || null,
            monto_cobro_asegurado: caso.monto_cobro_asegurado || null,
            monto_cobro_yo: caso.monto_cobro_yo || null,
            monto_comision_pas: caso.monto_comision_pas || null,
            recordatorio: caso.recordatorio || null,
            notas_log: caso.notas_log || null,
            carpeta_path: caso.carpeta_path || null,
            primer_ofrecimiento: caso.primer_ofrecimiento || null,
            segundo_ofrecimiento: caso.segundo_ofrecimiento || null,
            fecha_carga: caso.fecha_carga || null,
            fecha_reclamo: caso.fecha_reclamo || null,
            fecha_ultimo_reclamo: caso.fecha_ultimo_reclamo || null,
            fecha_ofrecimiento: caso.fecha_ofrecimiento || null,
            fecha_reconsideracion: caso.fecha_reconsideracion || null,
            fecha_aceptacion: caso.fecha_aceptacion || null,
            fecha_firma: caso.fecha_firma || null,
            fecha_pago: caso.fecha_pago || null,
            fecha_cobro: caso.fecha_cobro || null,
            fecha_mediacion: caso.fecha_mediacion || null,
            fecha_inicio_juicio: caso.fecha_inicio_juicio || null,
            monto_acordado: caso.monto_acordado || null,
            plazo_pago: caso.plazo_pago || null,
            porcentaje_honorarios: caso.porcentaje_honorarios || null,
            monto_honorarios: caso.monto_honorarios || null,
            fecha_factura: caso.fecha_factura || null,
            fecha_cobro_honorarios: caso.fecha_cobro_honorarios || null,
          };
          rows.push(row);
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
        pas_id: parseInt(pas_id, 10),
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
        pas_id: parseInt(pas_id, 10),
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
        pas_id: parseInt(pas_id, 10),
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
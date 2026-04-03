import { supabase } from "../supabase.js";

// ── GUARDAR DATOS A SUPABASE (UPSERT SEGURO) ──────────────────────────────────
export async function saveStorage(key, val) {
  try {
    if (key === 'pas_historial') {
      // Solo insertar NUEVOS registros (evitar duplicados)
      const { data: existing } = await supabase.from('pas_historial').select('ts');
      const existingTs = new Set((existing || []).map(r => String(r.ts)));
      const rows = [];
      Object.entries(val).forEach(([pas_id, contactos]) => {
        contactos.forEach(c => {
          if (!existingTs.has(String(c.ts))) {
            rows.push({
              pas_id: Number(pas_id),
              fecha: c.fecha,
              resultados: c.resultados,
              nota: c.nota,
              ts: c.ts,
            });
          }
        });
      });
      if (rows.length) {
        const { error } = await supabase.from('pas_historial').insert(rows);
        if (error) console.error('[saveStorage] pas_historial error:', error);
      }
    }

    if (key === 'pas_casos') {
      const rows = [];
      Object.entries(val).forEach(([pas_id, casosList]) => {
        const pasIdNum = pas_id.toString().startsWith('manual_') ? null : Number(pas_id);
        casosList.forEach(c => {
          const casoIdNum = typeof c.id === 'string' && isNaN(Number(c.id)) ? null : Number(c.id);
          rows.push({
            pas_id: pasIdNum,
            caso_id: casoIdNum,
            asegurado: c.asegurado,
            estado: c.estado || null,
            nota: c.nota || null,
            fecha_derivacion: c.fecha_derivacion || null,
            fecha_contacto_asegurado: c.fecha_contacto_asegurado || null,
            fecha_inicio_reclamo: c.fecha_inicio_reclamo || null,
            fecha_ultimo_movimiento: c.fecha_ultimo_movimiento || null,
            monto_ofrecimiento: c.monto_ofrecimiento || null,
            monto_cobro_asegurado: c.monto_cobro_asegurado || null,
            monto_cobro_yo: c.monto_cobro_yo || null,
            monto_comision_pas: c.monto_comision_pas || null,
            recordatorio: c.recordatorio || null,
            notas_log: c.notas_log || [],
            carpeta_path: c.carpeta_path || null,
            compania: c.compania || null,
            fecha_siniestro: c.fecha_siniestro || null,
            presupuesto: c.presupuesto || null,
            primer_ofrecimiento: c.primer_ofrecimiento || null,
            segundo_ofrecimiento: c.segundo_ofrecimiento || null,
            fecha_carga: c.fecha_carga || null,
            fecha_reclamo: c.fecha_reclamo || null,
            fecha_ultimo_reclamo: c.fecha_ultimo_reclamo || null,
            fecha_ofrecimiento: c.fecha_ofrecimiento || null,
            fecha_reconsideracion: c.fecha_reconsideracion || null,
            fecha_aceptacion: c.fecha_aceptacion || null,
            fecha_firma: c.fecha_firma || null,
            fecha_pago: c.fecha_pago || null,
            fecha_cobro: c.fecha_cobro || null,
            fecha_mediacion: c.fecha_mediacion || null,
            fecha_inicio_juicio: c.fecha_inicio_juicio || null,
            monto_acordado: c.monto_acordado || null,
            plazo_pago: c.plazo_pago || null,
            porcentaje_honorarios: c.porcentaje_honorarios || null,
            monto_honorarios: c.monto_honorarios || null,
            estado_honorarios: c.estado_honorarios || 'NO_FACTURADO',
            fecha_factura: c.fecha_factura || null,
            fecha_cobro_honorarios: c.fecha_cobro_honorarios || null,
          });
        });
      });
      if (rows.length) {
        const { error } = await supabase.from('pas_casos').upsert(rows, { onConflict: 'caso_id' });
        if (error) console.error('[saveStorage] pas_casos error:', error);
      }
    }

    if (key === 'pas_derivadores') {
      const rows = Object.entries(val).map(([pas_id, activo]) => ({
        pas_id: Number(pas_id),
        activo: !!activo,
      }));
      if (rows.length) {
        const { error } = await supabase.from('pas_derivadores').upsert(rows, { onConflict: 'pas_id' });
        if (error) console.error('[saveStorage] pas_derivadores error:', error);
      }
    }

    if (key === 'pas_recordatorios') {
      const rows = Object.entries(val)
        .filter(([, v]) => v)
        .map(([pas_id, fecha]) => ({
          pas_id: Number(pas_id),
          fecha_recordatorio: fecha,
        }));
      if (rows.length) {
        const { error } = await supabase.from('pas_recordatorios').upsert(rows, { onConflict: 'pas_id' });
        if (error) console.error('[saveStorage] pas_recordatorios error:', error);
      }
    }

    if (key === 'pas_descartados') {
      const rows = Object.entries(val).map(([pas_id, activo]) => ({
        pas_id: Number(pas_id),
        activo: !!activo,
      }));
      if (rows.length) {
        const { error } = await supabase.from('pas_descartados').upsert(rows, { onConflict: 'pas_id' });
        if (error) console.error('[saveStorage] pas_descartados error:', error);
      }
    }

    if (key === 'pas_manuales') {
      const rows = Object.entries(val).map(([id, p]) => ({
        id,
        nombre: p.nombre,
        mail: p.mail,
        telefonos: p.telefonos || [],
        contacto: p.contacto || '',
        respuesta: p.respuesta || '',
        seguimiento: p.seguimiento || '',
      }));
      if (rows.length) {
        const { error } = await supabase.from('pas_manuales').upsert(rows, { onConflict: 'id' });
        if (error) console.error('[saveStorage] pas_manuales error:', error);
      }
    }

    if (key === 'pas_lista') {
      const rows = val.map(p => ({
        pas_id: p.id,
        nombre: p.nombre,
        mail: p.mail,
        telefonos: p.telefonos,
        contacto: p.contacto,
        respuesta: p.respuesta,
        seguimiento: p.seguimiento,
        prioridad: p.prioridad,
      }));
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await supabase.from('pas_lista').upsert(rows.slice(i, i + CHUNK), { onConflict: 'pas_id' });
        if (error) console.error('[saveStorage] pas_lista chunk error:', error);
      }
    }
  } catch (e) {
    console.error('[saveStorage] exception:', e);
  }
}
// ── ELIMINAR PAS MANUAL
export async function deletePasManual(id) {
  try {
    const { error } = await supabase
      .from('pas_manuales')
      .delete()
      .eq('id', id);

    if (error) console.error('[deletePasManual] error:', error);
  } catch (e) {
    console.error('[deletePasManual] exception:', e);
  }
}

// ── GUARDAR/ACTUALIZAR PAS MANUAL
export async function upsertPasManual(p) {
  try {
    const row = {
      id: p.id,
      nombre: p.nombre,
      mail: p.mail,
      telefonos: p.telefonos || [],
      contacto: p.contacto || '',
      respuesta: p.respuesta || '',
      seguimiento: p.seguimiento || '',
    };
    
    const { error } = await supabase
      .from('pas_manuales')
      .upsert(row, { onConflict: 'id' });

    if (error) console.error('[upsertPasManual] error:', error);
  } catch (e) {
    console.error('[upsertPasManual] exception:', e);
  }
}

// ── CARGAR DATOS (Si lo usas en App.jsx para inicializar)
export async function loadStorage(key) {
  try {
    const { data, error } = await supabase.from(key).select('*');
    if (error) {
      console.error(`[loadStorage] error en ${key}:`, error);
      return null;
    }
    return data;
  } catch (e) {
    console.error(`[loadStorage] exception en ${key}:`, e);
    return null;
  }
}
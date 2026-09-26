// Notificaciones push en este dispositivo (solo el estudio). Las manda la función "notificar" de Supabase.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase.js";

// La clave pública VAPID la da la función (la genera ella misma la primera vez; la privada nunca sale de Supabase)
async function clavePublica() {
  const { data, error } = await supabase.functions.invoke("notificar", { body: { tipo: "clave" } });
  if (error || !data?.clave) throw new Error("sin-funcion");
  return data.clave;
}

const aBytes = b64 => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, c => c.charCodeAt(0));
};
const soportado = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function nombreDispositivo() {
  const ua = navigator.userAgent;
  const so = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iPhone" : /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "Mac" : "Otro";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [so, nav].filter(Boolean).join(" · ");
}

// estado: "no-soportado" | "bloqueado" | "inactivo" | "activo" | "cargando"
export function useNotificaciones() {
  const [estado, setEstado] = useState("cargando");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const revisar = useCallback(async () => {
    if (!soportado()) return setEstado("no-soportado");
    if (Notification.permission === "denied") return setEstado("bloqueado");
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    setEstado(sub ? "activo" : "inactivo");
  }, []);
  useEffect(() => { revisar(); }, [revisar]);

  const activar = async () => {
    setError("");
    try {
      if ((await Notification.requestPermission()) !== "granted") return revisar();
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        let clave;
        try { clave = await clavePublica(); } catch { setError("La función \"notificar\" no respondió (¿está creada en Supabase?)."); return revisar(); }
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(clave) });
      }
      const j = sub.toJSON();
      const { error: err } = await supabase.from("pas_push_suscripciones").upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, dispositivo: nombreDispositivo() }, { onConflict: "endpoint" });
      if (err) { console.error("[push] guardar:", err); setError("No se pudo guardar en la base (¿falta el SQL 17?)."); await sub.unsubscribe(); }
    } catch (e) {
      console.error("[push] activar:", e);
      setError("Este navegador no permitió activar las notificaciones.");
    }
    revisar();
  };

  const desactivar = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("pas_push_suscripciones").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    revisar();
  };

  // Manda una notificación de prueba (o el resumen del día) a todos tus dispositivos activados
  const probar = async (tipo = "prueba") => {
    setError(""); setAviso("Enviando…");
    const { data, error: err } = await supabase.functions.invoke("notificar", { body: { tipo } });
    if (err) {
      let detalle = "";
      try { detalle = JSON.stringify(await err.context?.json?.()); } catch { /* sin detalle */ }
      console.error("[push] probar:", err, detalle);
      setAviso("");
      setError(`La función "notificar" respondió con error${err.context?.status ? ` (${err.context.status})` : ""}${detalle ? `: ${detalle}` : ""}.`);
      return;
    }
    const n = data?.enviados || 0;
    setAviso(n ? `Enviada a ${n} ${n === 1 ? "dispositivo" : "dispositivos"}. Si no aparece, revisá que el sistema permita notificaciones del navegador.` : "");
    if (!n) setError("La función respondió, pero no llegó a ningún dispositivo (ver Logs de la función).");
  };

  const resumen = () => probar("resumen");
  return { estado, error, aviso, activar, desactivar, probar: () => probar("prueba"), resumen };
}

// Notificaciones push en este dispositivo (solo el estudio). Las manda la función "notificar" de Supabase.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase.js";

// Clave pública VAPID (no es secreta). La privada vive solo en los secretos de la función en Supabase.
const VAPID_PUBLICA = "BG56lmu7ADA639x4dh0CZhxLOLDHyIVm9pNoy2cNX2TgL93_gNFYr_dzvvYugjoMZTy1FxSFhLbqYeQsQsRUOKw";

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
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(VAPID_PUBLICA) });
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

  // Manda una notificación de prueba a todos tus dispositivos activados
  const probar = async () => {
    setError("");
    const { data, error: err } = await supabase.functions.invoke("notificar", { body: { tipo: "prueba" } });
    if (err) { console.error("[push] probar:", err); setError("La función \"notificar\" no respondió (¿está creada en Supabase?)."); return; }
    if (!data?.enviados) setError("No hay dispositivos activados.");
  };

  return { estado, error, activar, desactivar, probar };
}

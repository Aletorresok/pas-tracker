import { useEffect, useState } from "react";

// El navegador ofrece instalar la app con el evento beforeinstallprompt (Chrome/Edge en PC y Android).
// Se guarda apenas llega (puede ser antes de que se monte el botón) y se usa cuando tocan "Instalar app".
let pedido = null;
const CAMBIO = "pas-instalar-cambio";
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); pedido = e; window.dispatchEvent(new Event(CAMBIO)); });
  window.addEventListener("appinstalled", () => { pedido = null; window.dispatchEvent(new Event(CAMBIO)); });
}

const yaInstalada = () => typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true);

// { puede: se puede ofrecer el botón, instalar(): abre el cartel del navegador }
export function useInstalarApp() {
  const [puede, setPuede] = useState(() => !!pedido && !yaInstalada());
  useEffect(() => {
    const act = () => setPuede(!!pedido && !yaInstalada());
    act();
    window.addEventListener(CAMBIO, act);
    return () => window.removeEventListener(CAMBIO, act);
  }, []);
  const instalar = async () => {
    if (!pedido) return;
    pedido.prompt();
    await pedido.userChoice.catch(() => null);
    pedido = null;
    window.dispatchEvent(new Event(CAMBIO));
  };
  return { puede, instalar };
}

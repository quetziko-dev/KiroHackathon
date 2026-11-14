'use client';

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      console.error("[pwa] No se pudo registrar el service worker.");
    });
  }, []);

  return null;
}

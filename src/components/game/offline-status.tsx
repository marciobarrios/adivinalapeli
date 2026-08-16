"use client";

import { CircleCheck, Cloud, CloudOff } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";

export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);

    let active = true;
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          if (active) setOfflineReady(true);
        })
        .catch(() => {
          if (active) setOfflineReady(false);
        });
    }

    return () => {
      active = false;
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  if (!online) {
    return (
      <Badge
        variant="secondary"
        className="h-7 gap-1.5 border border-emerald-900/10 bg-emerald-100 px-2.5 text-emerald-950"
        data-testid="network-status"
      >
        <CloudOff aria-hidden="true" />
        Sin conexión · listo
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="h-7 gap-1.5 border border-foreground/10 bg-card px-2.5"
      data-testid="network-status"
      data-offline-ready={offlineReady}
    >
      {offlineReady ? <CircleCheck aria-hidden="true" /> : <Cloud aria-hidden="true" />}
      {offlineReady ? "Disponible sin conexión" : "Catálogo local"}
    </Badge>
  );
}

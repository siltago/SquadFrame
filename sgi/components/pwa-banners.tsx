"use client";

import { useEffect, useState } from "react";
import { usePwa } from "@/components/pwa-provider";
import { useRouter } from "next/navigation";

// ── Offline Banner ────────────────────────────────────────────────────────────
export function OfflineBanner() {
  const { isOnline } = usePwa();
  const router = useRouter();
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnecting, setShowReconnecting] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      // Voltou online — mostrar brevemente e atualizar dados
      setShowReconnecting(true);
      router.refresh();
      const t = setTimeout(() => {
        setShowReconnecting(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, wasOffline, router]);

  if (isOnline && !showReconnecting) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[200] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white transition-all"
      style={{
        backgroundColor: isOnline ? "#10b981" : "#ef4444",
        paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))",
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: isOnline ? "#d1fae5" : "#fecaca" }}
      />
      {isOnline
        ? "Conexão restaurada — atualizando dados…"
        : "Você está offline. Os dados exibidos podem não estar atualizados."}
    </div>
  );
}

// ── Update Banner ─────────────────────────────────────────────────────────────
export function UpdateBanner() {
  const { hasUpdate, applyUpdate } = usePwa();

  if (!hasUpdate) return null;

  return (
    <div
      className="fixed inset-x-0 z-[190] flex items-center justify-between gap-3 bg-steel px-4 py-2.5 text-sm text-white shadow-md"
      style={{ top: "calc(56px + env(safe-area-inset-top))" }}
    >
      <span>
        Nova versão disponível.
      </span>
      <button
        onClick={applyUpdate}
        className="shrink-0 rounded-md bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition-colors"
      >
        Atualizar agora
      </button>
    </div>
  );
}

// ── Connection Indicator (status line) ───────────────────────────────────────
export function ConnectionStatus() {
  const { isOnline } = usePwa();

  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      title={isOnline ? "Online" : "Offline"}
      style={{ backgroundColor: isOnline ? "#10b981" : "#ef4444" }}
    />
  );
}

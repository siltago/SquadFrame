"use client";

export type LoadingOverlayStatus = "loading" | "success";

// Overlay de tela cheia estilo "liquid glass" (vidro fosco translúcido) pra
// cobrir o tempo de espera de uma ação (enviar pedido, aprovar, cadastrar).
// Mostra um spinner enquanto `status="loading"` e um check verde quando o
// consumidor troca pra `status="success"` — quem decide quando trocar e
// quando desmontar é o hook `useLoadingOverlay` (ui/lib/use-loading-overlay).
export function LoadingOverlay({ status, label }: { status: LoadingOverlayStatus; label?: string }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-[lo-fade-in_150ms_ease-out]">
      <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-3xl border border-white/30 bg-white/10 px-10 py-9 shadow-2xl backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-white/[0.06]">
        {/* Brilho do "vidro" — gradiente sutil, não interativo */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-white/5 to-transparent opacity-70 dark:from-white/10 dark:via-transparent dark:to-transparent" />

        <div className="relative flex h-14 w-14 items-center justify-center">
          {status === "loading" ? (
            <svg className="h-14 w-14 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success animate-[lo-pop_320ms_ease-out]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            </div>
          )}
        </div>

        {label && <p className="relative text-sm font-medium text-text">{label}</p>}
      </div>

      <style jsx global>{`
        @keyframes lo-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lo-pop {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Tipo = "erro" | "sucesso" | "info";
type Toast = { id: number; mensagem: string; tipo: Tipo };

const ToastCtx = createContext<(mensagem: string, tipo?: Tipo) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

const COR: Record<Tipo, string> = {
  erro:    "bg-red-600",
  sucesso: "bg-emerald-600",
  info:    "bg-steel",
};

const ICONE: Record<Tipo, React.ReactNode> = {
  erro: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  ),
  sucesso: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
  ),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((mensagem: string, tipo: Tipo = "erro") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  function remover(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastCtx.Provider value={addToast}>
      {children}
      <div
        className="fixed z-[200] flex flex-col gap-2 pointer-events-none"
        style={{
          bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
          right: "calc(1.25rem + env(safe-area-inset-right))",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${COR[t.tipo]}`}
            style={{ animation: "slideUp 0.2s ease-out" }}
          >
            {ICONE[t.tipo]}
            <span className="max-w-xs">{t.mensagem}</span>
            <button onClick={() => remover(t.id)} className="ml-2 opacity-70 hover:opacity-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </ToastCtx.Provider>
  );
}

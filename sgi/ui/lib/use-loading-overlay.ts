"use client";

import { useCallback, useState } from "react";
import type { LoadingOverlayStatus } from "@/ui/components/LoadingOverlay";

// Controla o ciclo do LoadingOverlay: chama `run(fn)` no lugar de `await fn()`
// direto — mostra o spinner durante a chamada, o check verde por ~900ms se
// ela resolver, e volta a null (escondendo o overlay) sozinho. Em caso de
// erro, esconde na hora e relança o erro pro catch de quem chamou continuar
// tratando normalmente (ex: preencher o estado de erro do formulário).
export function useLoadingOverlay() {
  const [status, setStatus] = useState<LoadingOverlayStatus | null>(null);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setStatus("loading");
    try {
      const resultado = await fn();
      setStatus("success");
      await new Promise((r) => setTimeout(r, 900));
      setStatus(null);
      return resultado;
    } catch (e) {
      setStatus(null);
      throw e;
    }
  }, []);

  return { status, run };
}

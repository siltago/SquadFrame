"use client";

import { useEffect } from "react";
import { Alert } from "@/ui/components/Alert";
import { Button } from "@/ui/components/Button";

// Rede de segurança pra qualquer erro não tratado que suba até aqui (ex:
// exceção lançada dentro de um layout de servidor, como o gate de
// conformidade de compras) — sem isso, o usuário cai na tela de erro padrão
// do Next (em branco, sem nenhuma explicação nem saída), exatamente o
// "quebra sem retorno visual" reportado em produção.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  const ehBloqueioPendencia = error.message?.startsWith("Ação bloqueada");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">
        <Alert variant={ehBloqueioPendencia ? "warning" : "danger"} title={ehBloqueioPendencia ? "Ação bloqueada" : "Algo deu errado"}>
          {ehBloqueioPendencia
            ? error.message.replace(/^Ação bloqueada:\s*/, "")
            : "Não foi possível completar essa ação. Tente de novo — se o problema continuar, avise o suporte."}
        </Alert>
        <div className="flex gap-3">
          <Button onClick={reset} fullWidth>Tentar de novo</Button>
          {ehBloqueioPendencia && (
            <Button as="a" href="/squadframe/compras/pedidos" variant="ghost" fullWidth>
              Ver pendências
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { iniciarRecebimento } from "@/modules/squadstock/actions/recebimento";
import { Button } from "@/ui/components/Button";

export function RecebimentoAcaoBotao({ pedidoId, iniciadoEm }: { pedidoId: string; iniciadoEm: string | null }) {
  const podeIniciar = usePode(STOCK_PERMISSIONS.RECEBIMENTO_INICIAR);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!podeIniciar) return null;

  if (iniciadoEm) {
    return (
      <Button as="a" href={`/squadstock/recebimento/${pedidoId}`} variant="ghost" className="text-xs">
        Continuar conferência
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      className="text-xs"
      disabled={pending}
      onClick={() => start(async () => {
        await iniciarRecebimento(pedidoId);
        router.push(`/squadstock/recebimento/${pedidoId}`);
      })}
    >
      {pending ? "Iniciando…" : "Iniciar recebimento"}
    </Button>
  );
}

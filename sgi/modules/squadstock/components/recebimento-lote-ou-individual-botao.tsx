"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { resolverDestinoRecebimento } from "@/modules/squadstock/actions/resolver-destino-recebimento";
import { Button } from "@/ui/components/Button";

const STATUS_EM_TRANSITO = ["EMITIDO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL"];

export function useRecebimentoEstoqueVisivel(status: string): boolean {
  const podeIniciar = usePode(STOCK_PERMISSIONS.RECEBIMENTO_INICIAR);
  return podeIniciar && STATUS_EM_TRANSITO.includes(status);
}

export function RecebimentoLoteOuIndividualBotao({ pedidoId, status }: { pedidoId: string; status: string }) {
  const visivel = useRecebimentoEstoqueVisivel(status);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!visivel) return null;

  return (
    <Button
      variant="ghost"
      disabled={pending}
      onClick={() => start(async () => {
        const { href } = await resolverDestinoRecebimento(pedidoId);
        router.push(href);
      })}
    >
      {pending ? "Abrindo…" : "Conferir recebimento (Estoque)"}
    </Button>
  );
}

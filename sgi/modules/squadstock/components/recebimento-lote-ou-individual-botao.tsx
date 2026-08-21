"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { resolverDestinoRecebimento } from "@/modules/squadstock/actions/resolver-destino-recebimento";
import { Button } from "@/ui/components/Button";

const STATUS_EM_TRANSITO = ["EMITIDO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL"];

// Botão único de recebimento no pedido — visível pra quem tem a permissão
// de estoque OU a de compras (comprador dono do pedido), pra não tirar a
// capacidade de ninguém que já tinha um dos dois botões antigos (havia um
// "Registrar recebimento" só de compras e um "Conferir recebimento
// (Estoque)" separado — consolidados aqui num só, que sempre leva pro
// fluxo do SquadStock).
export function useRecebimentoEstoqueVisivel(status: string, podeCriarPedido: boolean): boolean {
  const podeIniciar = usePode(STOCK_PERMISSIONS.RECEBIMENTO_INICIAR);
  return (podeIniciar || podeCriarPedido) && STATUS_EM_TRANSITO.includes(status);
}

export function RecebimentoLoteOuIndividualBotao({ pedidoId, status, podeCriarPedido }: { pedidoId: string; status: string; podeCriarPedido: boolean }) {
  const visivel = useRecebimentoEstoqueVisivel(status, podeCriarPedido);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!visivel) return null;

  return (
    <Button
      disabled={pending}
      onClick={() => start(async () => {
        const { href } = await resolverDestinoRecebimento(pedidoId);
        router.push(href);
      })}
    >
      {pending ? "Abrindo…" : "Registrar recebimento"}
    </Button>
  );
}

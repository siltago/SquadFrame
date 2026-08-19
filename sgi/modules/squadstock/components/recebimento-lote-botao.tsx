"use client";

import { usePode } from "@/modules/squadframe/components/user-provider";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { Button } from "@/ui/components/Button";

export function RecebimentoLoteBotao({ romaneioId }: { romaneioId: string }) {
  const podeIniciar = usePode(STOCK_PERMISSIONS.RECEBIMENTO_INICIAR);
  if (!podeIniciar) return null;

  return (
    <Button as="a" href={`/squadstock/recebimento/romaneio/${romaneioId}`}>
      Iniciar recebimento do lote
    </Button>
  );
}

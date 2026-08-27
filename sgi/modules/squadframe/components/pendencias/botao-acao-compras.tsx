"use client";

import { useAcaoBloqueada } from "@/modules/squadframe/components/pendencias/bloqueio-compras-context";
import type { AcaoCompras } from "@/modules/squadframe/services/pendencias/constantes";
import { Button } from "@/ui/components/Button";

// Link de ação (ex: "Novo pedido") que já sabe de antemão se está bloqueado
// pelo gate de conformidade — mesma checagem que a action faz no servidor
// (verificarBloqueioCompras), só antecipada aqui pra não deixar o usuário
// clicar e só descobrir no erro.
export function BotaoAcaoCompras({ acao, href, children }: { acao: AcaoCompras; href: string; children: React.ReactNode }) {
  const { bloqueada, motivo } = useAcaoBloqueada(acao);
  return (
    <Button as="a" href={href} disabled={bloqueada} title={motivo ?? undefined}>
      {children}
    </Button>
  );
}

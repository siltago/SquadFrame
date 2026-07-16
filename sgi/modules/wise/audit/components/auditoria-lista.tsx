"use client";

import { useState, useTransition } from "react";
import { Container, Section, PageHeader } from "@/ui/components/PageHeader";
import { DataTable, type Column } from "@/ui/components/Table";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import type { WiseAuditoria } from "../types";
import { listarAuditoriaAction } from "../actions";

const ACAO_VARIANT: Record<string, "success" | "danger" | "warning" | "info" | "default"> = {
  CONVITE_CRIADO: "info",
  USUARIO_ATIVADO: "success",
  USUARIO_BLOQUEADO: "danger",
  USUARIO_DESBLOQUEADO: "success",
  PAPEL_ATRIBUIDO: "info",
  PAPEL_REVOGADO: "warning",
  SETOR_CARGO_ALTERADO: "default",
};

function RelativeTime({ ts }: { ts: string }) {
  return <>{new Date(ts).toLocaleString("pt-BR")}</>;
}

export function AuditoriaLista({
  empresaId,
  registrosIniciais,
  total,
  porPagina,
}: {
  empresaId: string;
  registrosIniciais: WiseAuditoria[];
  total: number;
  porPagina: number;
}) {
  const [registros, setRegistros] = useState(registrosIniciais);
  const [pagina, setPagina] = useState(0);
  const [pending, startTransition] = useTransition();

  const totalPaginas = Math.ceil(total / porPagina);

  function irPara(novaPagina: number) {
    startTransition(async () => {
      const resultado = await listarAuditoriaAction(empresaId, novaPagina);
      setRegistros(resultado.registros);
      setPagina(novaPagina);
    });
  }

  const columns: Column<WiseAuditoria>[] = [
    {
      key: "criado_em",
      label: "Quando",
      render: (_v, r) => <span className="whitespace-nowrap text-xs text-text-3"><RelativeTime ts={r.criado_em} /></span>,
    },
    {
      key: "acao",
      label: "Ação",
      render: (_v, r) => <Badge variant={ACAO_VARIANT[r.acao] ?? "default"} size="sm">{r.acao}</Badge>,
    },
    { key: "entidade", label: "Entidade" },
    {
      key: "dados_depois",
      label: "Detalhes",
      render: (_v, r) => (
        <span className="text-xs text-text-3">
          {r.dados_depois ? JSON.stringify(r.dados_depois) : r.dados_antes ? JSON.stringify(r.dados_antes) : "—"}
        </span>
      ),
    },
  ];

  return (
    <Container>
      <Section>
        <PageHeader title="Auditoria" description="Trilha de ações sensíveis do SquadWise — append-only." />
        <DataTable columns={columns} data={registros} rowKey={(r) => r.id} emptyTitle="Nenhum registro" loading={pending} />
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between text-sm text-text-3">
            <span>Página {pagina + 1} de {totalPaginas}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={pagina === 0 || pending} onClick={() => irPara(pagina - 1)}>Anterior</Button>
              <Button size="sm" variant="secondary" disabled={pagina + 1 >= totalPaginas || pending} onClick={() => irPara(pagina + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </Section>
    </Container>
  );
}

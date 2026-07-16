"use client";

import { useState, useTransition } from "react";
import { Container, Section, PageHeader } from "@/ui/components/PageHeader";
import { DataTable, type Column } from "@/ui/components/Table";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";
import { Modal } from "@/ui/components/Modal";
import type { WiseSetor } from "../types";
import { criarSetorAction } from "../actions";

export function SetoresLista({ empresaId, setores: setoresIniciais }: { empresaId: string; setores: WiseSetor[] }) {
  const [setores, setSetores] = useState(setoresIniciais);
  const [modalNovo, setModalNovo] = useState(false);

  const columns: Column<WiseSetor>[] = [
    {
      key: "nome",
      label: "Nome",
      sortable: true,
      render: (_v, s) => (
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.cor }} />
          {s.nome}
        </div>
      ),
    },
    {
      key: "ativo",
      label: "Status",
      align: "center",
      render: (_v, s) => <Badge variant={s.ativo ? "success" : "default"} size="sm">{s.ativo ? "Ativo" : "Inativo"}</Badge>,
    },
  ];

  return (
    <Container>
      <Section>
        <PageHeader
          title="Setores"
          description="Estrutura organizacional — onde as pessoas estão, pra exibição e relatório."
          actions={<Button onClick={() => setModalNovo(true)}>Novo setor</Button>}
        />
        <DataTable columns={columns} data={setores} rowKey={(s) => s.id} emptyTitle="Nenhum setor" />
      </Section>

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo setor" size="sm">
        <NovoSetorForm empresaId={empresaId} onCriado={(s) => { setSetores((prev) => [...prev, s]); setModalNovo(false); }} />
      </Modal>
    </Container>
  );
}

function NovoSetorForm({ empresaId, onCriado }: { empresaId: string; onCriado: (s: WiseSetor) => void }) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#475569");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submeter() {
    setErro(null);
    startTransition(async () => {
      const resultado = await criarSetorAction({ empresa_id: empresaId, nome, cor });
      if (!resultado.ok) { setErro(resultado.erro); return; }
      onCriado(resultado.dados);
    });
  }

  return (
    <div className="space-y-3">
      <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Compras" />
      <div className="flex items-center gap-3">
        <label className="label" htmlFor="cor-setor">Cor</label>
        <input id="cor-setor" type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-border" />
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <Button onClick={submeter} disabled={pending || !nome.trim()} className="w-full justify-center">
        Criar setor
      </Button>
    </div>
  );
}

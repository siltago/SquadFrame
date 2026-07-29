"use client";

import { useState, useTransition } from "react";
import { Container, Section, PageHeader } from "@/ui/components/PageHeader";
import { DataTable, type Column } from "@/ui/components/Table";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";
import { Modal } from "@/ui/components/Modal";
import type { WiseUnidade } from "../types";
import { criarUnidadeAction, editarUnidadeAction } from "../actions";

export function UnidadesLista({ unidades: unidadesIniciais }: { unidades: WiseUnidade[] }) {
  const [unidades, setUnidades] = useState(unidadesIniciais);
  const [modalUnidade, setModalUnidade] = useState<"nova" | WiseUnidade | null>(null);

  const enderecoResumo = (u: WiseUnidade) =>
    [u.cidade, u.estado].filter(Boolean).join("/") || "—";

  const columns: Column<WiseUnidade>[] = [
    { key: "nome", label: "Nome", sortable: true },
    { key: "codigo", label: "Código", render: (_v, u) => <span className="text-xs text-text-3">{u.codigo}</span> },
    { key: "cidade", label: "Cidade/UF", render: (_v, u) => enderecoResumo(u) },
    {
      key: "ativo",
      label: "Status",
      align: "center",
      render: (_v, u) => <Badge variant={u.ativo ? "success" : "default"} size="sm">{u.ativo ? "Ativa" : "Inativa"}</Badge>,
    },
  ];

  return (
    <Container>
      <Section>
        <PageHeader
          title="Unidades"
          description="Filiais/locais físicos — endereço usado futuramente pra controle de entregas e estoque."
          actions={<Button onClick={() => setModalUnidade("nova")}>Nova unidade</Button>}
        />
        <DataTable
          columns={columns}
          data={unidades}
          rowKey={(u) => u.id}
          emptyTitle="Nenhuma unidade"
          onRowClick={(u) => setModalUnidade(u)}
        />
      </Section>

      <Modal
        open={!!modalUnidade}
        onClose={() => setModalUnidade(null)}
        title={modalUnidade === "nova" ? "Nova unidade" : "Editar unidade"}
        size="lg"
      >
        {modalUnidade && (
          <UnidadeForm
            unidade={modalUnidade === "nova" ? null : modalUnidade}
            onSalvo={(u) => {
              setUnidades((prev) =>
                modalUnidade === "nova" ? [...prev, u] : prev.map((x) => (x.id === u.id ? u : x)),
              );
              setModalUnidade(null);
            }}
          />
        )}
      </Modal>
    </Container>
  );
}

function UnidadeForm({
  unidade,
  onSalvo,
}: {
  unidade: WiseUnidade | null;
  onSalvo: (u: WiseUnidade) => void;
}) {
  const [nome, setNome] = useState(unidade?.nome ?? "");
  const [codigo, setCodigo] = useState(unidade?.codigo ?? "");
  const [cep, setCep] = useState(unidade?.cep ?? "");
  const [logradouro, setLogradouro] = useState(unidade?.logradouro ?? "");
  const [numero, setNumero] = useState(unidade?.numero ?? "");
  const [complemento, setComplemento] = useState(unidade?.complemento ?? "");
  const [bairro, setBairro] = useState(unidade?.bairro ?? "");
  const [cidade, setCidade] = useState(unidade?.cidade ?? "");
  const [estado, setEstado] = useState(unidade?.estado ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dadosEndereco = { cep, logradouro, numero, complemento, bairro, cidade, estado };

  function submeter() {
    setErro(null);
    startTransition(async () => {
      const resultado = unidade
        ? await editarUnidadeAction(unidade.id, { nome, codigo, ...dadosEndereco })
        : await criarUnidadeAction({ nome, codigo, ...dadosEndereco });
      if (!resultado.ok) { setErro(resultado.erro); return; }
      onSalvo(resultado.dados);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Filial SP" />
        <Input label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: SP-01" />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-3">Endereço</p>
        <div className="grid grid-cols-3 gap-3">
          <Input label="CEP" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" className="col-span-1" />
          <Input label="Logradouro" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} className="col-span-2" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Input label="Número" value={numero} onChange={(e) => setNumero(e.target.value)} />
          <Input label="Complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} className="col-span-2" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Input label="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
          <Input label="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          <Input label="UF" value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())} maxLength={2} />
        </div>
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}
      <Button onClick={submeter} disabled={pending || !nome.trim() || !codigo.trim()} className="w-full justify-center">
        {unidade ? "Salvar" : "Criar unidade"}
      </Button>
    </div>
  );
}

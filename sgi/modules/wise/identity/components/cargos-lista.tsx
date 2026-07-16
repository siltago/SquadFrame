"use client";

import { useState, useTransition } from "react";
import { Container, Section, PageHeader } from "@/ui/components/PageHeader";
import { DataTable, type Column } from "@/ui/components/Table";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";
import { Select } from "@/ui/components/Select";
import { Modal } from "@/ui/components/Modal";
import type { WiseCargo, WiseSetor } from "../types";
import { criarCargoAction } from "../actions";

export function CargosLista({
  empresaId,
  cargos: cargosIniciais,
  setores,
}: {
  empresaId: string;
  cargos: WiseCargo[];
  setores: WiseSetor[];
}) {
  const [cargos, setCargos] = useState(cargosIniciais);
  const [modalNovo, setModalNovo] = useState(false);

  const nomeSetor = (id: string | null) => setores.find((s) => s.id === id)?.nome ?? "—";

  const columns: Column<WiseCargo>[] = [
    {
      key: "nome",
      label: "Nome",
      sortable: true,
      render: (_v, c) => (
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.cor }} />
          {c.nome}
        </div>
      ),
    },
    { key: "setor_id", label: "Setor", render: (_v, c) => <span className="text-text-2">{nomeSetor(c.setor_id)}</span> },
    { key: "nivel", label: "Nível", align: "center" },
    {
      key: "ativo",
      label: "Status",
      align: "center",
      render: (_v, c) => <Badge variant={c.ativo ? "success" : "default"} size="sm">{c.ativo ? "Ativo" : "Inativo"}</Badge>,
    },
  ];

  return (
    <Container>
      <Section>
        <PageHeader
          title="Cargos"
          description="Organograma — não carrega permissão. Autorização vive em Papéis."
          actions={<Button onClick={() => setModalNovo(true)}>Novo cargo</Button>}
        />
        <DataTable columns={columns} data={cargos} rowKey={(c) => c.id} emptyTitle="Nenhum cargo" />
      </Section>

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo cargo" size="sm">
        <NovoCargoForm empresaId={empresaId} setores={setores} onCriado={(c) => { setCargos((prev) => [...prev, c]); setModalNovo(false); }} />
      </Modal>
    </Container>
  );
}

function NovoCargoForm({
  empresaId,
  setores,
  onCriado,
}: {
  empresaId: string;
  setores: WiseSetor[];
  onCriado: (c: WiseCargo) => void;
}) {
  const [nome, setNome] = useState("");
  const [setorId, setSetorId] = useState("");
  const [cor, setCor] = useState("#475569");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submeter() {
    setErro(null);
    startTransition(async () => {
      const resultado = await criarCargoAction({ empresa_id: empresaId, nome, setor_id: setorId || null, cor });
      if (!resultado.ok) { setErro(resultado.erro); return; }
      onCriado(resultado.dados);
    });
  }

  return (
    <div className="space-y-3">
      <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Comprador Sênior" />
      <Select label="Setor (opcional)" value={setorId} onChange={(e) => setSetorId(e.target.value)}>
        <option value="">—</option>
        {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
      </Select>
      <div className="flex items-center gap-3">
        <label className="label" htmlFor="cor-cargo">Cor</label>
        <input id="cor-cargo" type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-border" />
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <Button onClick={submeter} disabled={pending || !nome.trim()} className="w-full justify-center">
        Criar cargo
      </Button>
    </div>
  );
}

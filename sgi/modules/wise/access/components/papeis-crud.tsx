"use client";

import { useState, useTransition } from "react";
import { Container, Section, PageHeader } from "@/ui/components/PageHeader";
import { Button } from "@/ui/components/Button";
import { Input, Textarea } from "@/ui/components/Input";
import { Badge } from "@/ui/components/Badge";
import { Checkbox } from "@/ui/components/Checkbox";
import { Modal } from "@/ui/components/Modal";
import { EmptyState } from "@/ui/components/EmptyState";
import type { WisePapel, WisePermissao } from "../types";
import {
  criarPapelAction,
  desativarPapelAction,
  buscarPapelComPermissoesAction,
  definirPermissoesDoPapelAction,
} from "../actions";

export function PapeisCrud({
  empresaId,
  papeisIniciais,
  permissoes,
}: {
  empresaId: string;
  papeisIniciais: WisePapel[];
  permissoes: WisePermissao[];
}) {
  const [papeis, setPapeis] = useState(papeisIniciais);
  const [modalNovo, setModalNovo] = useState(false);
  const [papelEditando, setPapelEditando] = useState<WisePapel | null>(null);
  const [permissoesDoPapel, setPermissoesDoPapel] = useState<Set<string>>(new Set());
  const [carregandoPermissoes, setCarregandoPermissoes] = useState(false);
  const [pending, startTransition] = useTransition();

  const permissoesPorModulo = permissoes.reduce<Record<string, WisePermissao[]>>((acc, p) => {
    (acc[p.modulo] ??= []).push(p);
    return acc;
  }, {});

  async function abrirEdicao(papel: WisePapel) {
    setPapelEditando(papel);
    setCarregandoPermissoes(true);
    const dados = await buscarPapelComPermissoesAction(papel.id);
    setPermissoesDoPapel(new Set((dados?.permissoes ?? []).map((p) => p.id)));
    setCarregandoPermissoes(false);
  }

  function togglePermissao(id: string) {
    setPermissoesDoPapel((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function salvarPermissoes() {
    if (!papelEditando) return;
    startTransition(async () => {
      await definirPermissoesDoPapelAction(papelEditando.id, [...permissoesDoPapel]);
      setPapelEditando(null);
    });
  }

  function desativar(papel: WisePapel) {
    startTransition(async () => {
      await desativarPapelAction(papel.id);
      setPapeis((prev) => prev.map((p) => (p.id === papel.id ? { ...p, ativo: false } : p)));
    });
  }

  return (
    <Container>
      <Section>
        <PageHeader
          title="Papéis"
          description="Papel é autorização pura (RBAC) — um usuário pode ter vários papéis ao mesmo tempo, diferente de cargo (organograma)."
          actions={<Button onClick={() => setModalNovo(true)}>Novo papel</Button>}
        />

        {papeis.length === 0 ? (
          <EmptyState title="Nenhum papel cadastrado" description="Crie o primeiro papel pra começar a atribuir permissões." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {papeis.map((papel) => (
              <div key={papel.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{papel.nome}</p>
                    {papel.descricao && <p className="mt-0.5 line-clamp-2 text-xs text-text-3">{papel.descricao}</p>}
                  </div>
                  {papel.is_admin && <Badge variant="primary" size="sm">Admin</Badge>}
                  {!papel.ativo && <Badge variant="default" size="sm">Inativo</Badge>}
                </div>
                <div className="mt-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    disabled={papel.is_admin}
                    onClick={() => abrirEdicao(papel)}
                  >
                    Permissões
                  </Button>
                  {papel.ativo && !papel.is_admin && (
                    <Button size="sm" variant="ghost" onClick={() => desativar(papel)} disabled={pending}>
                      Desativar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Novo papel */}
      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo papel" size="sm">
        <NovoPapelForm
          empresaId={empresaId}
          onCriado={(papel) => {
            setPapeis((prev) => [...prev, papel]);
            setModalNovo(false);
          }}
        />
      </Modal>

      {/* Permissões do papel */}
      <Modal
        open={!!papelEditando}
        onClose={() => setPapelEditando(null)}
        title={`Permissões — ${papelEditando?.nome ?? ""}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPapelEditando(null)}>Cancelar</Button>
            <Button onClick={salvarPermissoes} disabled={pending || carregandoPermissoes}>Salvar</Button>
          </>
        }
      >
        {carregandoPermissoes ? (
          <p className="text-sm text-text-3">Carregando…</p>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {Object.entries(permissoesPorModulo).map(([modulo, perms]) => (
              <div key={modulo}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-3">{modulo}</p>
                <div className="space-y-1.5">
                  {perms.map((p) => (
                    <Checkbox
                      key={p.id}
                      label={p.nome}
                      checked={permissoesDoPapel.has(p.id)}
                      onChange={() => togglePermissao(p.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </Container>
  );
}

function NovoPapelForm({
  empresaId,
  onCriado,
}: {
  empresaId: string;
  onCriado: (papel: WisePapel) => void;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submeter() {
    setErro(null);
    startTransition(async () => {
      const resultado = await criarPapelAction({ empresa_id: empresaId, nome, descricao });
      if (!resultado.ok) { setErro(resultado.erro); return; }
      onCriado(resultado.dados);
    });
  }

  return (
    <div className="space-y-3">
      <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Aprovador de Compras" />
      <Textarea label="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <Button onClick={submeter} disabled={pending || !nome.trim()} className="w-full justify-center">
        Criar papel
      </Button>
    </div>
  );
}

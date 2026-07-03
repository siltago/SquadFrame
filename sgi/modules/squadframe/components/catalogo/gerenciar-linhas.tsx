"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { editarLinha, apagarLinha } from "@/modules/squadframe/actions/catalogo/actions";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";
import { Alert } from "@/ui/components/Alert";
import { EmptyState } from "@/ui/components/EmptyState";

type Linha = {
  id: string;
  nome: string;
  fabricante: string | null;
  descricao: string | null;
  _count?: number;
};

function LinhaRow({ linha, podeCriar }: { linha: Linha; podeCriar: boolean }) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function handleEditar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await editarLinha(linha.id, fd);
        setEditando(false);
        router.refresh();
      } catch (err: any) { setErro(err.message); }
    });
  }

  function handleApagar() {
    setErro(null);
    start(async () => {
      try {
        await apagarLinha(linha.id);
      } catch (err: any) { setErro(err.message); setConfirmando(false); }
    });
  }

  if (editando) {
    return (
      <div className="border-b border-divider px-4 py-4 bg-bg last:border-0">
        <form onSubmit={handleEditar} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Nome *" name="nome" defaultValue={linha.nome} required size={undefined} className="h-8 text-sm" />
            <Input label="Fabricante / Fornecedor" name="fabricante" defaultValue={linha.fabricante ?? ""} className="h-8 text-sm" />
            <div className="sm:col-span-2">
              <Input label="Descrição" name="descricao" defaultValue={linha.descricao ?? ""} className="h-8 text-sm" />
            </div>
          </div>
          {erro && <Alert variant="danger" className="text-xs py-2">{erro}</Alert>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
            <Button type="button" variant="ghost" size="sm"
              onClick={() => { setEditando(false); setErro(null); }}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 border-b border-divider px-4 py-3 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text">{linha.nome}</p>
        <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-text-3">
          {linha.fabricante && <span>{linha.fabricante}</span>}
          {linha.descricao && <span>{linha.descricao}</span>}
          {linha._count !== undefined && (
            <span>{linha._count} produto{linha._count !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {podeCriar && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setEditando(true)}
            title="Editar"
            className="rounded p-1.5 text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          {!confirmando ? (
            <button
              onClick={() => setConfirmando(true)}
              title="Excluir"
              className="rounded p-1.5 text-text-3 hover:bg-danger-soft hover:text-danger transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {erro && <span className="text-xs text-danger">{erro}</span>}
              <Button
                size="sm"
                variant="danger"
                disabled={pending}
                onClick={handleApagar}
              >
                {pending ? "…" : "Confirmar"}
              </Button>
              <button
                onClick={() => { setConfirmando(false); setErro(null); }}
                className="text-xs text-text-3 hover:text-text"
              >
                Não
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GerenciarLinhas({
  linhas,
  tipoSlug,
  podeCriar,
}: {
  linhas: Linha[];
  tipoSlug: string;
  podeCriar: boolean;
}) {
  const podeGerenciar = usePode("catalogo.linha.gerenciar", "catalogo.criar") || podeCriar;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        {podeGerenciar && (
          <Button as="a" href={`/squadframe/catalogo/nova-linha?tipo=${tipoSlug}`} size="sm">
            + Nova linha
          </Button>
        )}
      </div>

      {linhas.length === 0 ? (
        <div className="card p-8">
          <EmptyState title="Nenhuma linha cadastrada para este tipo." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="border-b border-divider bg-bg px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-text-3">
              Linhas cadastradas ({linhas.length})
            </span>
          </div>
          {linhas.map((l) => (
            <LinhaRow key={l.id} linha={l} podeCriar={podeGerenciar} />
          ))}
        </div>
      )}
    </div>
  );
}

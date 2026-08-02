"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { excluirFornecedores, editarFornecedor } from "@/app/squadframe/compras/actions";
import { Button } from "@/ui/components/Button";
import { useBulkSelect } from "@/modules/squadframe/lib/use-bulk-select";
import { BulkDeleteToggle, BulkDeleteBar } from "@/modules/squadframe/components/bulk-delete-bar";
import { LoadingOverlay } from "@/ui/components/LoadingOverlay";
import { useLoadingOverlay } from "@/ui/lib/use-loading-overlay";

type TipoLinha = { nome: string; slug: string };
type Fornecedor = {
  id: string; nome: string; razao_social: string | null; cnpj: string | null;
  email: string | null; telefone: string | null; contato: string | null;
  ativo: boolean; tipos: string[] | null; faz_beneficiamento?: boolean;
  endereco: string | null; numero: string | null; complemento: string | null;
  bairro: string | null; cidade: string | null; estado: string | null; cep: string | null;
};

function FornecedorRow({ f, tiposLinha }: { f: Fornecedor; tiposLinha: TipoLinha[] }) {
  const [editando, setEditando] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  const podeEditar = usePode("catalogo.fornecedor.editar", "compras.fornecedor.editar");
  const { status: overlayStatus, run: runComOverlay } = useLoadingOverlay();

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    start(async () => {
      try {
        await runComOverlay(() => editarFornecedor(f.id, fd));
        setEditando(false);
        router.refresh();
      } catch (err: any) { setErro(err.message); }
    });
  }

  const tiposNomes = (f.tipos ?? [])
    .map(slug => tiposLinha.find(t => t.slug === slug)?.nome ?? slug)
    .filter(Boolean);

  if (editando) {
    return (
      <>
      {overlayStatus && (
        <LoadingOverlay status={overlayStatus} label={overlayStatus === "loading" ? "Salvando…" : "Feito!"} />
      )}
      <div className="px-4 py-4 bg-bg border-b border-border last:border-0">
        <form onSubmit={handleEdit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-3">Nome Fantasia *</label>
              <input name="nome" defaultValue={f.nome} required className="field h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-3">Razão Social</label>
              <input name="razao_social" defaultValue={f.razao_social ?? ""} className="field h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-3">CNPJ</label>
              <input name="cnpj" defaultValue={f.cnpj ?? ""} className="field h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-3">Telefone</label>
              <input name="telefone" defaultValue={f.telefone ?? ""} className="field h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-3">E-mail</label>
              <input name="email" type="email" defaultValue={f.email ?? ""} className="field h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-3">Contato</label>
              <input name="contato" defaultValue={f.contato ?? ""} className="field h-8 text-sm" />
            </div>
            <div className="sm:col-span-2 grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-wide text-text-3">Endereço</label>
                <input name="endereco" defaultValue={f.endereco ?? ""} className="field h-8 text-sm" placeholder="Rua, Av." />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-3">Número</label>
                <input name="numero" defaultValue={f.numero ?? ""} className="field h-8 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-3">CEP</label>
              <input name="cep" defaultValue={f.cep ?? ""} className="field h-8 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-wide text-text-3">Cidade</label>
                <input name="cidade" defaultValue={f.cidade ?? ""} className="field h-8 text-sm" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-3">UF</label>
                <input name="estado" defaultValue={f.estado ?? ""} className="field h-8 text-sm" maxLength={2} />
              </div>
            </div>
          </div>
          {tiposLinha.length > 0 && (
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-3">Fornece para</label>
              <div className="mt-1 flex flex-wrap gap-3">
                {tiposLinha.map((t) => (
                  <label key={t.slug} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" name="tipos" value={t.slug}
                      defaultChecked={(f.tipos ?? []).includes(t.slug)} className="rounded" />
                    {t.nome}
                  </label>
                ))}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" name="faz_beneficiamento" value="true"
              defaultChecked={!!f.faz_beneficiamento} className="rounded" />
            Faz beneficiamento (pintura, etc)
          </label>
          {erro && <p className="text-xs text-danger">{erro}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="text-xs px-3 py-1.5">
              {pending ? "Salvando…" : "Salvar"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setEditando(false); setErro(null); }}
              className="text-xs px-3 py-1.5">Cancelar</Button>
          </div>
        </form>
      </div>
      </>
    );
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 ${!f.ativo ? "opacity-40" : ""}`}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text">{f.nome}</p>
        <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-text-3">
          {f.cnpj && <span>{f.cnpj}</span>}
          {f.email && <span>{f.email}</span>}
          {f.telefone && <span>{f.telefone}</span>}
          {f.contato && <span>Contato: {f.contato}</span>}
        </div>
        {(tiposNomes.length > 0 || f.faz_beneficiamento) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tiposNomes.map((nome) => (
              <span key={nome} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {nome}
              </span>
            ))}
            {f.faz_beneficiamento && (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                Beneficiamento
              </span>
            )}
          </div>
        )}
      </div>
      {podeEditar && (
        <button onClick={() => setEditando(true)} title="Editar"
          className="shrink-0 rounded p-1.5 text-text-3 hover:bg-surface hover:text-text">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      )}
    </div>
  );
}

export function FornecedoresLista({
  fornecedores, tiposLinha,
}: {
  fornecedores: Fornecedor[]; tiposLinha: TipoLinha[];
}) {
  const podeExcluir = usePode("catalogo.fornecedor.excluir", "compras.fornecedor.excluir");
  const { modoExcluir, ativar, cancelar, selecionados, toggleItem, toggleTodos, confirmarExclusao, pending, erro, n } =
    useBulkSelect(excluirFornecedores);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-3">
          Cadastrados ({fornecedores.length})
        </h2>
        {podeExcluir && (
          <BulkDeleteToggle ativo={modoExcluir} onAtivar={ativar} onCancelar={cancelar} cancelarLabel="Cancelar" />
        )}
      </div>

      {fornecedores.length === 0 ? (
        <div className="card p-8 text-center text-sm text-text-3">Nenhum fornecedor cadastrado.</div>
      ) : (
        <div className="card overflow-x-auto">
          {modoExcluir && (
            <div className="flex items-center gap-2 px-4 py-2 bg-danger-soft dark:bg-red-900/10 border-b border-border">
              <input type="checkbox" checked={n === fornecedores.length && n > 0}
                onChange={(e) => toggleTodos(fornecedores.map((f) => f.id), e.target.checked)} className="rounded" />
              <span className="text-xs text-danger">Selecionar todos</span>
            </div>
          )}
          {fornecedores.map((f) => (
            <div key={f.id} className={modoExcluir && selecionados.has(f.id) ? "bg-danger-soft dark:bg-red-900/10" : ""}>
              {modoExcluir ? (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                  <input type="checkbox" checked={selecionados.has(f.id)}
                    onChange={(e) => toggleItem(f.id, e.target.checked)} className="rounded shrink-0" />
                  <span className="text-sm text-text">{f.nome}</span>
                </div>
              ) : (
                <FornecedorRow f={f} tiposLinha={tiposLinha} />
              )}
            </div>
          ))}
        </div>
      )}

      <BulkDeleteBar count={n} onConfirm={confirmarExclusao} onCancel={cancelar} pending={pending} erro={erro} label="fornecedor(es) selecionado(s)" />
    </>
  );
}

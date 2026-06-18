"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePode } from "@/components/user-provider";
import { excluirFornecedores, editarFornecedor } from "@/app/compras/actions";

type TipoLinha = { nome: string; slug: string };
type Fornecedor = {
  id: string; nome: string; cnpj: string | null; email: string | null;
  telefone: string | null; contato: string | null; ativo: boolean;
  tipos: string[] | null;
};

function FornecedorRow({ f, tiposLinha }: { f: Fornecedor; tiposLinha: TipoLinha[] }) {
  const [editando, setEditando] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  const podeEditar = usePode("compras.editar");

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    start(async () => {
      try {
        await editarFornecedor(f.id, fd);
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
      <div className="px-4 py-4 bg-canvas border-b border-line last:border-0">
        <form onSubmit={handleEdit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-ink-faint">Nome</label>
              <input name="nome" defaultValue={f.nome} required className="field h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-ink-faint">Contato</label>
              <input name="contato" defaultValue={f.contato ?? ""} className="field h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-ink-faint">E-mail</label>
              <input name="email" type="email" defaultValue={f.email ?? ""} className="field h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-ink-faint">Telefone</label>
              <input name="telefone" defaultValue={f.telefone ?? ""} className="field h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-ink-faint">CNPJ</label>
              <input name="cnpj" defaultValue={f.cnpj ?? ""} className="field h-8 text-sm" />
            </div>
          </div>
          {tiposLinha.length > 0 && (
            <div>
              <label className="text-[10px] uppercase tracking-wide text-ink-faint">Fornece para</label>
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
          {erro && <p className="text-xs text-red-500">{erro}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary text-xs px-3 py-1.5">
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" onClick={() => { setEditando(false); setErro(null); }}
              className="btn-ghost text-xs px-3 py-1.5">Cancelar</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b border-line last:border-0 ${!f.ativo ? "opacity-40" : ""}`}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink">{f.nome}</p>
        <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-ink-faint">
          {f.cnpj && <span>{f.cnpj}</span>}
          {f.email && <span>{f.email}</span>}
          {f.telefone && <span>{f.telefone}</span>}
          {f.contato && <span>Contato: {f.contato}</span>}
        </div>
        {tiposNomes.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tiposNomes.map((nome) => (
              <span key={nome} className="rounded-full bg-steel/10 px-2 py-0.5 text-[11px] font-medium text-steel">
                {nome}
              </span>
            ))}
          </div>
        )}
      </div>
      {podeEditar && (
        <button onClick={() => setEditando(true)} title="Editar"
          className="shrink-0 rounded p-1.5 text-ink-faint hover:bg-surface hover:text-ink">
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
  const podeExcluir = usePode("compras.excluir");
  const [modoExcluir, setModoExcluir] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggleItem(id: string, checked: boolean) {
    setSelecionados((prev) => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
  }
  function toggleTodos(checked: boolean) {
    setSelecionados(checked ? new Set(fornecedores.map((f) => f.id)) : new Set());
  }
  function cancelar() { setModoExcluir(false); setSelecionados(new Set()); setErro(null); }
  function confirmarExclusao() {
    setErro(null);
    start(async () => {
      try { await excluirFornecedores(Array.from(selecionados)); cancelar(); }
      catch (e: any) { setErro(e.message); }
    });
  }

  const n = selecionados.size;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-faint">
          Cadastrados ({fornecedores.length})
        </h2>
        {podeExcluir && (
          !modoExcluir ? (
            <button onClick={() => setModoExcluir(true)}
              className="inline-flex items-center gap-1.5 rounded-card border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Excluir
            </button>
          ) : (
            <button onClick={cancelar} className="text-xs text-ink-faint hover:text-ink underline">Cancelar</button>
          )
        )}
      </div>

      {fornecedores.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">Nenhum fornecedor cadastrado.</div>
      ) : (
        <div className="card overflow-hidden">
          {modoExcluir && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/10 border-b border-line">
              <input type="checkbox" checked={n === fornecedores.length && n > 0}
                onChange={(e) => toggleTodos(e.target.checked)} className="rounded" />
              <span className="text-xs text-red-600">Selecionar todos</span>
            </div>
          )}
          {fornecedores.map((f) => (
            <div key={f.id} className={modoExcluir && selecionados.has(f.id) ? "bg-red-50 dark:bg-red-900/10" : ""}>
              {modoExcluir ? (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
                  <input type="checkbox" checked={selecionados.has(f.id)}
                    onChange={(e) => toggleItem(f.id, e.target.checked)} className="rounded shrink-0" />
                  <span className="text-sm text-ink">{f.nome}</span>
                </div>
              ) : (
                <FornecedorRow f={f} tiposLinha={tiposLinha} />
              )}
            </div>
          ))}
        </div>
      )}

      {modoExcluir && n > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-red-200 bg-red-50 px-8 py-3 shadow-lg dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{n} fornecedor(es) selecionado(s)</p>
          <div className="flex items-center gap-3">
            {erro && <p className="text-xs text-red-600">{erro}</p>}
            <button onClick={cancelar} className="btn-ghost text-sm">Cancelar</button>
            <button onClick={confirmarExclusao} disabled={pending}
              className="rounded-card border border-red-300 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {pending ? "Excluindo…" : `Excluir ${n}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

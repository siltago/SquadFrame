"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adicionarAlias, editarAlias, excluirAlias } from "@/app/catalogo/actions";
import { specLabels } from "@/lib/tipo-unidade";

type Alias = {
  id: string; alias: string;
  fornecedor?: { id: string; nome: string } | null;
  peso_metro?: number | null; preco_metro?: number | null; tamanho_mm?: number | null;
};
type Fornecedor = { id: string; nome: string };

function SpecsDisplay({ a, tipoUnidade }: { a: Alias; tipoUnidade?: string | null }) {
  const labels = specLabels(tipoUnidade);
  const sufixoPeso  = (tipoUnidade === "CHAPA" || tipoUnidade === "M2") ? "kg/m²" : "kg/m";
  const sufixoPreco = (tipoUnidade === "CHAPA" || tipoUnidade === "M2") ? "/m²" : "/m";
  const specs = [
    a.tamanho_mm  != null && labels.tamanho && `${Number(a.tamanho_mm).toLocaleString("pt-BR")} mm`,
    a.peso_metro  != null && `${Number(a.peso_metro).toLocaleString("pt-BR", { minimumFractionDigits: 3 })} ${sufixoPeso}`,
    a.preco_metro != null && `${Number(a.preco_metro).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}${sufixoPreco}`,
  ].filter(Boolean);
  if (!specs.length) return <span className="text-ink-faint italic text-xs">—</span>;
  return <span className="text-xs text-ink-soft">{specs.join(" · ")}</span>;
}

function SpecsInputs({ a, tipoUnidade }: { a?: Alias; tipoUnidade?: string | null }) {
  const labels = specLabels(tipoUnidade);
  const showTamanho = !!labels.tamanho;
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {showTamanho && (
        <div className="min-w-[90px] flex-1">
          <label className="text-[10px] uppercase tracking-wide text-ink-faint">{labels.tamanho}</label>
          <input name="tamanho_mm" type="number" step="any" min="0"
            defaultValue={a?.tamanho_mm ?? ""} className="field h-7 text-xs" placeholder="6000" />
        </div>
      )}
      <div className="min-w-[80px] flex-1">
        <label className="text-[10px] uppercase tracking-wide text-ink-faint">{labels.peso}</label>
        <input name="peso_metro" type="number" step="any" min="0"
          defaultValue={a?.peso_metro ?? ""} className="field h-7 text-xs" placeholder="1.23" />
      </div>
      <div className="min-w-[80px] flex-1">
        <label className="text-[10px] uppercase tracking-wide text-ink-faint">{labels.preco}</label>
        <input name="preco_metro" type="number" step="any" min="0"
          defaultValue={a?.preco_metro ?? ""} className="field h-7 text-xs" placeholder="12.50" />
      </div>
    </div>
  );
}

function AliasRow({ a, produtoId, linhaId, tipoUnidade, fornecedoresDisponiveis }: {
  a: Alias; produtoId: string; linhaId: string;
  tipoUnidade?: string | null; fornecedoresDisponiveis: Fornecedor[];
}) {
  const [editando, setEditando] = useState(false);
  const [aliasVal, setAliasVal] = useState(a.alias);
  const [fornId, setFornId] = useState((a.fornecedor as any)?.id ?? "");
  const [pendEdit, startEdit] = useTransition();
  const [pendDel, startDel] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const specs = {
      peso_metro:  parseFloat(String(fd.get("peso_metro")  || "").replace(",", ".")) || null,
      preco_metro: parseFloat(String(fd.get("preco_metro") || "").replace(",", ".")) || null,
      tamanho_mm:  parseFloat(String(fd.get("tamanho_mm")  || "").replace(",", ".")) || null,
    };
    setErro(null);
    startEdit(async () => {
      try {
        await editarAlias(a.id, produtoId, linhaId, aliasVal, fornId || null, specs);
        setEditando(false);
        router.refresh();
      } catch (err: any) { setErro(err.message); }
    });
  }

  function deletar() {
    if (!confirm(`Excluir alias "${a.alias}"?`)) return;
    startDel(async () => {
      await excluirAlias(a.id, produtoId, linhaId);
      router.refresh();
    });
  }

  if (editando) {
    return (
      <tr className="border-b border-line last:border-0 bg-canvas">
        <td colSpan={4} className="px-4 py-3">
          <form onSubmit={salvar} className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[120px]">
                <label className="text-[10px] uppercase tracking-wide text-ink-faint">Código alias</label>
                <input value={aliasVal} onChange={(e) => setAliasVal(e.target.value)}
                  className="field h-7 w-full font-mono text-xs" />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] uppercase tracking-wide text-ink-faint">Fornecedor</label>
                <select value={fornId} onChange={(e) => setFornId(e.target.value)} className="field h-7 text-xs">
                  <option value="">Sem fornecedor</option>
                  {fornecedoresDisponiveis.map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <SpecsInputs a={a} tipoUnidade={tipoUnidade} />
            {erro && <p className="text-xs text-red-500">{erro}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={pendEdit || !aliasVal.trim()}
                className="btn-primary text-xs px-3 py-1">{pendEdit ? "…" : "Salvar"}</button>
              <button type="button" onClick={() => { setEditando(false); setAliasVal(a.alias); setErro(null); }}
                className="btn-ghost text-xs px-3 py-1">Cancelar</button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b border-line last:border-0 ${pendDel ? "opacity-40" : ""}`}>
      <td className="px-4 py-2.5 font-mono text-sm font-medium text-ink">{a.alias}</td>
      <td className="px-4 py-2.5 text-sm text-ink-soft">
        {(a.fornecedor as any)?.nome ?? <span className="text-ink-faint italic">—</span>}
      </td>
      <td className="px-4 py-2.5"><SpecsDisplay a={a} tipoUnidade={tipoUnidade} /></td>
      <td className="px-4 py-2.5">
        <div className="flex gap-1 justify-end">
          <button onClick={() => setEditando(true)} title="Editar"
            className="rounded p-1.5 text-ink-faint hover:bg-surface hover:text-ink">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={deletar} disabled={pendDel} title="Excluir"
            className="rounded p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

export function AbaAliases({ produtoId, linhaId, aliases, tipoUnidade, fornecedoresDisponiveis = [] }: {
  produtoId: string; linhaId: string;
  aliases: Alias[]; tipoUnidade?: string | null; fornecedoresDisponiveis?: Fornecedor[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [valor, setValor] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valor.trim()) return;
    const fd = new FormData(e.currentTarget);
    const specs = {
      peso_metro:  parseFloat(String(fd.get("peso_metro")  || "").replace(",", ".")) || null,
      preco_metro: parseFloat(String(fd.get("preco_metro") || "").replace(",", ".")) || null,
      tamanho_mm:  parseFloat(String(fd.get("tamanho_mm")  || "").replace(",", ".")) || null,
    };
    setErro(null);
    startTransition(async () => {
      try {
        await adicionarAlias(produtoId, linhaId, valor.trim(), fornecedorId || null, specs);
        setValor(""); setFornecedorId(""); setShowForm(false);
        router.refresh();
      } catch (err: any) { setErro(err.message); }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-ink-faint">
        Aliases são códigos alternativos — geralmente o código usado por cada fornecedor. Cada alias pode ter especificações técnicas próprias.
      </p>

      {aliases.length > 0 ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-2 font-medium">Código alias</th>
                <th className="px-4 py-2 font-medium">Fornecedor</th>
                <th className="px-4 py-2 font-medium">Especificações</th>
                <th className="px-4 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {aliases.map((a) => (
                <AliasRow key={a.id} a={a} produtoId={produtoId} linhaId={linhaId}
                  tipoUnidade={tipoUnidade} fornecedoresDisponiveis={fornecedoresDisponiveis} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-sm text-ink-faint">Nenhum alias cadastrado.</p>
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleSubmit} className="card p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Adicionar alias</p>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="label">Código</label>
              <input value={valor} onChange={(e) => setValor(e.target.value)}
                placeholder="Ex: 321, C-ABC-001…" className="field" disabled={pending} />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="label">Fornecedor <span className="text-ink-faint font-normal">(opcional)</span></label>
              <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}
                className="field" disabled={pending}>
                <option value="">Sem fornecedor</option>
                {fornecedoresDisponiveis.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <SpecsInputs tipoUnidade={tipoUnidade} />
          {erro && <p className="text-xs text-red-500">{erro}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setErro(null); }} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={pending || !valor.trim()} className="btn-primary">
              {pending ? "Adicionando…" : "Adicionar alias"}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md border border-dashed border-line px-4 py-3 text-sm font-medium text-ink-soft transition-colors hover:border-steel hover:text-steel">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Adicionar alias
        </button>
      )}
    </div>
  );
}

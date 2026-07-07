"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adicionarAlias, editarAlias, excluirAlias } from "@/modules/squadframe/actions/catalogo/actions";
import { specLabels } from "@/modules/squadframe/lib/tipo-unidade";
import { Button } from "@/ui/components/Button";

type Alias = {
  id: string; alias: string;
  fornecedor?: { id: string; nome: string } | null;
  cor?: { id: string; codigo_ral: string; nome: string | null; hex: string | null } | null;
  peso_metro?: number | null; preco_metro?: number | null; tamanho_mm?: number | null;
  preco_kg?: number | null;
};
type Fornecedor = { id: string; nome: string };
type CorVinculada = { id: string; codigo_ral: string; nome: string | null; hex: string | null };

function CorSelect({ value, onChange, coresVinculadas }: {
  value: string; onChange: (v: string) => void; coresVinculadas: CorVinculada[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="field h-7 text-xs">
      <option value="">Todas as cores</option>
      {coresVinculadas.map((c) => (
        <option key={c.id} value={c.id}>{c.codigo_ral}{c.nome ? ` — ${c.nome}` : ""}</option>
      ))}
    </select>
  );
}

function CorDisplay({ cor }: { cor?: Alias["cor"] }) {
  if (!cor) return <span className="text-text-3 italic">Todas as cores</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {cor.hex && <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-border" style={{ backgroundColor: cor.hex }} />}
      {cor.codigo_ral}{cor.nome ? ` — ${cor.nome}` : ""}
    </span>
  );
}

// Resolve specs efetivas do alias, herdando do produto mestre quando não informado
function resolveSpecs(a: Alias, masterPeso?: number | null, masterTamanho?: number | null) {
  const pesoEfetivo = a.peso_metro ?? masterPeso ?? null;
  return {
    pesoEfetivo,
    tamanhoEfetivo: a.tamanho_mm ?? masterTamanho ?? null,
    // preco_kg tem prioridade: preco_metro = peso × preco_kg
    precoMetroEfetivo: a.preco_kg != null && pesoEfetivo != null
      ? pesoEfetivo * a.preco_kg
      : a.preco_metro ?? null,
  };
}

function SpecsDisplay({ a, tipoUnidade, masterPeso, masterTamanho }: {
  a: Alias; tipoUnidade?: string | null;
  masterPeso?: number | null; masterTamanho?: number | null;
}) {
  const labels = specLabels(tipoUnidade);
  const isBarra = tipoUnidade?.toUpperCase() === "BARRA";
  const sufixoPeso  = (tipoUnidade === "CHAPA" || tipoUnidade === "M2") ? "kg/m²" : "kg/m";
  const sufixoPreco = (tipoUnidade === "CHAPA" || tipoUnidade === "M2") ? "/m²" : "/m";

  const { pesoEfetivo, tamanhoEfetivo, precoMetroEfetivo } = resolveSpecs(a, masterPeso, masterTamanho);

  const partes: string[] = [];

  if (labels.tamanho && tamanhoEfetivo != null) {
    const herdado = a.tamanho_mm == null;
    partes.push(`${Number(tamanhoEfetivo).toLocaleString("pt-BR")} mm${herdado ? " (herdado)" : ""}`);
  }
  if (pesoEfetivo != null) {
    const herdado = a.peso_metro == null;
    partes.push(`${Number(pesoEfetivo).toLocaleString("pt-BR", { minimumFractionDigits: 3 })} ${sufixoPeso}${herdado ? " (herdado)" : ""}`);
  }
  if (isBarra && a.preco_kg != null) {
    partes.push(`${Number(a.preco_kg).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/kg`);
  }
  if (precoMetroEfetivo != null) {
    const calc = isBarra && a.preco_kg != null;
    partes.push(`${Number(precoMetroEfetivo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}${sufixoPreco}${calc ? " (calc.)" : ""}`);
  }

  if (!partes.length) return <span className="text-text-3 italic text-xs">—</span>;
  return <span className="text-xs text-text-2">{partes.join(" · ")}</span>;
}

function SpecsInputs({ a, tipoUnidade, masterPeso, masterTamanho }: {
  a?: Alias; tipoUnidade?: string | null;
  masterPeso?: number | null; masterTamanho?: number | null;
}) {
  const labels = specLabels(tipoUnidade);
  const isBarra = tipoUnidade?.toUpperCase() === "BARRA";
  const showTamanho = !!labels.tamanho;
  const pesoParaCalculo = a?.peso_metro ?? masterPeso ?? null;
  const [precoKg, setPrecoKg] = useState<string>(a?.preco_kg != null ? String(a.preco_kg) : "");

  const precoMetroPreview = (() => {
    const kg = parseFloat(precoKg.replace(",", "."));
    if (!isNaN(kg) && kg > 0 && pesoParaCalculo != null) return kg * pesoParaCalculo;
    return null;
  })();

  return (
    <div className="space-y-2 mt-1">
      <div className="flex flex-wrap gap-2">
        {showTamanho && (
          <div className="min-w-[90px] flex-1">
            <label className="text-[10px] uppercase tracking-wide text-text-3">{labels.tamanho}</label>
            <input name="tamanho_mm" type="number" step="any" min="0"
              defaultValue={a?.tamanho_mm ?? ""}
              className="field h-7 text-xs"
              placeholder={masterTamanho ? `${masterTamanho} (mestre)` : "6000"} />
          </div>
        )}
        <div className="min-w-[80px] flex-1">
          <label className="text-[10px] uppercase tracking-wide text-text-3">{labels.peso}</label>
          <input name="peso_metro" type="number" step="any" min="0"
            defaultValue={a?.peso_metro ?? ""}
            className="field h-7 text-xs"
            placeholder={masterPeso ? `${masterPeso} (mestre)` : "1.23"} />
        </div>
        {isBarra ? (
          <div className="min-w-[80px] flex-1">
            <label className="text-[10px] uppercase tracking-wide text-text-3">Preço/kg (R$/kg)</label>
            <input name="preco_kg" type="number" step="any" min="0"
              value={precoKg}
              onChange={(e) => setPrecoKg(e.target.value)}
              className="field h-7 text-xs"
              placeholder="Ex: 18.50" />
          </div>
        ) : (
          <div className="min-w-[80px] flex-1">
            <label className="text-[10px] uppercase tracking-wide text-text-3">{labels.preco}</label>
            <input name="preco_metro" type="number" step="any" min="0"
              defaultValue={a?.preco_metro ?? ""}
              className="field h-7 text-xs" placeholder="12.50" />
          </div>
        )}
      </div>
      {isBarra && precoMetroPreview != null && (
        <p className="text-[11px] text-text-2">
          ={" "}
          <span className="font-medium">
            {precoMetroPreview.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/m
          </span>{" "}
          <span className="text-text-3">(peso × preço/kg)</span>
        </p>
      )}
      {isBarra && precoKg !== "" && pesoParaCalculo == null && (
        <p className="text-[11px] text-warning">
          Informe o peso (aqui ou no produto mestre) para calcular o preço/m.
        </p>
      )}
    </div>
  );
}

function AliasRow({ a, produtoId, linhaId, tipoUnidade, fornecedoresDisponiveis, coresVinculadas, masterPeso, masterTamanho }: {
  a: Alias; produtoId: string; linhaId: string;
  tipoUnidade?: string | null; fornecedoresDisponiveis: Fornecedor[]; coresVinculadas: CorVinculada[];
  masterPeso?: number | null; masterTamanho?: number | null;
}) {
  const [editando, setEditando] = useState(false);
  const [aliasVal, setAliasVal] = useState(a.alias);
  const [fornId, setFornId] = useState((a.fornecedor as any)?.id ?? "");
  const [corId, setCorId] = useState(a.cor?.id ?? "");
  const [pendEdit, startEdit] = useTransition();
  const [pendDel, startDel] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  const isBarra = tipoUnidade?.toUpperCase() === "BARRA";

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const specs = {
      peso_metro:  parseFloat(String(fd.get("peso_metro")  || "").replace(",", ".")) || null,
      preco_metro: isBarra ? null : parseFloat(String(fd.get("preco_metro") || "").replace(",", ".")) || null,
      tamanho_mm:  parseFloat(String(fd.get("tamanho_mm")  || "").replace(",", ".")) || null,
      preco_kg:    isBarra ? parseFloat(String(fd.get("preco_kg") || "").replace(",", ".")) || null : null,
    };
    setErro(null);
    startEdit(async () => {
      try {
        await editarAlias(a.id, produtoId, linhaId, aliasVal, fornId || null, specs, corId || null);
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
      <tr className="border-b border-border last:border-0 bg-bg">
        <td colSpan={5} className="px-4 py-3">
          <form onSubmit={salvar} className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[120px]">
                <label className="text-[10px] uppercase tracking-wide text-text-3">Código alias</label>
                <input value={aliasVal} onChange={(e) => setAliasVal(e.target.value)}
                  className="field h-7 w-full font-mono text-xs" />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] uppercase tracking-wide text-text-3">Fornecedor</label>
                <select value={fornId} onChange={(e) => setFornId(e.target.value)} className="field h-7 text-xs">
                  <option value="">Sem fornecedor</option>
                  {fornecedoresDisponiveis.map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] uppercase tracking-wide text-text-3">Cor</label>
                <CorSelect value={corId} onChange={setCorId} coresVinculadas={coresVinculadas} />
              </div>
            </div>
            <SpecsInputs a={a} tipoUnidade={tipoUnidade} masterPeso={masterPeso} masterTamanho={masterTamanho} />
            {erro && <p className="text-xs text-danger">{erro}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={pendEdit || !aliasVal.trim()} className="text-xs px-3 py-1">{pendEdit ? "…" : "Salvar"}</Button>
              <Button type="button" variant="ghost" onClick={() => { setEditando(false); setAliasVal(a.alias); setErro(null); }} className="text-xs px-3 py-1">Cancelar</Button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b border-border last:border-0 ${pendDel ? "opacity-40" : ""}`}>
      <td className="px-4 py-2.5 font-mono text-sm font-medium text-text">{a.alias}</td>
      <td className="px-4 py-2.5 text-sm text-text-2">
        {(a.fornecedor as any)?.nome ?? <span className="text-text-3 italic">—</span>}
      </td>
      <td className="px-4 py-2.5 text-sm text-text-2">
        <CorDisplay cor={a.cor} />
      </td>
      <td className="px-4 py-2.5">
        <SpecsDisplay a={a} tipoUnidade={tipoUnidade} masterPeso={masterPeso} masterTamanho={masterTamanho} />
      </td>
      <td className="px-4 py-2.5">
        <div className="flex gap-1 justify-end">
          <button onClick={() => setEditando(true)} title="Editar"
            className="rounded p-1.5 text-text-3 hover:bg-surface hover:text-text">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={deletar} disabled={pendDel} title="Excluir"
            className="rounded p-1.5 text-text-3 hover:bg-danger-soft hover:text-danger">
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

export function AbaAliases({ produtoId, linhaId, aliases, tipoUnidade, fornecedoresDisponiveis = [], coresVinculadas = [], masterFornecedorId, masterPeso, masterTamanho }: {
  produtoId: string; linhaId: string;
  aliases: Alias[]; tipoUnidade?: string | null; fornecedoresDisponiveis?: Fornecedor[]; coresVinculadas?: CorVinculada[];
  masterFornecedorId?: string | null;
  masterPeso?: number | null; masterTamanho?: number | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [valor, setValor] = useState("");
  // Pré-seleciona o fornecedor mestre do produto — na maioria dos casos
  // (mesmo componente, cores diferentes) o fornecedor é sempre o mesmo, só a
  // cor muda. O campo continua editável para o caso de fornecedor diferente.
  const [fornecedorId, setFornecedorId] = useState(masterFornecedorId ?? "");
  const [corId, setCorId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isBarra = tipoUnidade?.toUpperCase() === "BARRA";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valor.trim()) return;
    const fd = new FormData(e.currentTarget);
    const specs = {
      peso_metro:  parseFloat(String(fd.get("peso_metro")  || "").replace(",", ".")) || null,
      preco_metro: isBarra ? null : parseFloat(String(fd.get("preco_metro") || "").replace(",", ".")) || null,
      tamanho_mm:  parseFloat(String(fd.get("tamanho_mm")  || "").replace(",", ".")) || null,
      preco_kg:    isBarra ? parseFloat(String(fd.get("preco_kg") || "").replace(",", ".")) || null : null,
    };
    setErro(null);
    startTransition(async () => {
      try {
        await adicionarAlias(produtoId, linhaId, valor.trim(), fornecedorId || null, specs, corId || null);
        setValor(""); setCorId(""); setShowForm(false);
        router.refresh();
      } catch (err: any) { setErro(err.message); }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-text-3">
        Aliases são códigos alternativos usados por cada fornecedor — e, quando o código muda por cor
        dentro do mesmo fornecedor, um alias por cor (ex: FEC325PTR para preto, FEC325BRC para branco).
        {isBarra && " Para perfis comprados por peso, informe o preço/kg — o sistema calcula o preço/m automaticamente no pedido."}
        {" "}Peso e comprimento do produto mestre são herdados se não informados.
      </p>

      {aliases.length > 0 ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                <th className="px-4 py-2 font-medium">Código alias</th>
                <th className="px-4 py-2 font-medium">Fornecedor</th>
                <th className="px-4 py-2 font-medium">Cor</th>
                <th className="px-4 py-2 font-medium">Especificações</th>
                <th className="px-4 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {aliases.map((a) => (
                <AliasRow key={a.id} a={a} produtoId={produtoId} linhaId={linhaId}
                  tipoUnidade={tipoUnidade} fornecedoresDisponiveis={fornecedoresDisponiveis} coresVinculadas={coresVinculadas}
                  masterPeso={masterPeso} masterTamanho={masterTamanho} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-sm text-text-3">Nenhum alias cadastrado.</p>
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleSubmit} className="card p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-3">Adicionar alias</p>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="label">Código</label>
              <input value={valor} onChange={(e) => setValor(e.target.value)}
                placeholder="Ex: 321, FEC325PTR…" className="field" disabled={pending} />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="label">Fornecedor <span className="text-text-3 font-normal">(opcional)</span></label>
              <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}
                className="field" disabled={pending}>
                <option value="">Sem fornecedor</option>
                {fornecedoresDisponiveis.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="label">Cor <span className="text-text-3 font-normal">(opcional)</span></label>
              <select value={corId} onChange={(e) => setCorId(e.target.value)} className="field" disabled={pending}>
                <option value="">Todas as cores</option>
                {coresVinculadas.map((c) => (
                  <option key={c.id} value={c.id}>{c.codigo_ral}{c.nome ? ` — ${c.nome}` : ""}</option>
                ))}
              </select>
            </div>
          </div>
          <SpecsInputs tipoUnidade={tipoUnidade} masterPeso={masterPeso} masterTamanho={masterTamanho} />
          {erro && <p className="text-xs text-danger">{erro}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setErro(null); }}>Cancelar</Button>
            <Button type="submit" disabled={pending || !valor.trim()}>
              {pending ? "Adicionando…" : "Adicionar alias"}
            </Button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm font-medium text-text-2 transition-colors hover:border-primary hover:text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Adicionar alias
        </button>
      )}
    </div>
  );
}

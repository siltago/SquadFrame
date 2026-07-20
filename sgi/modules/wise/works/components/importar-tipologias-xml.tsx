"use client";

import { useRef, useState, useTransition } from "react";
import { importarTipologiasXmlAction } from "@/modules/wise/works/actions";
import { lerArquivoXml, parseXml, type RascunhoTipologia } from "@/modules/wise/works/lib/xml-tipologias";
import type { WiseTipologia } from "@/modules/wise/works/types";

function normalizar(s: string | null | undefined): string | null {
  const v = s?.trim().toLowerCase();
  return v ? v : null;
}

// Preview client-side da mesma regra de match usada no server
// (service.importarTipologiasXml) — só pra mostrar "vai atualizar" vs "novo"
// antes de confirmar; o match de verdade é recalculado no server.
function vaiAtualizar(item: RascunhoTipologia, existentes: WiseTipologia[], jaUsadas: Set<string>): string | null {
  const codigoItem = normalizar(item.codigo_esquadria);
  const nomeItem = normalizar(item.tipo) ?? normalizar(item.nome);
  const match = existentes.find((ex) => {
    if (jaUsadas.has(ex.id)) return false;
    const codigoEx = normalizar(ex.codigo_esquadria);
    if (codigoItem && codigoEx) return codigoItem === codigoEx;
    const nomeEx = normalizar(ex.tipo) ?? normalizar(ex.nome);
    return !codigoItem && !codigoEx && nomeItem !== null && nomeItem === nomeEx;
  });
  return match?.id ?? null;
}

function RascunhoRow({
  item,
  badge,
  onUpdate,
  onRemove,
}: {
  item: RascunhoTipologia;
  badge: "atualizar" | "novo";
  onUpdate: (u: RascunhoTipologia) => void;
  onRemove: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState<RascunhoTipologia>(item);

  function f(field: keyof RascunhoTipologia, value: any) {
    setDraft((p) => ({ ...p, [field]: value === "" ? null : value }));
  }

  function salvar() {
    onUpdate({ ...draft, nome: draft.tipo || draft.nome || "Sem tipo" });
    setEditando(false);
  }

  if (editando) {
    return (
      <div className="rounded-lg border-2 border-primary bg-surface p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <input autoFocus placeholder="Tipo / Nome" value={draft.tipo ?? ""} onChange={(e) => f("tipo", e.target.value)} className="col-span-2 sm:col-span-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" />
          <input placeholder="Código" value={draft.codigo_esquadria ?? ""} onChange={(e) => f("codigo_esquadria", e.target.value)} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm font-mono" />
          <input type="number" min="1" placeholder="Qtde" value={draft.quantidade} onChange={(e) => f("quantidade", parseInt(e.target.value) || 1)} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" />
          <input type="number" placeholder="Largura (mm)" value={draft.largura_mm ?? ""} onChange={(e) => f("largura_mm", parseInt(e.target.value))} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" />
          <input type="number" placeholder="Altura (mm)" value={draft.altura_mm ?? ""} onChange={(e) => f("altura_mm", parseInt(e.target.value))} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" />
          <input placeholder="Tratamento" value={draft.tratamento ?? ""} onChange={(e) => f("tratamento", e.target.value)} className="col-span-2 sm:col-span-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" />
          <input placeholder="Descrição" value={draft.descricao ?? ""} onChange={(e) => f("descricao", e.target.value)} className="col-span-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" />
          <input type="number" step="0.01" placeholder="Peso unit (kg)" value={draft.peso_unit ?? ""} onChange={(e) => f("peso_unit", parseFloat(e.target.value))} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" />
          <input type="number" step="0.01" placeholder="Preço unit (R$)" value={draft.preco_unit ?? ""} onChange={(e) => f("preco_unit", parseFloat(e.target.value))} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={salvar} className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary/90">Salvar</button>
          <button type="button" onClick={() => { setDraft(item); setEditando(false); }} className="text-xs text-text-3 hover:text-text-2">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          badge === "atualizar" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
        }`}
      >
        {badge === "atualizar" ? "Vai atualizar" : "Novo"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-text">{item.tipo || item.nome}</span>
          {item.codigo_esquadria && <span className="font-mono text-[11px] text-text-3">{item.codigo_esquadria}</span>}
        </div>
        <div className="mt-0.5 text-xs text-text-3">
          {item.quantidade} {item.quantidade === 1 ? "peça" : "peças"}
          {item.largura_mm && item.altura_mm ? ` · ${item.largura_mm}×${item.altura_mm} mm` : ""}
        </div>
      </div>
      <button type="button" onClick={() => setEditando(true)} className="text-xs text-text-3 hover:text-primary">Editar</button>
      <button type="button" onClick={onRemove} className="text-xs text-text-3 hover:text-red-500">Remover</button>
    </div>
  );
}

export function ImportarTipologiasXml({
  loteId,
  obraId,
  tipologiasExistentes,
  onImportado,
}: {
  loteId: string;
  obraId: string;
  tipologiasExistentes: WiseTipologia[];
  onImportado: () => void;
}) {
  const [rascunhos, setRascunhos] = useState<RascunhoTipologia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleXmlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setErro(null);
    lerArquivoXml(file)
      .then((text) => {
        const parsed = parseXml(text);
        if (parsed.length === 0) { setErro("Nenhuma tipologia encontrada no XML."); return; }
        setRascunhos(parsed);
      })
      .catch(() => setErro("Erro ao ler o arquivo XML."));
  }

  function handleUpdate(key: number, updated: RascunhoTipologia) {
    setRascunhos((prev) => prev?.map((r) => r._key === key ? updated : r) ?? null);
  }

  function handleRemove(key: number) {
    setRascunhos((prev) => {
      const next = prev?.filter((r) => r._key !== key) ?? null;
      return next?.length === 0 ? null : next;
    });
  }

  function confirmar() {
    if (!rascunhos?.length) return;
    const itens = rascunhos.map(({ _key, ...rest }) => rest);
    startTransition(async () => {
      const res = await importarTipologiasXmlAction(loteId, obraId, itens);
      if (!res.ok) { setErro(res.erro); return; }
      setRascunhos(null);
      setResultado(`${res.data.criadas} nova(s), ${res.data.atualizadas} atualizada(s).`);
      setTimeout(() => setResultado(null), 6000);
      onImportado();
    });
  }

  if (rascunhos !== null) {
    const jaUsadas = new Set<string>();
    const badges = rascunhos.map((r) => {
      const matchId = vaiAtualizar(r, tipologiasExistentes, jaUsadas);
      if (matchId) jaUsadas.add(matchId);
      return matchId ? ("atualizar" as const) : ("novo" as const);
    });

    return (
      <div className="space-y-3 rounded-lg border border-primary/30 bg-primary-soft p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text">
            Revisão do XML — {rascunhos.length} tipologia{rascunhos.length !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={confirmar}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Salvando…" : "Confirmar importação"}
            </button>
            <button type="button" onClick={() => { setRascunhos(null); setErro(null); }} className="text-xs text-text-3 hover:text-text-2">
              Cancelar
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {rascunhos.map((r, i) => (
            <RascunhoRow
              key={r._key}
              item={r}
              badge={badges[i]}
              onUpdate={(updated) => handleUpdate(r._key, updated)}
              onRemove={() => handleRemove(r._key)}
            />
          ))}
        </div>
        {erro && <p className="text-xs text-red-500">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
      >
        Importar XML
      </button>
      <input ref={fileRef} type="file" accept=".xml,text/xml" className="hidden" onChange={handleXmlChange} />
      {erro && <span className="text-xs text-red-500">{erro}</span>}
      {resultado && <span className="text-xs font-medium text-green-600">{resultado}</span>}
    </div>
  );
}

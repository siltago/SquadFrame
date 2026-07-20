"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importarLoteXmlAction } from "@/modules/wise/works/actions";
import { lerArquivoXml, parseXml, type RascunhoTipologia } from "@/modules/wise/works/lib/xml-tipologias";

export function ImportarLoteXml({ obraId }: { obraId: string }) {
  const [rascunhos, setRascunhos] = useState<RascunhoTipologia[] | null>(null);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
        setNome(file.name.replace(/\.xml$/i, ""));
      })
      .catch(() => setErro("Erro ao ler o arquivo XML."));
  }

  function cancelar() {
    setRascunhos(null);
    setNome("");
    setErro(null);
  }

  function confirmar() {
    if (!rascunhos?.length) return;
    if (!nome.trim()) { setErro("Nome do lote é obrigatório."); return; }
    setErro(null);
    const itens = rascunhos.map(({ _key, ...rest }) => rest);
    startTransition(async () => {
      const res = await importarLoteXmlAction(obraId, nome, itens);
      if (!res.ok) { setErro(res.erro); return; }
      cancelar();
      router.refresh();
    });
  }

  if (rascunhos !== null) {
    return (
      <div className="space-y-3 rounded-lg border border-primary/30 bg-primary-soft p-3">
        <p className="text-sm font-semibold text-text">
          Novo lote a partir do XML — {rascunhos.length} tipologia{rascunhos.length !== 1 ? "s" : ""}
        </p>
        <input
          autoFocus
          placeholder="Nome do lote"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {rascunhos.map((r) => (
            <div key={r._key} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs">
              <span className="font-medium text-text">{r.tipo || r.nome}</span>
              {r.codigo_esquadria && <span className="font-mono text-text-3">{r.codigo_esquadria}</span>}
              <span className="ml-auto text-text-3">{r.quantidade}{r.quantidade === 1 ? " peça" : " peças"}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending || !nome.trim()}
            onClick={confirmar}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Criando…" : "Confirmar importação"}
          </button>
          <button type="button" onClick={cancelar} className="text-xs text-text-3 hover:text-text-2">
            Cancelar
          </button>
          {erro && <span className="text-xs text-red-500">{erro}</span>}
        </div>
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
        Importar lote
      </button>
      <input ref={fileRef} type="file" accept=".xml,text/xml" className="hidden" onChange={handleXmlChange} />
      {erro && <span className="text-xs text-red-500">{erro}</span>}
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importarPerfisXml, atualizarPesosXml } from "@/modules/squadframe/actions/catalogo/actions";
import { Button } from "@/ui/components/Button";

type Item = { codigo: string; peso: number };

function lerArquivoXml(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo."));
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer;
      const head = new TextDecoder("iso-8859-1").decode(buffer.slice(0, 200));
      const match = head.match(/encoding=["']([^"']+)["']/i);
      const enc = match?.[1] ?? "utf-8";
      try {
        resolve(new TextDecoder(enc, { fatal: true }).decode(buffer));
      } catch {
        resolve(new TextDecoder("windows-1252").decode(buffer));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function parseXml(text: string): Item[] {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  return Array.from(doc.querySelectorAll("Perfil"))
    .map((n) => ({
      codigo: n.getAttribute("codigo")?.trim() ?? "",
      peso: parseFloat(n.getAttribute("peso_kg_m") ?? "0"),
    }))
    .filter((n) => n.codigo);
}

type Modo = "importar" | "pesos";

export function ImportarXml({ linhaId }: { linhaId: string }) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<Modo>("importar");
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setErro(null);
    setResultado(null);

    lerArquivoXml(file)
      .then((text) => {
        const parsed = parseXml(text);
        if (parsed.length === 0) { setErro("Nenhum <Perfil> encontrado no XML."); return; }
        setItens(parsed);
        setAberto(true);
      })
      .catch(() => setErro("Erro ao ler o arquivo XML."));
  }

  function handleConfirmar() {
    if (!itens?.length) return;
    startTransition(async () => {
      try {
        if (modo === "importar") {
          const res = await importarPerfisXml(linhaId, JSON.stringify(itens));
          const msg = res.importados > 0
            ? `${res.importados} perfil${res.importados !== 1 ? "is" : ""} importado${res.importados !== 1 ? "s" : ""}${res.duplicatas > 0 ? ` · ${res.duplicatas} ignorado${res.duplicatas !== 1 ? "s" : ""} (já existem)` : ""}.`
            : `Todos os ${res.duplicatas} perfis já existem no catálogo.`;
          setResultado(msg);
        } else {
          const res = await atualizarPesosXml(linhaId, JSON.stringify(itens));
          setResultado(`Peso atualizado em ${res.atualizados} perfil${res.atualizados !== 1 ? "is" : ""}.`);
        }
        setItens(null);
        setAberto(false);
        router.refresh();
      } catch (err: any) {
        setErro(`Erro: ${err.message}`);
      }
    });
  }

  function fechar() {
    setAberto(false);
    setItens(null);
    setErro(null);
  }

  return (
    <>
      {/* Botão trigger */}
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
        </svg>
        Importar XML
      </button>
      <input ref={fileRef} type="file" accept=".xml,text/xml" className="hidden" onChange={handleFile} />

      {/* Feedback fora do modal */}
      {resultado && !aberto && (
        <span className="text-sm font-medium text-success">{resultado}</span>
      )}
      {erro && !aberto && (
        <span className="text-sm text-danger">{erro}</span>
      )}

      {/* Modal de preview */}
      {aberto && itens && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={fechar} />

          {/* Painel */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-border shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-text">
                  {itens.length} perfil{itens.length !== 1 ? "is" : ""} no XML
                </p>
                <button onClick={fechar} className="text-text-3 hover:text-text transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              {/* Toggle de modo */}
              <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                <button
                  onClick={() => setModo("importar")}
                  className={`flex-1 py-1.5 font-medium transition-colors ${modo === "importar" ? "bg-primary text-white" : "text-text-2 hover:bg-bg"}`}
                >
                  Importar novos
                </button>
                <button
                  onClick={() => setModo("pesos")}
                  className={`flex-1 py-1.5 font-medium transition-colors ${modo === "pesos" ? "bg-primary text-white" : "text-text-2 hover:bg-bg"}`}
                >
                  Atualizar pesos
                </button>
              </div>
              <p className="text-xs text-text-3">
                {modo === "importar"
                  ? "Cria perfis novos. Os que já existem são ignorados."
                  : "Sobrescreve apenas o peso (kg/m) dos perfis existentes pelo código."}
              </p>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1 px-5 py-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-3 border-b border-border">
                    <th className="pb-2 font-medium">Código</th>
                    <th className="pb-2 font-medium text-right">Peso (kg/m)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {itens.map((item) => (
                    <tr key={item.codigo}>
                      <td className="py-1.5 font-mono text-xs text-text">{item.codigo}</td>
                      <td className="py-1.5 text-right text-xs text-text-2">{item.peso.toFixed(5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border shrink-0">
              {erro && <p className="text-xs text-danger flex-1">{erro}</p>}
              {!erro && <p className="text-xs text-text-3 flex-1">Os já existentes serão ignorados automaticamente.</p>}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={fechar} disabled={pending} className="text-sm py-1.5 px-4">Cancelar</Button>
                <Button onClick={handleConfirmar} disabled={pending} className="text-sm py-1.5 px-4 disabled:opacity-50">
                  {pending
                    ? (modo === "pesos" ? "Atualizando…" : "Importando…")
                    : (modo === "pesos" ? `Atualizar ${itens.length} pesos` : `Importar ${itens.length}`)}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

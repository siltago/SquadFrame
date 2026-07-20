// Parsing de XML de tipologias (janelas/portas) exportado por ERP/CAD externo
// — só usa Web APIs (FileReader/DOMParser), sem dependência externa. Portado
// do SquadFrame (aba-producao.tsx) na migração do import de XML pro Wise.

export type TipologiaParseada = {
  nome: string;
  quantidade: number;
  codigo_esquadria: string | null;
  tipo: string | null;
  largura_mm: number | null;
  altura_mm: number | null;
  tratamento: string | null;
  descricao: string | null;
  peso_unit: number | null;
  preco_unit: number | null;
};

export type RascunhoTipologia = TipologiaParseada & { _key: number };

export function lerArquivoXml(file: File): Promise<string> {
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

export function parseXml(text: string): RascunhoTipologia[] {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  const nodes = Array.from(doc.querySelectorAll("TIPOLOGIA"));
  const t = (node: Element, tag: string) =>
    node.querySelector(tag)?.textContent?.trim() ?? "";

  return nodes.map((node, idx) => {
    const tipo = t(node, "TIPO");
    return {
      _key: idx,
      nome: tipo || "Sem tipo",
      quantidade: parseInt(t(node, "QTDE")) || 1,
      codigo_esquadria: t(node, "CODESQD") || null,
      tipo: tipo || null,
      largura_mm: parseInt(t(node, "LARGURA")) || null,
      altura_mm: parseInt(t(node, "ALTURA")) || null,
      tratamento: t(node, "TRAT_PERF") || null,
      descricao: t(node, "DESCR") || null,
      peso_unit: parseFloat(t(node, "PESO_UNIT").replace(",", ".")) || null,
      preco_unit: parseFloat(t(node, "PRECO_UNIT").replace(",", ".")) || null,
    };
  });
}

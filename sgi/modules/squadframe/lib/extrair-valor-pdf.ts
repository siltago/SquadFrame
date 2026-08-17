import "server-only";
import { ensurePdfEnvPolyfills, ensurePdfWorkerLoaded } from "@/modules/squadframe/lib/pdf-env-polyfills";

export type CandidatoValorFinal = { valor: number; linha: string };

export type ResultadoExtracaoValorFinal = {
  melhorCandidato: CandidatoValorFinal | null;
};

// Termos que costumam anteceder o valor final de uma devolutiva/nota,
// em ordem de confiança (o primeiro que aparecer numa linha "vence" —
// evita que um "Subtotal" mais cedo no documento seja escolhido no lugar
// do "Total Geral"/"Valor a Pagar" que vem depois).
const PALAVRAS_CHAVE_PRIORIDADE = [
  "valor final",
  "total geral",
  "valor liquido",
  "total a pagar",
  "valor a pagar",
  "total da nota",
  "total nf",
  "valor total",
  "total",
];

// R$ 1.234,56 / 1234,56 — formato brasileiro (vírgula decimal, ponto de milhar opcional).
const REGEX_VALOR_BR = /R?\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g;

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function paraNumero(match: string): number {
  return Number(match.replace(/\./g, "").replace(",", "."));
}

function valoresDaLinha(linha: string): number[] {
  return [...linha.matchAll(REGEX_VALOR_BR)].map((m) => paraNumero(m[1])).filter((v) => v > 0);
}

// Extrai o texto do PDF e procura o valor final por proximidade de palavras-chave.
// Sem IA: layouts variam muito entre fornecedores, então isso é só um "melhor
// palpite" — a tela sempre mostra o valor encontrado pro comprador confirmar
// ou corrigir antes de salvar. Só um valor é sugerido (o de maior prioridade
// de palavra-chave; na ausência de qualquer palavra-chave, o maior valor
// monetário do documento, já que totais tendem a ser o maior número).
export async function extrairValorFinalPdf(buffer: Buffer): Promise<ResultadoExtracaoValorFinal> {
  // Import dinâmico de propósito: "pdf-parse" carrega a build legacy do
  // pdfjs-dist, que referencia DOMMatrix (API de navegador) no topo do
  // módulo. Um import estático aqui faria QUALQUER arquivo que importe este
  // módulo (mesmo sem nunca chamar extrairValorFinalPdf) puxar pdfjs pro
  // bundle do servidor — e como pedidos.ts é reexportado pelo barrel
  // app/squadframe/compras/actions.ts, isso quebrava até páginas sem nenhuma
  // relação com PDF (ex: /squadframe/compras/fornecedores) com
  // "ReferenceError: DOMMatrix is not defined" na inicialização do módulo.
  // Polyfill primeiro — pdfjs-dist tenta se auto-polyfillar via
  // @napi-rs/canvas (não instalado), falha silenciosamente e código mais
  // adiante ainda referencia DOMMatrix como global — ver pdf-env-polyfills.ts.
  ensurePdfEnvPolyfills();
  await ensurePdfWorkerLoaded();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  let texto = "";
  try {
    const resultado = await parser.getText();
    texto = resultado.text;
  } finally {
    await parser.destroy();
  }

  const linhas = texto.split("\n").map((l) => l.trim()).filter(Boolean);

  const candidatosPorPalavra: (CandidatoValorFinal & { prioridade: number })[] = [];
  const todosValores = new Map<number, string>();

  linhas.forEach((linha, idx) => {
    const linhaNorm = normalizar(linha);
    const valoresNaLinha = valoresDaLinha(linha);
    for (const v of valoresNaLinha) todosValores.set(v, linha);

    for (let p = 0; p < PALAVRAS_CHAVE_PRIORIDADE.length; p++) {
      if (!linhaNorm.includes(PALAVRAS_CHAVE_PRIORIDADE[p])) continue;

      // Em tabelas, o valor às vezes cai na linha seguinte à do rótulo.
      const valores = valoresNaLinha.length ? valoresNaLinha : valoresDaLinha(linhas[idx + 1] ?? "");
      for (const v of valores) candidatosPorPalavra.push({ valor: v, linha, prioridade: p });
      break; // só a palavra-chave de maior prioridade encontrada na linha conta
    }
  });

  candidatosPorPalavra.sort((a, b) => a.prioridade - b.prioridade);

  let melhorCandidato: CandidatoValorFinal | null = candidatosPorPalavra[0]
    ? { valor: candidatosPorPalavra[0].valor, linha: candidatosPorPalavra[0].linha }
    : null;

  if (!melhorCandidato && todosValores.size) {
    const [valor, linha] = [...todosValores.entries()].sort((a, b) => b[0] - a[0])[0];
    melhorCandidato = { valor, linha };
  }

  return { melhorCandidato };
}

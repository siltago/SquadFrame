import "server-only";
import { ensurePdfEnvPolyfills, ensurePdfWorkerLoaded } from "@/modules/squadframe/lib/pdf-env-polyfills";

export type ResultadoExtracaoRomaneio = {
  texto: string;
  numeroCandidato: string | null;
  dataCandidata: string | null; // ISO yyyy-mm-dd
  tokensNumericos: string[];    // candidatos a número de pedido (2 a 6 dígitos)
};

const PALAVRAS_CHAVE_NUMERO = ["romaneio", "n°", "nº", "numero", "número"];
const PALAVRAS_CHAVE_DATA = ["data", "entrega", "emissao", "emissão"];

// dd/mm/yyyy ou dd/mm/yy
const REGEX_DATA = /(\d{2})\/(\d{2})\/(\d{2,4})/;
// tokens de 2 a 6 dígitos — candidatos a número de pedido (o formato real é
// validado depois, contra pedidos_compra de verdade, não aqui). Lookaround
// de dígito (não \b) de propósito: no romaneio o número costuma vir colado
// a letras ("PC Nº565", "PCN565") — \b não marca fronteira entre letra e
// dígito (ambos são \w), então \b\d+\b nunca bateria nesses casos.
const REGEX_TOKEN_NUMERICO = /(?<!\d)\d{2,6}(?!\d)/g;

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function paraIso(dia: string, mes: string, ano: string): string | null {
  const anoCompleto = ano.length === 2 ? `20${ano}` : ano;
  const d = new Date(`${anoCompleto}-${mes}-${dia}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${anoCompleto}-${mes}-${dia}`;
}

// Extrai o texto de um PDF de romaneio e levanta candidatos (número, data,
// tokens numéricos que podem ser número de pedido) — sem IA, layout varia
// muito entre fornecedores. Nunca é persistido direto: a tela sempre mostra
// os candidatos pra revisão/edição antes de confirmar, mesmo espírito de
// extrairValorFinalPdf.
export async function extrairDadosRomaneioPdf(buffer: Buffer): Promise<ResultadoExtracaoRomaneio> {
  // Import dinâmico de propósito — ver extrair-valor-pdf.ts pro porquê
  // (pdf-parse carrega pdfjs-dist; um import estático aqui quebraria
  // qualquer página que importe este arquivo, mesmo sem nunca chamar esta
  // função). Polyfill primeiro — ver pdf-env-polyfills.ts.
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

  let numeroCandidato: string | null = null;
  let dataCandidata: string | null = null;

  for (let idx = 0; idx < linhas.length; idx++) {
    const linhaNorm = normalizar(linhas[idx]);

    if (!numeroCandidato && PALAVRAS_CHAVE_NUMERO.some((p) => linhaNorm.includes(p))) {
      // pega o primeiro token alfanumérico "grudado" na palavra-chave ou
      // logo depois — ex: "Romaneio: 12345", "Nº 987-A"
      const m = linhas[idx].match(/[:\s]([\dA-Za-z-]{3,20})\s*$/) ?? linhas[idx + 1]?.match(/^([\dA-Za-z-]{3,20})/);
      if (m) numeroCandidato = m[1];
    }

    if (!dataCandidata && PALAVRAS_CHAVE_DATA.some((p) => linhaNorm.includes(p))) {
      const m = linhas[idx].match(REGEX_DATA) ?? linhas[idx + 1]?.match(REGEX_DATA);
      if (m) dataCandidata = paraIso(m[1], m[2], m[3]);
    }
  }

  // Fallback: primeira data do documento, se nenhuma palavra-chave bateu.
  if (!dataCandidata) {
    const m = texto.match(REGEX_DATA);
    if (m) dataCandidata = paraIso(m[1], m[2], m[3]);
  }

  const tokensNumericos = Array.from(new Set(texto.match(REGEX_TOKEN_NUMERICO) ?? []));

  return { texto, numeroCandidato, dataCandidata, tokensNumericos };
}

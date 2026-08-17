import "server-only";

// pdf-parse carrega pdfjs-dist (build legacy), que em runtime Node/serverless
// (sem DOM) tenta se auto-polyfillar via @napi-rs/canvas — mas essa
// dependência opcional não está instalada aqui, então o polyfill automático
// falha (só avisa: "Cannot polyfill DOMMatrix/ImageData/Path2D") e código
// mais adiante do pdfjs-dist ainda referencia esses globais diretamente,
// derrubando com "ReferenceError: DOMMatrix is not defined". Só extraímos
// texto (getText()), nunca renderizamos nada — stubs vazios bastam, o
// pdfjs-dist só precisa que os construtores existam no escopo global.
// Chamar sempre ANTES de `await import("pdf-parse")`.
export function ensurePdfEnvPolyfills(): void {
  const g = globalThis as Record<string, unknown>;
  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = class DOMMatrix {
      constructor(..._args: unknown[]) {}
    };
  }
  if (typeof g.ImageData === "undefined") {
    g.ImageData = class ImageData {
      constructor(..._args: unknown[]) {}
    };
  }
  if (typeof g.Path2D === "undefined") {
    g.Path2D = class Path2D {
      constructor(..._args: unknown[]) {}
    };
  }
}

// Sem processo real de Worker em serverless, pdfjs-dist cai pro "fake
// worker": tenta `import(this.workerSrc)` — um caminho guardado numa
// variável, não um literal — pra achar pdf.worker.mjs. O rastreador de
// arquivos da Vercel (@vercel/nft) só inclui no bundle de deploy os módulos
// que consegue detectar por análise estática; um import por variável é
// invisível pra ele, então o worker nunca vai pro bundle e o fallback
// quebra com "Cannot find module .../pdf.worker.mjs" em produção (funciona
// local porque ali o node_modules inteiro existe). Import aqui com literal
// (rastreável) e populando `globalThis.pdfjsWorker` faz o pdfjs-dist achar
// o handler já pronto e nunca tentar aquele import dinâmico — ver
// `#mainThreadWorkerMessageHandler`/`_setupFakeWorkerGlobal` em
// pdfjs-dist/legacy/build/pdf.mjs.
let workerCarregado = false;
export async function ensurePdfWorkerLoaded(): Promise<void> {
  if (workerCarregado) return;
  const workerModule = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  (globalThis as Record<string, unknown>).pdfjsWorker = workerModule;
  workerCarregado = true;
}

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

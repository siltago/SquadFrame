// Allows importing CSS files as side-effects in TypeScript
declare module "*.css" {}

// Import literal (rastreável pelo @vercel/nft) do worker do pdfjs-dist —
// ver ensurePdfWorkerLoaded em modules/squadframe/lib/pdf-env-polyfills.ts.
// O pacote não expõe tipos pra esse subcaminho.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";

// PWA: beforeinstallprompt event (não está no lib.dom.d.ts padrão)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

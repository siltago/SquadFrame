/**
 * Gera os ícones de PWA/"adicionar à tela inicial" a partir da logo do
 * SquadSystem usada na tela de login (public/logo-system.png) — sem fundo,
 * a logo já vem com alpha. Sobe a versão (vN) sempre que regenerar, pra
 * forçar os dispositivos que já instalaram o app a buscar o ícone novo
 * (o manifest/apple-touch-icon costumam ficar em cache agressivo).
 * Uso: node scripts/gerar-icone-pwa.mjs
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const INPUT = path.join(root, "public", "logo-system.png");
const OUT_DIR = path.join(root, "public");
const VERSAO = "v3";
const TRANSPARENTE = { r: 0, g: 0, b: 0, alpha: 0 };

async function makeIcon(size, outFile) {
  await sharp(INPUT)
    .resize(size, size, { fit: "contain", background: TRANSPARENTE })
    .png({ compressionLevel: 9 })
    .toFile(outFile);
  console.log(`✓ ${outFile} (${size}×${size})`);
}

async function main() {
  // Manifest PWA (Android/desktop "instalar app") — ver public/manifest.webmanifest
  await makeIcon(192, path.join(OUT_DIR, `icon-192-${VERSAO}.png`));
  await makeIcon(512, path.join(OUT_DIR, `icon-${VERSAO}.png`));

  // Apple touch icon ("adicionar à tela de início" no iOS) — ver app/layout.tsx
  await makeIcon(180, path.join(OUT_DIR, "apple-icon.png"));

  console.log("\nícones gerados em public/ — lembre de atualizar as referências de versão em manifest.webmanifest se mudou VERSAO.");
  console.log("Nota: app/icon.png (favicon da aba) NÃO é gerado aqui de propósito — ele também é usado como");
  console.log("ícone do card do módulo SquadFrame na tela de seleção de módulos (ver modules/home/data/modules.ts).");
  console.log("O favicon da aba usa a logo do SquadSystem via metadata.icons em app/layout.tsx, não este arquivo.");
}

main().catch(err => { console.error(err); process.exit(1); });

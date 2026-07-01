/**
 * Gera o ícone PWA: gradiente #222831 → #00A6C0 + logo centralizada
 * Uso: node scripts/gerar-icone-pwa.mjs
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const INPUT = path.resolve("C:/Users/sms/Downloads/pwa-frame.png");
const OUT_DIR = path.join(root, "public");

// Fundo sólido #222831
const BG = { r: 0x22, g: 0x28, b: 0x31 };

async function solidBg(size) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: { ...BG, alpha: 255 } },
  }).png().toBuffer();
}

async function makeIcon(size, outFile) {
  // Logo ocupa 80% do ícone, centralizada com padding
  const logoSize = Math.round(size * 0.80);
  const offset   = Math.round((size - logoSize) / 2);

  // Apara o espaço em branco da imagem original, depois redimensiona para 80%
  const logo = await sharp(INPUT)
    .trim({ threshold: 30 })
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const bg = await solidBg(size);

  await sharp(bg)
    .composite([{ input: logo, top: offset, left: offset, blend: "over" }])
    .png({ compressionLevel: 9 })
    .toFile(outFile);

  console.log(`✓ ${outFile} (${size}×${size})`);
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`Arquivo não encontrado: ${INPUT}`);
    process.exit(1);
  }

  // Favicon do site: apara o fundo e deixa transparente
  await sharp(INPUT)
    .trim({ threshold: 30 })
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(OUT_DIR, "favicon.png"));
  console.log(`✓ public/favicon.png (fundo transparente)`);

  // Ícones PWA com gradiente
  await makeIcon(512, path.join(OUT_DIR, "icon.png"));
  await makeIcon(192, path.join(OUT_DIR, "icon-192.png"));

  console.log("\nícones gerados em public/");
}

main().catch(err => { console.error(err); process.exit(1); });

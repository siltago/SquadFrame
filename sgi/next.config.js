/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdfjs-dist precisa estar aqui também, não só pdf-parse: o import
    // literal do worker (pdf-env-polyfills.ts, ~2MB) referencia
    // "pdfjs-dist/..." direto, e sem isso o webpack embutia esse arquivo
    // no bundle de QUALQUER página que toque no barrel de actions de
    // compras (pedidos.ts é reexportado lá) — inflando o cold start de
    // praticamente toda tela do módulo, não só a de romaneio/devolutiva.
    serverComponentsExternalPackages: ["sharp", "dxf", "web-push", "pdf-parse", "pdfjs-dist"],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },

  // Catálogo migrou de /squadframe/catalogo para /squadstock/catalogo
  // (código movido de módulo, banco intacto). Mantém links/favoritos
  // antigos funcionando.
  async redirects() {
    return [
      {
        source: "/squadframe/catalogo/:path*",
        destination: "/squadstock/catalogo/:path*",
        permanent: false,
      },
    ];
  },

  // Permite que o service worker em /sw.js controle todo o escopo /
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

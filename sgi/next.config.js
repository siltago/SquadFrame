/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp", "dxf", "web-push", "pdf-parse"],
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

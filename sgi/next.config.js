/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp", "dxf"],
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

  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
      // Nomes estáveis entre rebuilds — evita "Cannot find module './2618.js'"
      config.optimization = {
        ...config.optimization,
        moduleIds: "named",
        chunkIds: "named",
      };
    }
    return config;
  },
};

module.exports = nextConfig;

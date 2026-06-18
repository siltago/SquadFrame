/** @type {import('next').NextConfig} */
const nextConfig = {
  // Em Next.js 14.2+ serverComponentsExternalPackages saiu do experimental
  serverExternalPackages: ["sharp", "dxf"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

module.exports = nextConfig;

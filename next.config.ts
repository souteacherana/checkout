import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos de depoimento, da instrutora e do ticket da landing do TNP moram
    // no Vercel Blob (ver src/app/lp/tnp/_lib/assets.ts). O next/image recusa
    // otimizar host que não esteja declarado aqui — sem esta liberação, TODA
    // imagem da landing que passa pelo next/image volta 400, e sobra só o
    // hero, que é background-image no CSS.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dtfnsnlwyzhalvu7.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },

  async headers() {
    return [
      {
        // Assets das landing pages (fotos de depoimento, logos…). O padrão do
        // Next pra /public é `max-age=0, must-revalidate`: o navegador
        // rebaixava ~1MB de fotos a cada visita. Estas imagens praticamente
        // não mudam, e quando mudam trocam de nome — daí o cache longo com
        // stale-while-revalidate (serve do cache e atualiza em segundo plano).
        source: "/lp/:caminho*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

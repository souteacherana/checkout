import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos de depoimento, da instrutora e do ticket das landings moram no
    // Vercel Blob (ver o _lib/assets.ts de cada uma: /lp/tnp e /lp/led). O
    // next/image recusa otimizar host que não esteja declarado aqui — sem esta
    // liberação, TODA imagem da landing que passa pelo next/image volta 400, e
    // sobra só o hero, que é servido da própria origem.
    //
    // O pathname "/**" cobre o store inteiro, então uma landing nova que use o
    // mesmo Blob não precisa mexer aqui — só numa pasta própria lá dentro.
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

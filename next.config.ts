import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

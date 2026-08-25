import { redirect } from "next/navigation";
import { buscarDestinoPadrao, comQueryDaVisita } from "@/lib/destino-padrao";
import { ProdutoIndisponivel } from "@/components/ProdutoIndisponivel";

// Sempre do banco: se ficasse estática, o destino seria congelado no build e
// trocar a campanha pelo painel não teria efeito até o próximo deploy — o
// acoplamento que a migração 022 desfez.
export const dynamic = "force-dynamic";

/**
 * Raiz do site (dos dois domínios) — manda pro produto em campanha.
 *
 * Antes daqui saía um checkout montado a partir de THEMES + a env var
 * WORKSHOP_THEME, que sem configuração nenhuma vendia um "Workshop" genérico
 * de R$ 49,90. Quem chega na raiz quer a campanha do momento, e ela agora é
 * escolhida no painel.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const destino = await buscarDestinoPadrao();
  // As UTMs do anúncio chegam aqui e precisam seguir viagem até o checkout.
  if (destino) redirect(comQueryDaVisita(destino.url, await searchParams));

  // Nenhum produto marcado como destino padrão. Melhor uma página honesta que
  // um 404 na raiz do domínio — e a equipe resolve num clique no painel.
  // Sem destino, o botão cai no site da marca (o padrão do componente).
  return <ProdutoIndisponivel />;
}

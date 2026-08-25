import { buscarDestinoPadrao } from "@/lib/destino-padrao";
import { ProdutoIndisponivel } from "@/components/ProdutoIndisponivel";

/**
 * 404 do projeto.
 *
 * Sem isto, quem abre um link de produto que saiu do ar cai no 404 cru do
 * Next ("This page could not be found") — tela de erro técnico numa visita
 * que veio de anúncio. O caminho comum é o desvio pro produto em campanha
 * (ver [produto]/page.tsx); aqui é o que sobra quando não há pra onde
 * desviar, e mesmo assim o botão aponta pra campanha se houver alguma.
 */
export default async function NaoEncontrado() {
  const destino = await buscarDestinoPadrao();
  return <ProdutoIndisponivel href={destino?.url} />;
}

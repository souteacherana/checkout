import { supabaseAdmin } from "@/lib/supabase-admin";

export type DestinoPadrao = {
  slug: string;
  /** Pra onde mandar o visitante — absoluta sempre que dá. */
  url: string;
};

/**
 * Produto marcado como destino padrão no painel (Produtos → "Destino padrão").
 *
 * É pra onde vai quem abre a raiz do site e quem cai num /{slug} que não
 * existe mais. Só um produto pode estar marcado — quem garante isso é o
 * índice único da migração 022, não a tela.
 *
 * Devolve null quando não há destino definido; nesse caso quem chamou mantém
 * o comportamento antigo (404), que é uma degradação segura.
 */
export async function buscarDestinoPadrao(): Promise<DestinoPadrao | null> {
  const { data } = await supabaseAdmin
    .from("products")
    .select("slug, landing_url, archived_at")
    .eq("destino_padrao", true)
    .maybeSingle();

  // Arquivar tira o produto do ar: mandar gente pra lá seria trocar um 404
  // por outro. O painel já limpa a marca ao arquivar — isto aqui é a
  // segunda tranca, pro caso de alguém arquivar direto pelo banco.
  if (!data || data.archived_at) return null;

  // Landing quando o produto tem uma cadastrada, senão o checkout — mesmo
  // critério dos links que a equipe copia no painel.
  //
  // O checkout vive em outro domínio, então a URL sai absoluta: assim a raiz
  // do domínio principal chega no destino em UM salto, em vez de bater no
  // redirect genérico do proxy no caminho.
  const host = process.env.CHECKOUT_DOMAIN;
  const checkout = host ? `https://${host}/${data.slug}` : `/${data.slug}`;

  return { slug: data.slug, url: data.landing_url || checkout };
}

/**
 * Cola a query string da visita no destino.
 *
 * As UTMs vêm na URL e o checkout as grava na venda — perder isso no
 * redirect cegaria o relatório de origem do tráfego. O proxy já fazia esse
 * repasse quando a raiz era resolvida lá (`${search}`), e o comportamento
 * precisa continuar valendo agora que quem redireciona são as páginas.
 *
 * A landing cadastrada pode já ter query própria, daí a escolha entre ? e &.
 */
export function comQueryDaVisita(
  url: string,
  searchParams: Record<string, string | string[] | undefined>
): string {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(searchParams)) {
    if (Array.isArray(valor)) valor.forEach((v) => params.append(chave, v));
    else if (valor !== undefined) params.set(chave, valor);
  }

  const query = params.toString();
  if (!query) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

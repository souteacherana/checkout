/**
 * Google tag (gtag.js) — GA4 + Google Ads.
 *
 * Convive com o Meta Pixel: os dois medem o mesmo funil por conta própria,
 * cada um com seus disparos. Não há GTM (container GTM-XXXXXXX) no projeto —
 * o que o tráfego usa é o Google tag direto, que já carrega GA4 e Ads.
 *
 * O carregamento do tag base fica em src/app/google-tag.tsx, e ele NÃO roda
 * no /admin.
 */

type ComandoGtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: ComandoGtag;
  }
}

/**
 * Google tag da conta (GA4). O mesmo tag também é identificado como
 * "GT-K54PN64Q" no painel do Google — são dois formatos do mesmo ID, e o
 * gtag.js é carregado pela forma G-.
 */
export const GOOGLE_TAG_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID || "G-WVX3E9E4ME";

/**
 * Conta do Google Ads e rótulo da conversão de Compra usados por padrão.
 * Produto sem configuração própria cai aqui — mesmo arranjo do
 * NEXT_PUBLIC_FB_PIXEL_ID pro Meta.
 */
export const GOOGLE_ADS_ID =
  normalizarContaAds(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID) || "AW-17580476040";
export const GOOGLE_ADS_LABEL =
  (process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL || "OwCmCPjiseMcEIiNg79B").trim();

/**
 * O Google mostra o ID da conversão ora como "AW-17580476040", ora só como
 * "17580476040". O campo do painel aceita os dois; aqui vira sempre a forma
 * com prefixo, que é a única que o gtag entende.
 */
export function normalizarContaAds(id?: string | null): string | null {
  const limpo = (id || "").trim();
  if (!limpo) return null;
  return /^AW-/i.test(limpo) ? `AW-${limpo.slice(3)}` : `AW-${limpo}`;
}

/**
 * Monta o `send_to` de uma conversão ("AW-000000/RÓTULO"), ou null se faltar
 * conta ou rótulo — sem os dois o Google Ads descarta o evento.
 */
function sendTo(conta?: string | null, rotulo?: string | null): string | null {
  const contaNormalizada = normalizarContaAds(conta);
  const label = (rotulo || "").trim();
  return contaNormalizada && label ? `${contaNormalizada}/${label}` : null;
}

/**
 * Conversão de Compra do produto, ou a padrão da conta.
 *
 * O par (conta, rótulo) é tratado como uma coisa só: um rótulo pertence a
 * UMA conta, então casar a conta do produto com o rótulo padrão mandaria a
 * conversão pra um endereço que não existe. Preencheu os dois no painel, usa
 * os dois; preencheu meio, usa o padrão.
 */
export function conversaoDeCompra(
  contaProduto?: string | null,
  rotuloProduto?: string | null
): string | null {
  return sendTo(contaProduto, rotuloProduto) || sendTo(GOOGLE_ADS_ID, GOOGLE_ADS_LABEL);
}

/**
 * Enfileira um comando do gtag.
 *
 * Se o tag base ainda não rodou, a fila é criada aqui mesmo — o gtag.js
 * processa o que estiver acumulado assim que carrega, então dá pra disparar
 * evento sem esperar o script externo. O push leva `arguments`, e não um
 * array: é nesse formato que o gtag.js reconhece um comando.
 */
export function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      // Rest param viraria um array comum, e o gtag.js ignora entrada do
      // dataLayer que não seja um objeto Arguments. É a mesma função que o
      // snippet oficial do Google define.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
  window.gtag(...args);
}

/**
 * Compra confirmada: `purchase` pro GA4 e `conversion` pro Google Ads.
 *
 * `transaction_id` é o id do pagamento no Asaas nos dois eventos — é por ele
 * que o Google descarta repetição (F5, aba reaberta, dois disparos do mesmo
 * pagamento).
 */
export function rastrearCompra(compra: {
  paymentId: string;
  valor: number;
  productKey: string;
  productName: string;
  /** "AW-000000/RÓTULO"; sem ele, só o GA4 é notificado. */
  conversao: string | null;
}) {
  const { paymentId, valor, productKey, productName, conversao } = compra;

  gtag("event", "purchase", {
    transaction_id: paymentId,
    value: valor,
    currency: "BRL",
    items: [{ item_id: productKey, item_name: productName, price: valor, quantity: 1 }],
  });

  if (conversao) {
    gtag("event", "conversion", {
      send_to: conversao,
      value: valor,
      currency: "BRL",
      transaction_id: paymentId,
    });
  }
}

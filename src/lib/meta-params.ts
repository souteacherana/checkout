import type { NextRequest, NextResponse } from "next/server";
import { ParamBuilder, type CookieSettings } from "capi-param-builder-nodejs";

/**
 * fbc, fbp e IP pra Conversions API, montados pelo Parameter Builder oficial
 * da Meta (github.com/facebook/capi-param-builder).
 *
 * Por que não ler só os cookies do pixel:
 * - Com bloqueador de anúncio o pixel não roda e o `_fbc` nunca é criado. A VSL
 *   não tem formulário, então sem fbc o Lead chega à Meta sem o clique do
 *   anúncio.
 * - No Safari, cookie gravado por JavaScript dura 7 dias. Gravado pelo servidor
 *   (Set-Cookie), dura os 90 dias da biblioteca.
 * - A biblioteca monta o fbc com o fbclid exato do link e marca o valor com um
 *   sufixo que diz à Meta que ele veio do Parameter Builder (conta pra
 *   qualidade de correspondência).
 *
 * Os cookies ficam no domínio principal, que vale também pro checkout.
 */
const DOMINIOS = ["riseeducacao.com.br"];

export type ParamsMeta = {
  fbc: string | null;
  fbp: string | null;
  ip: string | null;
  cookies: CookieSettings[];
};

/**
 * @param urlDaPagina URL da página onde o evento aconteceu. Numa rota de API o
 * fbclid está nela, e não na URL da própria requisição.
 */
export function lerParamsMeta(request: NextRequest, urlDaPagina?: string | null): ParamsMeta {
  try {
    let busca = request.nextUrl.searchParams;
    if (urlDaPagina) {
      try {
        busca = new URL(urlDaPagina).searchParams;
      } catch {
        // URL inválida vinda do navegador: fica com a da requisição.
      }
    }

    const builder = new ParamBuilder(DOMINIOS);
    const cookies = builder.processRequest(
      request.headers.get("host") ?? "",
      Object.fromEntries(busca),
      Object.fromEntries(request.cookies.getAll().map((c) => [c.name, c.value])),
      null,
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    );
    return { fbc: builder.getFbc(), fbp: builder.getFbp(), ip: builder.getClientIpAddress(), cookies };
  } catch (error) {
    // Medição nunca derruba a página nem o evento: cai pros cookies do pixel.
    console.error("[meta-params] Falha no Parameter Builder:", error);
    return {
      fbc: request.cookies.get("_fbc")?.value ?? null,
      fbp: request.cookies.get("_fbp")?.value ?? null,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
      cookies: [],
    };
  }
}

/**
 * Grava na resposta os cookies que a biblioteca pediu. Sem httpOnly: o pixel no
 * navegador precisa ler o mesmo `_fbp`/`_fbc`, senão cria outros e os dois lados
 * passam a mandar identificadores diferentes.
 */
export function gravarCookiesMeta(response: NextResponse, cookies: CookieSettings[]) {
  for (const c of cookies) {
    response.cookies.set({
      name: c.name,
      value: c.value,
      maxAge: c.maxAge,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      // Em localhost não há domínio com ponto: o cookie fica no host atual.
      ...(c.domain && c.domain.includes(".") ? { domain: c.domain } : {}),
    });
  }
  return response;
}

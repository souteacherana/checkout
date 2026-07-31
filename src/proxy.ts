import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Separação de domínios (mesmo app Vercel servindo os dois):
// - CHECKOUT_DOMAIN (checkout.riseeducacao.com.br) → só páginas de checkout;
//   /admin redireciona pro domínio principal
// - ADMIN_DOMAIN (riseeducacao.com.br) → homepage da empresa + painel /admin;
//   qualquer outra rota redireciona pro subdomínio de checkout
//
// A separação SÓ ativa quando as duas env vars estão definidas na Vercel —
// assim o deploy é seguro antes do domínio principal ser configurado.
// Em localhost/preview nada é bloqueado.
const CHECKOUT_HOST = (process.env.CHECKOUT_DOMAIN || '').toLowerCase();
const ADMIN_HOST = (process.env.ADMIN_DOMAIN || '').toLowerCase();

// Rotas que pertencem ao domínio principal, além de /admin e /api.
// Quando a homepage for construída, adicione as rotas dela aqui (ex: '/', '/sobre').
const MAIN_DOMAIN_PATHS: string[] = [];

// Workshops cuja landing page vive no projeto (src/app/lp/{slug}).
// riseeducacao.com.br/{slug} serve a landing sem mudar a URL; slug que não
// estiver aqui mantém o comportamento antigo (redirect pro checkout).
// Ao adicionar uma landing nova, inclua o slug nesta lista.
const LANDINGS = ['pht'];

/** '/pht' e '/pht/' → 'pht'; '/' → '' */
const slugDe = (pathname: string) => pathname.replace(/^\/+|\/+$/g, '').toLowerCase();

// Arquivo estático de public/ (imagem, fonte, svg…). Precisa sair do
// roteamento por domínio: os assets da landing vivem em /lp/{slug}/… e,
// sem esta guarda, caem no redirect genérico e entram em loop entre os
// dois hosts — derrubando todas as imagens da página.
const EH_ARQUIVO = /\.[a-zA-Z0-9]+$/;

export function proxy(request: NextRequest) {
  if (!CHECKOUT_HOST || !ADMIN_HOST) return NextResponse.next();

  const host = (request.headers.get('host') || '').toLowerCase();
  const { pathname, search } = request.nextUrl;

  if (EH_ARQUIVO.test(pathname)) return NextResponse.next();

  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isApiPath = pathname.startsWith('/api');

  if (host === CHECKOUT_HOST) {
    if (isAdminPath) {
      return NextResponse.redirect(`https://${ADMIN_HOST}${pathname}${search}`);
    }
    // A landing pertence ao domínio principal: manda /lp/{slug} pra lá em vez
    // de servir a mesma página em dois endereços (conteúdo duplicado no SEO).
    if (pathname.startsWith('/lp/')) {
      const slug = slugDe(pathname.slice('/lp'.length));
      return NextResponse.redirect(`https://${ADMIN_HOST}/${slug}${search}`);
    }
  }

  if (host === ADMIN_HOST || host === `www.${ADMIN_HOST}`) {
    // Landing do workshop: o visitante continua vendo riseeducacao.com.br/pht
    // (rewrite, não redirect) e o conteúdo vem de /lp/pht.
    const slug = slugDe(pathname);
    if (LANDINGS.includes(slug)) {
      return NextResponse.rewrite(new URL(`/lp/${slug}${search}`, request.url));
    }

    // APIs continuam servidas nos dois hosts (o painel usa fetch relativo)
    if (!isAdminPath && !isApiPath && !MAIN_DOMAIN_PATHS.includes(pathname)) {
      return NextResponse.redirect(`https://${CHECKOUT_HOST}${pathname}${search}`);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png).*)'],
};

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

export function proxy(request: NextRequest) {
  if (!CHECKOUT_HOST || !ADMIN_HOST) return NextResponse.next();

  const host = (request.headers.get('host') || '').toLowerCase();
  const { pathname, search } = request.nextUrl;

  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isApiPath = pathname.startsWith('/api');

  if (host === CHECKOUT_HOST && isAdminPath) {
    return NextResponse.redirect(`https://${ADMIN_HOST}${pathname}${search}`);
  }

  if (host === ADMIN_HOST || host === `www.${ADMIN_HOST}`) {
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

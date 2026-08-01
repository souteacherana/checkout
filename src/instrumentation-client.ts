import * as Sentry from '@sentry/nextjs';

// Só ativa quando NEXT_PUBLIC_SENTRY_DSN estiver configurado na Vercel
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.05,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',

    // Ruído de ambiente, não bug nosso — sem isto o Sentry enche de alerta
    // sempre que roda campanha de Instagram (o tráfego abre no navegador
    // interno do app, onde scripts de terceiros esbarram nessas APIs).
    ignoreErrors: [
      // Ponte JS↔nativo do WebKit (iOS): o fbevents.js do pixel tenta usá-la
      // dentro de webview e falha quando o app não a expõe.
      /window\.webkit\.messageHandlers/i,
      /webkit\.messageHandlers/i,
      // Extensões e apps que injetam script na página
      /^ResizeObserver loop/i,
      'Non-Error promise rejection captured',
    ],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

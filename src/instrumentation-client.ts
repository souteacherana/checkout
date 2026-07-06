import * as Sentry from '@sentry/nextjs';

// Só ativa quando NEXT_PUBLIC_SENTRY_DSN estiver configurado na Vercel
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.05,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

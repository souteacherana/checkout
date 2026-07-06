import * as Sentry from '@sentry/nextjs';

export async function register() {
  // Só ativa quando SENTRY_DSN estiver configurado na Vercel
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV || 'development',
  });
}

// Captura erros não tratados de rotas/render no servidor
export const onRequestError = Sentry.captureRequestError;

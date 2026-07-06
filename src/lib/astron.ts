import axios from 'axios';
import * as Sentry from '@sentry/nextjs';

export const astronService = {
  /**
   * Repassa o evento do Asaas diretamente para o webhook do Astron Members.
   * Como a URL já é do formato "asaas-webhook", o Astron espera o mesmo payload
   * que o Asaas enviou originalmente.
   * A URL é secreta (quem a possui consegue matricular alunos), por isso vive em env var.
   */
  async forwardAsaasWebhook(asaasPayload: unknown) {
    const webhookUrl = process.env.ASTRON_WEBHOOK_URL;
    if (!webhookUrl) {
      Sentry.captureMessage("ASTRON_WEBHOOK_URL não configurada — aluno NÃO matriculado no Astron!", 'error');
      console.error("ASTRON_WEBHOOK_URL não configurada. Aluno NÃO foi matriculado no Astron Members!");
      return null;
    }

    try {
      console.log(`Encaminhando evento do Asaas para o Astron Members...`);

      const response = await axios.post(webhookUrl, asaasPayload, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log("Webhook encaminhado para o Astron com sucesso:", response.data);
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: unknown }; message?: string };
      Sentry.captureException(err, { tags: { area: 'astron' } });
      console.error("Erro ao encaminhar webhook para o Astron Members:", error.response?.data || error.message);
      return null;
    }
  }
};

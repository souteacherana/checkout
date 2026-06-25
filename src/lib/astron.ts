import axios from 'axios';

const ASTRON_WEBHOOK_URL = 'https://webhook.astronmembers.com.br/asaas-webhook/JqBa4zyL1xdFA0I';

export const astronService = {
  /**
   * Repassa o evento do Asaas diretamente para o webhook do Astron Members.
   * Como a URL já é do formato "asaas-webhook", o Astron espera o mesmo payload
   * que o Asaas enviou originalmente.
   */
  async forwardAsaasWebhook(asaasPayload: any) {
    try {
      console.log(`Encaminhando evento do Asaas para o Astron Members...`);

      const response = await axios.post(ASTRON_WEBHOOK_URL, asaasPayload, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log("Webhook encaminhado para o Astron com sucesso:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Erro ao encaminhar webhook para o Astron Members:", error.response?.data || error.message);
      return null;
    }
  }
};

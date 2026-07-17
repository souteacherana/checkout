/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

const asaasApi = axios.create({
  baseURL: process.env.ASAAS_API_URL || 'https://api.asaas.com/v3',
  headers: {
    'Content-Type': 'application/json',
  },
});

asaasApi.interceptors.request.use((config) => {
  const token = process.env.ASAAS_API_KEY?.replace(/['"]/g, ''); // Remove aspas extras se houver
  if (token) {
    config.headers['access_token'] = token;
  } else {
    console.warn("Aviso: ASAAS_API_KEY não encontrada nas variáveis de ambiente!");
  }
  return config;
});

export const asaasService = {
  // Criar cliente (campos além de name/cpfCnpj/email são opcionais no Asaas)
  async createCustomer(data: {
    name: string;
    cpfCnpj: string;
    email: string;
    mobilePhone?: string;
    address?: string;
    addressNumber?: string;
    province?: string;      // bairro, na nomenclatura do Asaas
    postalCode?: string;
    externalReference?: string;
  }) {
    try {
      const response = await asaasApi.post('/customers', data);
      return response.data;
    } catch (err: unknown) {
      const error = err as any;
      console.error('Erro ao criar cliente no Asaas:', error.response?.data || error.message);
      throw error;
    }
  },

  // Criar cobrança via PIX
  async createPixPayment(data: { customer: string; value: number; description: string; externalReference?: string }) {
    try {
      const response = await asaasApi.post('/payments', {
        customer: data.customer,
        billingType: 'PIX',
        value: data.value,
        dueDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Vence amanhã
        description: data.description,
        externalReference: data.externalReference,
      });
      return response.data;
    } catch (err: unknown) {
      const error = err as any;
      console.error('Erro ao criar PIX no Asaas:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obter QR Code do PIX
  async getPixQrCode(paymentId: string) {
    try {
      const response = await asaasApi.get(`/payments/${paymentId}/pixQrCode`);
      return response.data; // { encodedImage, payload, expirationDate }
    } catch (err: unknown) {
      const error = err as any;
      console.error('Erro ao obter QR Code do PIX:', error.response?.data || error.message);
      throw error;
    }
  },

  // Criar cobrança via Boleto (à vista ou parcelado).
  // Multa fixa por atraso configurada por cobrança — o Asaas soma sozinho
  // ao valor da parcela quando o pagamento acontece após o vencimento.
  async createBoletoPayment(data: {
    customer: string;
    installmentCount: number;      // 1 = à vista
    installmentValue: number;      // valor de CADA parcela
    description: string;
    dueDate: string;               // vencimento da 1ª parcela (yyyy-mm-dd)
    fineValue: number;             // multa fixa em R$ (ex: 40)
    externalReference?: string;
  }) {
    try {
      const payload: any = {
        customer: data.customer,
        billingType: 'BOLETO',
        dueDate: data.dueDate,
        description: data.description,
        externalReference: data.externalReference,
        fine: { value: data.fineValue, type: 'FIXED' },
      };
      if (data.installmentCount > 1) {
        payload.installmentCount = data.installmentCount;
        payload.installmentValue = data.installmentValue;
      } else {
        payload.value = data.installmentValue;
      }

      const response = await asaasApi.post('/payments', payload);
      return response.data;
    } catch (err: unknown) {
      const error = err as any;
      console.error('Erro ao criar Boleto no Asaas:', error.response?.data || error.message);
      throw error;
    }
  },

  // Listar cobranças por externalReference (todas as parcelas de uma venda)
  async listPaymentsByExternalReference(externalReference: string) {
    try {
      const response = await asaasApi.get('/payments', {
        params: { externalReference, limit: 100 },
      });
      return (response.data?.data || []) as { id: string; status: string; value: number; deleted?: boolean }[];
    } catch (err: unknown) {
      const error = err as any;
      console.error('Erro ao listar cobranças no Asaas:', error.response?.data || error.message);
      throw error;
    }
  },

  // Buscar uma cobrança existente (pra reexibir QR/boleto sem duplicar)
  async getPayment(paymentId: string) {
    try {
      const response = await asaasApi.get(`/payments/${paymentId}`);
      return response.data; // { id, status, invoiceUrl, bankSlipUrl, ... }
    } catch (err: unknown) {
      const error = err as any;
      console.error('Erro ao buscar cobrança no Asaas:', error.response?.data || error.message);
      throw error;
    }
  },

  // Criar cobrança via Cartão de Crédito
  async createCreditCardPayment(data: {
    customer: string;
    value: number;
    description: string;
    creditCard: { holderName: string; number: string; expiryMonth: string; expiryYear: string; ccv: string };
    creditCardHolderInfo: { name: string; email: string; cpfCnpj: string; postalCode: string; addressNumber: string; phone: string };
    installmentCount?: number;
    externalReference?: string;
  }) {
    try {
      const payload: any = {
        customer: data.customer,
        billingType: 'CREDIT_CARD',
        value: data.value,
        dueDate: new Date().toISOString().split('T')[0],
        description: data.description,
        creditCard: data.creditCard,
        creditCardHolderInfo: data.creditCardHolderInfo,
        externalReference: data.externalReference,
      };

      if (data.installmentCount && data.installmentCount > 1) {
        payload.installmentCount = data.installmentCount;
        payload.installmentValue = Number((data.value / data.installmentCount).toFixed(2));
      }

      const response = await asaasApi.post('/payments', payload);
      return response.data;
    } catch (err: unknown) {
      const error = err as any;
      console.error('Erro ao processar Cartão no Asaas:', error.response?.data || error.message);
      throw error;
    }
  },
};

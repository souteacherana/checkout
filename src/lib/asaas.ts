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
  // Criar cliente
  async createCustomer(data: { name: string; cpfCnpj: string; email: string }) {
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

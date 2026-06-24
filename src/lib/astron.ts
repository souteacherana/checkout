/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

const ASTRON_API_KEY = process.env.ASTRON_API_KEY;
const ASTRON_API_SECRET = process.env.ASTRON_API_SECRET;

// Instância base para a Astron Members
const astronApi = axios.create({
  baseURL: "https://astronmembers.com.br/api/v1", // URL Base genérica
  headers: {
    "Content-Type": "application/json",
    // Autenticação Basic nativa para APIs REST seguras (Key:Secret convertidos em Base64, ou headers customizados)
    "Authorization": `Basic ${Buffer.from(`${ASTRON_API_KEY}:${ASTRON_API_SECRET}`).toString('base64')}`
  },
});

export const astronService = {
  /**
   * Registra e matricula um usuário em um curso (produto)
   */
  async enrollStudent(data: { name: string; email: string; courseId: string; phone?: string }) {
    try {
      console.log(`[Astron] Tentando matricular o aluno ${data.email} no curso ${data.courseId}...`);
      
      // Essa é a rota comum REST, as vezes varia na Astron pra /students ou dependente da docs exata da Astron
      const response = await astronApi.post('/users', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        offers: [Number(data.courseId)], // Matricula na oferta / curso
        notify: true // Enviar email com dados de acesso
      });
      
      console.log(`[Astron] Sucesso ao matricular! ID do aluno: ${response.data?.id}`);
      return response.data;
    } catch (err: unknown) {
      const error = err as any;
      console.error("[Astron] Erro ao integrar com Astron Members:", error.response?.data || error.message);
      // Não damos 'throw error' para evitar que o checkout "trave" se a Astron estiver fora do ar
      // O ideal é salvar num log ou tentar de novo.
      return null;
    }
  }
};

/**
 * Perguntas da aplicação da Black, na ordem e com as opções do Google Forms
 * "Aplicação - Mentoria Partiu 10k". Nome, e-mail, WhatsApp e Instagram ficam
 * no formulário em si; aqui estão as que vão pra coluna `respostas`.
 *
 * A chave de cada pergunta é o que fica gravado no banco: trocar o texto é
 * seguro, trocar a chave separa as respostas antigas das novas.
 */

export type Pergunta =
  | { chave: string; titulo: string; tipo: "texto" }
  | { chave: string; titulo: string; tipo: "opcoes"; opcoes: string[] };

export const PERGUNTAS: Pergunta[] = [
  {
    chave: "faturamento",
    titulo: "Qual é a média do seu faturamento?",
    tipo: "opcoes",
    opcoes: [
      "Até R$ 5.000",
      "Entre R$ 5k e R$ 10k",
      "Entre R$ 10k e R$ 20k",
      "Entre R$ 20k e R$ 30k",
      "Acima de R$ 30k",
    ],
  },
  {
    chave: "por_que_escolhido",
    titulo: "Por que você deveria ser escolhido para entrar para entrar na mentoria?",
    tipo: "texto",
  },
  {
    chave: "o_que_tranquiliza",
    titulo: "Quando você compra um curso novo, qual desses pontos mais te tranquiliza?",
    tipo: "opcoes",
    opcoes: [
      "Ver resultados rápidos e claros",
      "Sentir que tem alguém disponível pra me ajudar",
      "Ter acesso aos detalhes, dados e lógica por trás",
      "Saber que vai ter suporte constante e um passo-a-passo seguro",
    ],
  },
  {
    chave: "valeu_a_pena",
    titulo: "O que precisa acontecer para você dizer que valeu a pena o investimento?",
    tipo: "texto",
  },
  {
    chave: "ja_e_mentorado",
    titulo: "Você já é mentorado da Ana de alguma das mentorias dela?",
    tipo: "opcoes",
    opcoes: ["Sim", "Não"],
  },
  {
    chave: "forma_de_pagamento",
    titulo: "Maravilha! Chegou a hora de selecionar a opção de pagamento que você prefere:",
    tipo: "opcoes",
    opcoes: [
      "12 x R$ 399 no cartão de crédito (requer limite no cartão disponível)",
      "Um parte no pix de entrada e outra parte no cartão",
      "Um parte no pix de entrada e outra parte no boleto",
      "À vista no pix com 5% de desconto",
      "Já sou mentorado ou ex-mentorado e estou interessado na renovação da mentoria com oferta especial",
      "Eu faturo acimade R$ 10.000 e gostaria de receber informações sobre a mentoria Professores de elite",
    ],
  },
];

/** Produto do sinal no checkout (migração 026). */
export const PRODUTO_SINAL = "black-sinal";

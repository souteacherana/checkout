/**
 * Formatação de data/hora do painel SEMPRE em horário de Brasília.
 *
 * Sem fixar o fuso, `toLocaleDateString()` usa o relógio da máquina de quem
 * abre o painel: a mesma venda aparecia 07:45 pra quem está em UTC-4 e 08:45
 * pra quem está em UTC-3. Como a operação toda é no Brasil, o painel deve
 * falar horário de Brasília pra todo mundo, sempre.
 */
const TZ = 'America/Sao_Paulo';

/** 25/07/2026 */
export const dataBR = (valor?: string | number | Date | null): string => {
  if (!valor) return '';
  const d = new Date(valor);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { timeZone: TZ });
};

/** 11:45:52 (ou 11:45 com segundos: false) */
export const horaBR = (valor?: string | number | Date | null, segundos = true): string => {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    ...(segundos ? { second: '2-digit' } : {}),
  });
};

/** 25/07/2026 11:45 */
export const dataHoraBR = (valor?: string | number | Date | null): string => {
  const d = dataBR(valor);
  return d ? `${d} ${horaBR(valor, false)}` : '';
};

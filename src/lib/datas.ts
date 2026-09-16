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

/**
 * 2026-07-25 — data ordenável, para nome de arquivo.
 * Também em Brasília: com toISOString() um período terminando 23:59 de 15/07
 * viraria 16/07 no nome do arquivo exportado.
 */
export const dataISOBR = (valor?: string | number | Date | null): string => {
  if (!valor) return '';
  const d = new Date(valor);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA', { timeZone: TZ });
};

/** Offset de Brasília em ms no instante dado (negativo: está atrás do UTC). */
const offsetBR = (ms: number): number => {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms));
  const n = (tipo: string) => Number(partes.find(p => p.type === tipo)?.value);
  const comoUTC = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour') % 24, n('minute'), n('second'));
  return comoUTC - Math.floor(ms / 1000) * 1000;
};

// 'aaaa-mm-dd' (o valor de um <input type="date">) → epoch ms daquele
// instante em Brasília.
const epochBR = (data: string, fimDoDia: boolean): number => {
  const [a, m, d] = data.split('-').map(Number);
  if (!a || !m || !d) return NaN;
  const alvo = fimDoDia
    ? Date.UTC(a, m - 1, d, 23, 59, 59, 999)
    : Date.UTC(a, m - 1, d, 0, 0, 0, 0);
  // Duas passadas: numa virada de horário de verão o offset do palpite
  // inicial pode não ser o offset do instante correto.
  return alvo - offsetBR(alvo - offsetBR(alvo));
};

/**
 * Bordas do dia em horário de Brasília.
 *
 * O painel mostra todas as datas em Brasília, então o filtro precisa recortar
 * no mesmo fuso: montando a janela no relógio da máquina, quem abrisse o
 * painel em Cuiabá (UTC-4) veria uma venda exibida como 01/03 entrar num
 * filtro que vai "até 28/02".
 */
export const inicioDoDiaBR = (data: string): number => epochBR(data, false);
export const fimDoDiaBR = (data: string): number => epochBR(data, true);

/**
 * Imagens da landing da Black.
 *
 * O que aparece na primeira dobra fica em public/lp/black/ (são candidatos a
 * LCP); o resto fica no Vercel Blob, com o next/image — mesma divisão do TNP e
 * do LED. A página do WordPress baixava 30,5MB em imagens de câmera; otimizadas,
 * as 25 somam 1,6MB.
 *
 * As dimensões são as intrínsecas de cada arquivo: o next/image precisa delas
 * pra reservar o espaço antes do download.
 */
const BLOB = "https://dtfnsnlwyzhalvu7.public.blob.vercel-storage.com/LP%20-%20BLACK";

export type Imagem = { src: string; width: number; height: number; alt: string };

/** Logotipo "BLACK da Teacher". Fundo transparente, com folga em cima. */
export const LOGO: Imagem = {
  src: "/lp/black/black-arte.webp",
  width: 1100,
  height: 761,
  alt: "Black da Teacher",
};

/** Fundos do hero, repetidos no preload do layout.tsx. */
export const HERO_DESKTOP = "/lp/black/hero-desktop.webp";
export const HERO_MOBILE = "/lp/black/hero-mobile.webp";

export const CARD_WORKSHOPS: Imagem = {
  src: `${BLOB}/card-workshops.webp`,
  width: 800,
  height: 800,
  alt: "Workshops da Teacher Ana",
};

export const CARD_BONUS: Imagem = {
  src: `${BLOB}/card-bonus.webp`,
  width: 800,
  height: 800,
  alt: "Bônus exclusivos",
};

export const FUNDO_IMERSAO = `${BLOB}/fundo-imersao.webp`;
export const FUNDO_SOBRE_DESKTOP = `${BLOB}/fundo-sobre-desktop.webp`;
export const FUNDO_SOBRE_MOBILE = `${BLOB}/fundo-sobre-mobile.webp`;

const foto = (nome: string, height = 600): Imagem => ({
  src: `${BLOB}/${nome}.webp`,
  width: 900,
  height,
  alt: "Foto da Imersão Rise",
});

/** Só aparece no celular: no desktop, as fotos já estão na arte de fundo. */
export const FOTOS_IMERSAO: Imagem[] = [
  foto("rise-imersao-rise-dia-2-108", 506),
  foto("rise-imersao-rise-dia-2-115"),
  foto("rise-imersao-rise-dia-2-444"),
  foto("rise-img-3810"),
  foto("rise-img-3822"),
  foto("rise-img-7012"),
  foto("rise-img-7056"),
  foto("rise-img-8090"),
];

const depoimento = (n: number, height = 1125): Imagem => ({
  src: `${BLOB}/depo-${n}.webp`,
  width: 900,
  height,
  alt: `Resultado de quem já participou ${n}`,
});

/** Na mesma ordem da galeria do WordPress. */
export const DEPOIMENTOS: Imagem[] = [
  depoimento(3),
  depoimento(1),
  depoimento(5),
  depoimento(8, 1742),
  depoimento(2),
  depoimento(4),
  depoimento(7),
  depoimento(6),
];

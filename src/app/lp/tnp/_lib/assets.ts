/**
 * URLs das imagens hospedadas no Vercel Blob.
 *
 * O hero e os SVGs ficam em public/assets — o hero por ser o elemento de LCP
 * (a doc da Vercel recomenda o Blob para conteúdo abaixo da dobra) e os SVGs
 * por serem pequenos demais para valer uma requisição a outra origem.
 *
 * As dimensões são as intrínsecas de cada arquivo. O next/image precisa delas
 * para reservar espaço antes do download e evitar layout shift.
 */
const BLOB = "https://dtfnsnlwyzhalvu7.public.blob.vercel-storage.com/LP%20-%20TNP%202026";

/** Logo do Zoom no ticket. SVG não passa pelo next/image sem dangerouslyAllowSVG. */
export const ZOOM_SVG = `${BLOB}/zoom.svg`;

export type Imagem = { src: string; width: number; height: number; alt: string };

/** Prints de depoimentos da galeria masonry. */
export const DEPOIMENTOS: Imagem[] = [
  { src: `${BLOB}/Thais-Regina.webp`, width: 589, height: 1103, alt: "Depoimento de Thais Regina" },
  { src: `${BLOB}/Ruan-Lisboa.webp`, width: 738, height: 1334, alt: "Depoimento de Ruan Lisboa" },
  { src: `${BLOB}/Paty-Hayne.webp`, width: 436, height: 818, alt: "Depoimento de Paty Hayne" },
  { src: `${BLOB}/Mariana-Zanelli.webp`, width: 660, height: 980, alt: "Depoimento de Mariana Zanelli" },
  { src: `${BLOB}/LetIcia-Vaz.webp`, width: 660, height: 791, alt: "Depoimento de Letícia Vaz" },
  { src: `${BLOB}/Karine-Xavier.webp`, width: 660, height: 1071, alt: "Depoimento de Karine Xavier" },
  { src: `${BLOB}/Elaine-Rouine.webp`, width: 436, height: 819, alt: "Depoimento de Elaine Rouine" },
  { src: `${BLOB}/Dhaniele-Kaiel.webp`, width: 660, height: 718, alt: "Depoimento de Dhaniele Kaiel" },
  { src: `${BLOB}/Ana-Tereza.webp`, width: 660, height: 742, alt: "Depoimento de Ana Tereza" },
];

/** Foto da seção "Quem vai te ensinar". */
export const ANA_INSTRUTORA: Imagem = {
  src: `${BLOB}/ana2.webp`,
  width: 540,
  height: 675,
  alt: "Foto oficial de Ana Paula de Araújo",
};

/** Foto no canhoto do ingresso. */
export const ANA_TICKET: Imagem = {
  src: `${BLOB}/anaticket.webp`,
  width: 619,
  height: 530,
  alt: "Ana Paula de Araújo",
};

/**
 * Configuração da VSL da Black (riseeducacao.com.br/blackdateacher).
 */

/** ID do vídeo no Panda. O iframe precisa do prefixo "panda-" no id. */
export const VIDEO_ID = "f29aa912-1116-4d0a-a81a-8c28607fbdca";
export const IFRAME_ID = `panda-${VIDEO_ID}`;
export const PLAYER_SRC = `https://player-vz-d89c3f63-7b0.tv.pandavideo.com.br/embed/?v=${VIDEO_ID}`;
export const PLAYER_ORIGIN = "https://player-vz-d89c3f63-7b0.tv.pandavideo.com.br";

/**
 * Segundo do vídeo em que a oferta é anunciada: o botão do WhatsApp só
 * aparece a partir daqui.
 *
 * PROVISÓRIO. O vídeo final ainda não tinha o pitch marcado quando a página
 * foi montada. Trocar pelo segundo exato antes de subir os anúncios: com um
 * valor baixo demais o botão aparece antes da oferta; alto demais, quem chega
 * ao pitch não encontra o botão.
 */
export const SEGUNDO_DO_PITCH = 60;

/**
 * Imagens da landing do LED.
 *
 * O hero fica em public/lp/led/ e as fotos de depoimento no Vercel Blob —
 * mesma divisão do TNP. O hero é o elemento de LCP: servi-lo da própria
 * origem evita DNS + TLS com outro host justo no caminho crítico. O que está
 * abaixo da dobra pode pagar esse custo e sai do repositório.
 *
 * Os originais vinham de teacherana.com.br (WordPress) em tamanhos de câmera.
 * O hero caiu de 5504x8256 (528KB) para 1200x1800 (43KB) e o mobile de
 * 1920x1080 (170KB) para 1280x720 (17KB) — o elemento nunca passa de ~600px de
 * largura em tela, então os 45 megapixels do original eram download puro. As
 * fotos de depoimento foram pra 960px de largura e webp (a da Ana Paula era um
 * PNG de foto); a maior caiu de 581KB para 122KB.
 *
 * As dimensões abaixo são as intrínsecas de cada arquivo. O next/image precisa
 * delas para reservar espaço antes do download e evitar layout shift — se
 * algum arquivo do Blob for trocado por outro de proporção diferente, a
 * dimensão aqui precisa acompanhar.
 */

const BLOB = "https://dtfnsnlwyzhalvu7.public.blob.vercel-storage.com/LP%20-%20LED";

export type Imagem = { src: string; width: number; height: number; alt: string };

/** Hero desktop. Local, e não no Blob, por ser o LCP. */
export const HERO: Imagem = {
  src: "/lp/led/hero.webp",
  width: 1200,
  height: 1800,
  alt: "Teacher Ana de Araújo",
};

/**
 * Recorte paisagem do hero, servido abaixo de 640px — é onde .hero-art troca
 * de 4/5 para 16/11 e o enquadramento retrato ficaria cortado no rosto.
 */
export const HERO_MOBILE: Imagem = {
  src: "/lp/led/hero-mobile.webp",
  width: 1280,
  height: 720,
  alt: "Teacher Ana de Araújo",
};

/** Logo no canto da nav. SVG não passa pelo next/image sem dangerouslyAllowSVG. */
export const LOGO = "/lp/led/logo.svg";

export type Depoimento = {
  foto: Imagem;
  /** Frase de efeito, destacada no topo do card. */
  destaque: string;
  antes: string;
  depois: string;
  nome: string;
  papel: string;
};

/**
 * Depoimentos exibidos no carrossel.
 *
 * O LED7.html trazia CINCO, com os dois últimos (Vinícius Tanaka e Sara
 * Louise) comentados junto com os respectivos dots — alguém os tirou do ar
 * sem apagar. Eles estão preservados em DEPOIMENTOS_FORA_DO_AR, abaixo:
 * a copy é da expert e some do Git se eu simplesmente deletar, mas HTML
 * comentado também não sobrevive à conversão pra JSX.
 *
 * Para voltar com um deles, mova o objeto para esta lista. O carrossel conta
 * os cards e os dots a partir do array, então nada mais precisa mudar.
 */
export const DEPOIMENTOS: Depoimento[] = [
  {
    foto: { src: `${BLOB}/didio.webp`, width: 960, height: 1403, alt: "Ana Paula Di Dio" },
    destaque: "de 47h por semana a 15h faturando o dobro",
    antes:
      "47h de aulas por semana, sozinha, sem professor parceiro. Faturamento travado em 11k, 37 alunos quase todos por indicação. Por fora parecia tudo bem — por dentro eu já não via saída.",
    depois:
      "Em 1 ano: de 47h pra 15h por semana, de 11k pra 26k de faturamento, de 37 pra 82 alunos. Não trabalhei mais, trabalhei diferente. O problema nunca foi captação, era modelo de negócio.",
    nome: "Ana Paula Di Dio",
    papel: "Teacher",
  },
  {
    foto: { src: `${BLOB}/paula.webp`, width: 960, height: 1443, alt: "Paula Ribeiro" },
    destaque: "experiência eu já tinha — faltava virar empresa",
    antes:
      "12 anos de sala de aula e coordenação, faturamento já acima de 10k, mas ainda me via como professora com um plano B engatilhado. Abrir minha própria escola parecia grande demais pra arriscar sem rede de proteção.",
    depois:
      "Entendi com a Ana que experiência de sala não vira escola digital sozinha, e foi aí que parei de me ver como professora freelancer e comecei a operar como escola. Entrei no Partiu 10k, em dois meses subi pro ELITE. Hoje opero como empresa, não como professora avulsa.",
    nome: "Paula Ribeiro",
    papel: "Teacher",
  },
  {
    foto: { src: `${BLOB}/leticia.webp`, width: 960, height: 1440, alt: "Letícia Vaz" },
    destaque: "um semestre fechado em 3 semanas",
    antes:
      "Postava todo dia, fazia reels, dancinha, tudo. Mesmo assim ficava semanas sem fechar uma turma nova. Achava que faltava postar mais.",
    depois:
      "Em 3 semanas eu fechei mais turmas do que no semestre inteiro anterior. A diferença não foi postar mais — foi postar certo, e usar o DM como a Ana ensinou.",
    nome: "Letícia Vaz",
    papel: "Teacher",
  },
];

/** Estavam comentados no HTML original. Ver a nota em DEPOIMENTOS. */
export const DEPOIMENTOS_FORA_DO_AR: Depoimento[] = [
  {
    foto: { src: `${BLOB}/tanaka.webp`, width: 960, height: 1440, alt: "Vinícius Tanaka" },
    destaque: "a bio pagou a imersão 3x",
    antes:
      "Minha bio era genérica, igual à de mil outras teachers. Quem caía no perfil não entendia em 2 segundos por que deveria me seguir.",
    depois: "A parte de bio sozinha já pagou a imersão três vezes — e isso foi só a primeira aula.",
    nome: "Vinícius Tanaka",
    papel: "Teacher",
  },
  {
    foto: { src: `${BLOB}/saralouise.webp`, width: 960, height: 1440, alt: "Sara Louise" },
    destaque: "de 1h/dia para 1h/semana",
    antes:
      "Gastava 1h por dia no Instagram tentando 'engajar' — respondia tudo, comentava em todo mundo, e mesmo assim a agenda não enchia.",
    depois: "Passei a gastar 1h/semana no Instagram, não 1h/dia. E minha lista de espera só cresce.",
    nome: "Sara Louise",
    papel: "Teacher",
  },
];

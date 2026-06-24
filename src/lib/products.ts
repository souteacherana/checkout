export type WorkshopConfig = {
  title: string;
  price: number;
  accentColor: string;
  accentColorHover: string;
  imageSrc: string | null;
};

export const THEMES: Record<string, WorkshopConfig> = {
  VST: {
    title: "Vivendo Só de Turmas",
    price: 49.90,
    accentColor: "#3A6DA6",
    accentColorHover: "#1b3856",
    imageSrc: "https://teacherana.com.br/wp-content/uploads/Rise/CHECKOUT/VST.jpg",
  },
  MDA: {
    title: "Máquina de Alunos",
    price: 49.90,
    accentColor: "#ffb33f",
    accentColorHover: "#b77d24",
    imageSrc: "https://teacherana.com.br/wp-content/uploads/Rise/CHECKOUT/MDA.jpg",
  },
  LOW: {
    title: "Preço Certo = Aula Lucrativa",
    price: 97.00,
    accentColor: "#11242b",
    accentColorHover: "#1c414eff",
    imageSrc: "https://teacherana.com.br/wp-content/uploads/Rise/CHECKOUT/LOW.jpg",
  },
  DEFAULT: {
    title: "Workshop",
    price: 49.90,
    accentColor: "#528cc8",
    accentColorHover: "#376392ff",
    imageSrc: "https://teacherana.com.br/wp-content/uploads/Rise/CHECKOUT/DEF.jpg",
  },
};

export function getProductPrice(themeKey: string): number {
  return THEMES[themeKey]?.price || THEMES["DEFAULT"].price;
}

export function calculateTotalValue(basePrice: number, installments: number): number {
  if (installments > 1) {
    const i = 0.0249; // Taxa Asaas / de mercado
    const n = installments;
    const pmt = basePrice * ((i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1));
    return Number((pmt * n).toFixed(2));
  }
  return basePrice;
}

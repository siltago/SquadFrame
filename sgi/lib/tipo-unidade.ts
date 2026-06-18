export type TipoUnidade = "BARRA" | "CHAPA" | "ML" | "M2" | "UN" | "KG" | "CX";

export const TIPO_UNIDADE_OPCOES: { value: string; label: string; desc: string }[] = [
  { value: "BARRA", label: "Barra / Perfil", desc: "Ordenado em barras, calcula metros lineares" },
  { value: "CHAPA", label: "Chapa / Vidro",  desc: "Ordenado em m², espessura cadastrada por produto" },
  { value: "ML",    label: "Metro linear",   desc: "Ordenado diretamente em metros" },
  { value: "M2",    label: "Metro quadrado", desc: "Ordenado em m²" },
  { value: "UN",    label: "Unidade",        desc: "Unidade simples sem cálculos" },
  { value: "KG",    label: "Quilograma",     desc: "Ordenado em kg" },
  { value: "CX",    label: "Caixa",          desc: "Ordenado em caixas" },
];

// Unidade padrão do produto baseada no tipo da aba
export function defaultUnidade(tipoUnidade?: string | null): string {
  switch (tipoUnidade?.toUpperCase()) {
    case "BARRA": return "BARRA";
    case "CHAPA": return "CHAPA"; // chapas são pedidas por chapa (m² calculado por peso/preço/m²)
    case "ML":    return "ML";
    case "M2":    return "M2";
    case "KG":    return "KG";
    case "CX":    return "CX";
    default:      return "UN";
  }
}

export interface SpecLabels {
  tamanho: string | null;  // null = campo não se aplica
  peso: string;
  preco: string;
  metragem: string | null; // rótulo para coluna de cálculo no pedido
}

export function specLabels(tipoUnidade?: string | null): SpecLabels {
  switch (tipoUnidade?.toUpperCase()) {
    case "BARRA":
      return { tamanho: "Comprimento da barra (mm)", peso: "Peso (kg/m)", preco: "Preço (R$/m)", metragem: "Metros" };
    case "CHAPA":
      return { tamanho: "Espessura (mm)", peso: "Peso (kg/m²)", preco: "Preço (R$/m²)", metragem: "Área (m²)" };
    case "M2":
      return { tamanho: null, peso: "Peso (kg/m²)", preco: "Preço (R$/m²)", metragem: "Área (m²)" };
    case "ML":
      return { tamanho: null, peso: "Peso (kg/m)", preco: "Preço (R$/m)", metragem: "Metros" };
    default:
      return { tamanho: null, peso: "Peso (kg/un)", preco: "Preço (R$/un)", metragem: null };
  }
}

// Retorna metros lineares ou área (m²) calculados para um item de pedido
export function calcMedida(quantidade: number, unidade: string, tamanhoMm?: number | null): { valor: number; sufixo: string } | null {
  const un = unidade?.toUpperCase();
  if (un === "BARRA" && tamanhoMm) return { valor: quantidade * tamanhoMm / 1000, sufixo: "m" };
  if (un === "M" || un === "ML")   return { valor: quantidade, sufixo: "m" };
  // CHAPA, M2, M² → quantidade já é em m²
  if (un === "CHAPA" || un === "M2" || un === "M²") return { valor: quantidade, sufixo: "m²" };
  return null;
}

export function calcPesoTotal(quantidade: number, unidade: string, tamanhoMm?: number | null, pesoMetro?: number | null): number | null {
  if (!pesoMetro) return null;
  const med = calcMedida(quantidade, unidade, tamanhoMm);
  return med ? med.valor * pesoMetro : null;
}

export function calcPrecoUnit(unidade: string, tamanhoMm?: number | null, precoMetro?: number | null): number {
  if (!precoMetro) return 0;
  const un = unidade?.toUpperCase();
  if (un === "BARRA" && tamanhoMm) return precoMetro * tamanhoMm / 1000;
  if (un === "M" || un === "ML")   return precoMetro;
  // CHAPA e M2: preço por m², quantidade já é m², então preço unitário = preço/m²
  if (un === "CHAPA" || un === "M2" || un === "M²") return precoMetro;
  return 0;
}

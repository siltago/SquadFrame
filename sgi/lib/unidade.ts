const PLURAL: Record<string, string> = {
  "peça": "peças", "peca": "pecas",
  "barra": "barras", "folha": "folhas", "caixa": "caixas",
  "rolo": "rolos", "saco": "sacos", "litro": "litros",
  "metro": "metros", "unidade": "unidades",
  "par": "pares", "kit": "kits", "conjunto": "conjuntos",
  "painel": "painéis", "perfil": "perfis",
  "vidro": "vidros", "chapa": "chapas", "frasco": "frascos",
  "tubo": "tubos", "balde": "baldes", "galão": "galões",
  "pacote": "pacotes", "lata": "latas", "tambor": "tambores",
};

export function pluralUnit(qty: number, unit: string): string {
  if (qty <= 1) return unit;
  const lower = unit.toLowerCase().trim();
  if (PLURAL[lower]) return PLURAL[lower];
  // Abreviações e unidades métricas não mudam
  if (unit.length <= 3) return unit;
  if (/^m[²³²³]?$/.test(lower)) return unit;
  // Regras gerais
  if (lower.endsWith("ão")) return unit.slice(0, -2) + "ões";
  if (/[aeiou]l$/.test(lower)) return unit.slice(0, -1) + "is";
  if (lower.endsWith("r") || lower.endsWith("z")) return unit + "es";
  if (lower.endsWith("s")) return unit;
  return unit + "s";
}

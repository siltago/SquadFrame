// Item de CHAPA/M²/M2 é comprado por área (largura × altura × qtd de
// peças), não por quantidade direta — reaproveitado por novo pedido,
// retorno e edição de pedido (todos operam sobre o mesmo formato de item
// "achatado", com os campos direto no objeto, ao contrário da view de
// itens do pedido em pedido-tabs.tsx, que lê de um `produto` aninhado e
// também calcula peso — por isso fica de fora daqui).
export type ItemChapa = {
  unidade?: string | null;
  largura_m?: number | null;
  altura_m?: number | null;
  qtd_pecas?: number | null;
};

export function isChapa(it: ItemChapa): boolean {
  return ["CHAPA", "M²", "M2"].includes((it.unidade ?? "").toUpperCase());
}

// Para CHAPA: área total = largura × altura × qtd_pecas. Para outros itens
// não faz sentido (retorna null).
export function itemAreaChapa(it: ItemChapa): number | null {
  if (!isChapa(it)) return null;
  if (it.largura_m && it.altura_m && it.qtd_pecas) {
    return it.largura_m * it.altura_m * it.qtd_pecas;
  }
  return null;
}

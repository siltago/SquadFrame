import type { BoardPedidoCard, PedidoGrupo } from "@/modules/squadboard/types/pedido";

// Agrupa pedidos da mesma obra dentro de uma coluna.
// Pedidos sem obra ficam como grupos individuais (grupoId = "ind-{id}").
// Todos os pedidos passados devem estar na mesma coluna.
export function agruparPedidos(pedidos: BoardPedidoCard[]): PedidoGrupo[] {
  const byObra = new Map<string, BoardPedidoCard[]>();

  for (const p of pedidos) {
    const key = p.obraId ?? `_ind_${p.id}`;
    if (!byObra.has(key)) byObra.set(key, []);
    byObra.get(key)!.push(p);
  }

  const grupos: PedidoGrupo[] = [];
  for (const [key, items] of byObra) {
    const first = items[0];
    const isIndividual = key.startsWith("_ind_");
    grupos.push({
      grupoId: isIndividual ? `ind-${first.id}` : `grp-${first.obraId}`,
      obraId: isIndividual ? null : first.obraId,
      obraNome: isIndividual ? null : first.obraNome,
      coluna: first.coluna,
      pedidos: items,
    });
  }

  return grupos;
}

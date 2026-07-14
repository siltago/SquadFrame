import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { calcPesoItem } from "./tipo-unidade";

export type ResultadoRecalculoPrecoKg = {
  mediaKg: number;
  pedidosConsiderados: number;
  produtosAtualizados: number;
};

// Início fixo do mês corrente — a janela considerada é sempre "desde o dia 01
// do mês até agora", independente de quando o recálculo roda (manual ou
// cron), e não uma janela móvel de 30 dias a partir de um pedido específico.
function inicioMesCorrente(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Calcula a média de R$/kg a partir dos pedidos de perfil com valor final
// confirmado (>0) no mês corrente, e aplica essa média a todos os produtos
// do catálogo cuja linha é do tipo "perfil": preco_kg = média,
// preco_metro = peso_metro × média (quando o produto tem peso cadastrado).
export async function recalcularPrecoKgPerfis(
  admin: ReturnType<typeof createAdminClient>
): Promise<ResultadoRecalculoPrecoKg | null> {
  const { data: pedidos } = await admin
    .from("pedidos_compra")
    .select("id, valor_final, tipo_linha")
    .gte("criado_em", inicioMesCorrente().toISOString())
    .not("valor_final", "is", null)
    .gt("valor_final", 0);

  const pedidosPerfil = (pedidos ?? []).filter((p: any) =>
    (p.tipo_linha ?? "").toUpperCase().includes("PERFIL")
  );
  if (!pedidosPerfil.length) return null;

  const precosKg: number[] = [];
  for (const p of pedidosPerfil) {
    const { data: itens } = await admin
      .from("pedido_itens")
      .select("unidade, quantidade_pedida, largura_m, altura_m, qtd_pecas, produto:produtos(tamanho_mm, peso_metro)")
      .eq("pedido_id", p.id);

    const pesoTotal = (itens ?? []).reduce((soma: number, it: any) => {
      return soma + calcPesoItem({
        unidade: it.unidade,
        quantidadePedida: Number(it.quantidade_pedida),
        larguraM: it.largura_m != null ? Number(it.largura_m) : null,
        alturaM: it.altura_m != null ? Number(it.altura_m) : null,
        qtdPecas: it.qtd_pecas != null ? Number(it.qtd_pecas) : null,
        tamanhoMm: it.produto?.tamanho_mm != null ? Number(it.produto.tamanho_mm) : null,
        pesoMetro: it.produto?.peso_metro != null ? Number(it.produto.peso_metro) : null,
      });
    }, 0);

    if (pesoTotal > 0) precosKg.push(Number(p.valor_final) / pesoTotal);
  }
  if (!precosKg.length) return null;

  // Arredonda pra 2 casas — sem isso, o preço propaga pro catálogo (e daí
  // pros itens de pedidos novos) com muitas casas decimais.
  const mediaKg = Math.round((precosKg.reduce((a, b) => a + b, 0) / precosKg.length) * 100) / 100;

  const { data: produtos } = await admin
    .from("produtos")
    .select("id, peso_metro, linha:linhas(tipo)")
    .eq("status", true);

  const produtosPerfil = (produtos ?? []).filter((p: any) =>
    (p.linha?.tipo ?? "").toUpperCase().includes("PERFIL")
  );
  if (!produtosPerfil.length) return { mediaKg, pedidosConsiderados: precosKg.length, produtosAtualizados: 0 };

  // Sequencial em vez de Promise.all: disparar uma requisição por produto em
  // paralelo já causou "fetch failed" por saturar conexões no dev (Windows).
  for (const p of produtosPerfil as any[]) {
    const patch: Record<string, unknown> = { preco_kg: mediaKg };
    if (p.peso_metro != null) patch.preco_metro = Math.round(Number(p.peso_metro) * mediaKg * 100) / 100;
    const { error } = await admin.from("produtos").update(patch).eq("id", p.id);
    if (error) {
      const colunaFaltando = /column|42703/i.test(error.message);
      throw new Error(
        colunaFaltando
          ? `Falha ao atualizar produtos (${error.message}). A migration produtos.preco_kg foi aplicada no Supabase?`
          : `Falha ao atualizar produtos: ${error.message}`
      );
    }
  }

  return { mediaKg, pedidosConsiderados: precosKg.length, produtosAtualizados: produtosPerfil.length };
}

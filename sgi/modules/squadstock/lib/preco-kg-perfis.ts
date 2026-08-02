import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { calcPesoItem } from "@/modules/squadframe/lib/tipo-unidade";

export type ResultadoRecalculoPrecoKg = {
  mediaKg: number;
  pedidosConsiderados: number;
  produtosAtualizados: number;
  aliasesAtualizados: number;
};

// Janela rolante de 60 dias (não mais "desde o dia 1 do mês corrente") — com
// o corte fixo no início do mês, o cron do dia 1 sempre rodava sem nenhum
// pedido novo ainda naquele mês, zerando a base de cálculo bem quando ela
// tinha acabado de se formar no mês anterior. Uma janela rolante garante que
// sempre haja histórico recente pra calcular a média, renovando aos poucos
// em vez de "sumir" a cada virada de mês.
const DIAS_JANELA_PRECO_KG = 60;
function inicioJanelaRecente(): Date {
  const d = new Date();
  d.setDate(d.getDate() - DIAS_JANELA_PRECO_KG);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Calcula a média de R$/kg a partir dos pedidos de perfil com valor final
// confirmado (>0) nos últimos 60 dias, e aplica essa média a todos os
// produtos do catálogo cuja linha é do tipo "perfil": preco_kg = média,
// preco_metro = peso_metro × média (quando o produto tem peso cadastrado).
export async function recalcularPrecoKgPerfis(
  admin: ReturnType<typeof createAdminClient>
): Promise<ResultadoRecalculoPrecoKg | null> {
  const { data: pedidos } = await admin
    .from("pedidos_compra")
    .select("id, valor_final, tipo_linha")
    .gte("criado_em", inicioJanelaRecente().toISOString())
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

  // Busca paginada — sem isso, o Supabase corta silenciosamente em 1000
  // linhas por página e o catálogo (1659+ produtos ativos) ficava com boa
  // parte dos perfis de fora do recálculo, sem erro nenhum pra avisar.
  const produtos: any[] = [];
  {
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data: pagina } = await admin
        .from("produtos")
        .select("id, peso_metro, linha:linhas(tipo)")
        .eq("status", true)
        .range(from, from + PAGE - 1);
      if (!pagina?.length) break;
      produtos.push(...pagina);
      if (pagina.length < PAGE) break;
    }
  }

  const produtosPerfil = produtos.filter((p: any) =>
    (p.linha?.tipo ?? "").toUpperCase().includes("PERFIL")
  );
  if (!produtosPerfil.length) {
    return { mediaKg, pedidosConsiderados: precosKg.length, produtosAtualizados: 0, aliasesAtualizados: 0 };
  }

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

  // Aliases (códigos alternativos do mesmo produto, por fornecedor) seguem o
  // mesmo padrão preco_kg → preco_metro = peso_metro × preco_kg (ver migration
  // produto_aliases.preco_kg), mas têm peso_metro próprio — pode divergir do
  // produto mestre. Sem isso, o catálogo de aliases ficava com preço parado
  // mesmo depois do recálculo do produto principal.
  // Em lotes — um .in() só com todos os IDs de perfil (pode passar de 1000
  // agora que a busca de produtos não trunca mais) arrisca estourar o
  // limite de tamanho da URL da requisição.
  const aliases: any[] = [];
  const idsPerfil = produtosPerfil.map((p: any) => p.id);
  const LOTE = 200;
  for (let i = 0; i < idsPerfil.length; i += LOTE) {
    const { data: pagina } = await admin
      .from("produto_aliases")
      .select("id, peso_metro")
      .in("produto_id", idsPerfil.slice(i, i + LOTE));
    if (pagina?.length) aliases.push(...pagina);
  }

  let aliasesAtualizados = 0;
  for (const a of aliases as any[]) {
    const patch: Record<string, unknown> = { preco_kg: mediaKg };
    if (a.peso_metro != null) patch.preco_metro = Math.round(Number(a.peso_metro) * mediaKg * 100) / 100;
    const { error } = await admin.from("produto_aliases").update(patch).eq("id", a.id);
    if (error) throw new Error(`Falha ao atualizar produto_aliases: ${error.message}`);
    aliasesAtualizados++;
  }

  return {
    mediaKg,
    pedidosConsiderados: precosKg.length,
    produtosAtualizados: produtosPerfil.length,
    aliasesAtualizados,
  };
}

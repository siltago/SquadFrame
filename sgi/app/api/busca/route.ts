import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { buildSearchPattern } from "@/ui/lib/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ resultados: [] });

  const admin = createAdminClient();
  const like = buildSearchPattern(q);

  const [obras, produtos, fornecedores, pedidos, tarefas, pedidosPorItem, solicitacoesPorItem] = await Promise.all([
    admin.from("obras")
      .select("id, nome, codigo, numero, cliente:clientes(nome)")
      .ilike("nome", like)
      .is("deleted_at", null)
      .limit(5),
    admin.from("produtos")
      .select("id, codigo_mestre, nome, linha:linhas(id, nome)")
      .or(`codigo_mestre.ilike.${like},nome.ilike.${like}`)
      .limit(5),
    admin.from("fornecedores")
      .select("id, nome")
      .ilike("nome", like)
      .eq("ativo", true)
      .limit(4),
    admin.from("pedidos_compra")
      .select("id, numero, status, fornecedor:fornecedores(nome)")
      .ilike("numero", like)
      .limit(4),
    admin.from("tarefas")
      .select("id, titulo, status, setor:setores(nome)")
      .textSearch("titulo_tsv", q, { type: "websearch", config: "portuguese" })
      .is("deleted_at", null)
      .not("status", "in", '("CONCLUIDA","CANCELADA")')
      .limit(5),
    // Pedidos que contêm itens com a descrição pesquisada
    admin.from("pedido_itens")
      .select("pedido:pedidos_compra(id, numero, status, fornecedor:fornecedores(nome)), descricao_snapshot")
      .ilike("descricao_snapshot", like)
      .limit(4),
    // Solicitações que contêm itens com a descrição pesquisada
    admin.from("solicitacao_itens")
      .select("solicitacao:solicitacoes_compra(id, numero, status), descricao_manual")
      .ilike("descricao_manual", like)
      .limit(4),
  ]);

  // IDs de pedidos já encontrados pelo número (evitar duplicatas)
  const pedidosIdsJaEncontrados = new Set((pedidos.data ?? []).map((p: any) => p.id));

  const resultados = [
    ...(obras.data ?? []).map((o: any) => ({
      tipo: "obra" as const,
      id: o.id,
      titulo: o.nome,
      subtitulo: [o.cliente?.nome, o.codigo].filter(Boolean).join(" · "),
      href: `/squadframe/obras/${o.id}`,
    })),
    ...(produtos.data ?? []).map((p: any) => ({
      tipo: "produto" as const,
      id: p.id,
      titulo: p.nome,
      subtitulo: [p.codigo_mestre, p.linha?.nome].filter(Boolean).join(" · "),
      href: `/squadframe/catalogo/${p.linha?.id}/${p.id}`,
    })),
    ...(fornecedores.data ?? []).map((f: any) => ({
      tipo: "fornecedor" as const,
      id: f.id,
      titulo: f.nome,
      subtitulo: "Fornecedor",
      href: `/squadframe/compras/fornecedores`,
    })),
    ...(pedidos.data ?? []).map((p: any) => ({
      tipo: "pedido" as const,
      id: p.id,
      titulo: p.numero,
      subtitulo: p.fornecedor?.nome ?? "Pedido de compra",
      href: `/squadframe/compras/pedidos/${p.id}`,
    })),
    // Pedidos encontrados via item — sem duplicar os do bloco anterior
    ...((pedidosPorItem.data ?? []) as any[])
      .filter((r) => r.pedido && !pedidosIdsJaEncontrados.has(r.pedido.id))
      .map((r) => ({
        tipo: "pedido" as const,
        id: r.pedido.id,
        titulo: r.pedido.numero,
        subtitulo: `Item: ${r.descricao_snapshot}`,
        href: `/squadframe/compras/pedidos/${r.pedido.id}`,
      })),
    // Solicitações encontradas via item
    ...((solicitacoesPorItem.data ?? []) as any[])
      .filter((r) => r.solicitacao)
      .map((r) => ({
        tipo: "solicitacao" as const,
        id: r.solicitacao.id,
        titulo: r.solicitacao.numero,
        subtitulo: `Item: ${r.descricao_manual ?? ""}`,
        href: `/squadframe/compras/solicitacoes/${r.solicitacao.id}`,
      })),
    ...(tarefas.data ?? []).map((t: any) => ({
      tipo: "tarefa" as const,
      id: t.id,
      titulo: t.titulo,
      subtitulo: t.setor?.nome ?? t.status,
      href: `/squadframe/tarefas/${t.id}`,
    })),
  ];

  return NextResponse.json({ resultados });
}

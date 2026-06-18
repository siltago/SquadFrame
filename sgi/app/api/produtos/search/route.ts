import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const q            = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const tipo         = req.nextUrl.searchParams.get("tipo")?.trim() ?? "";
  const fornecedorId = req.nextUrl.searchParams.get("fornecedor_id")?.trim() ?? "";

  if (q.length < 2) return NextResponse.json([]);

  const admin = createAdminClient();

  // Resolve IDs de linhas pelo filtro de tipo
  let linhaIds: string[] = [];
  if (tipo) {
    const { data: linhas } = await admin.from("linhas").select("id").eq("tipo", tipo);
    linhaIds = (linhas ?? []).map((l: any) => l.id);
    if (!linhaIds.length) return NextResponse.json([]);
  }

  // Busca em paralelo: código/nome, aliases e (legado) produto_fornecedores
  const [byMestre, byAlias, byFornCod] = await Promise.all([
    (() => {
      let q1 = admin.from("produtos")
        .select("id")
        .or(`codigo_mestre.ilike.%${q}%,nome.ilike.%${q}%`)
        .eq("status", true);
      if (linhaIds.length) q1 = q1.in("linha_id", linhaIds);
      return q1.limit(20);
    })(),
    admin.from("produto_aliases").select("produto_id").ilike("alias", `%${q}%`).limit(20),
    admin.from("produto_fornecedores").select("produto_id").ilike("codigo_fornecedor", `%${q}%`).limit(20),
  ]);

  const ids = Array.from(new Set([
    ...(byMestre.data ?? []).map((p: any) => p.id),
    ...(byAlias.data  ?? []).map((a: any) => a.produto_id),
    ...(byFornCod.data ?? []).map((f: any) => f.produto_id),
  ]));

  if (!ids.length) return NextResponse.json([]);

  let qProd = admin.from("produtos")
    .select("id, codigo_mestre, nome, unidade, fornecedor_mestre_id, peso_metro, preco_metro, tamanho_mm")
    .in("id", ids)
    .eq("status", true);
  if (linhaIds.length) qProd = qProd.in("linha_id", linhaIds);
  const { data: produtos } = await qProd.limit(12);

  if (!produtos?.length) return NextResponse.json([]);

  if (fornecedorId) {
    const prodIds = produtos.map((p: any) => p.id);

    // Busca alias vinculado a este fornecedor — pode sobrescrever specs do produto
    const { data: aliasRows } = await admin
      .from("produto_aliases")
      .select("produto_id, alias, peso_metro, preco_metro, tamanho_mm")
      .eq("fornecedor_id", fornecedorId)
      .in("produto_id", prodIds);

    const aliasMap = new Map((aliasRows ?? []).map((a: any) => [a.produto_id, a]));

    return NextResponse.json(produtos.map((p: any) => {
      const al = aliasMap.get(p.id);
      // Alias sobrescreve specs se tiver valor próprio
      return {
        id: p.id, codigo_mestre: p.codigo_mestre, nome: p.nome, unidade: p.unidade,
        codigo_do_fornecedor: al?.alias ?? (p.fornecedor_mestre_id === fornecedorId ? p.codigo_mestre : null),
        peso_metro:  al?.peso_metro  ?? p.peso_metro  ?? null,
        preco_metro: al?.preco_metro ?? p.preco_metro ?? null,
        tamanho_mm:  al?.tamanho_mm  ?? p.tamanho_mm  ?? null,
      };
    }));
  }

  return NextResponse.json(produtos.map((p: any) => ({
    id: p.id, codigo_mestre: p.codigo_mestre, nome: p.nome, unidade: p.unidade,
    peso_metro: p.peso_metro ?? null, preco_metro: p.preco_metro ?? null, tamanho_mm: p.tamanho_mm ?? null,
  })));
}

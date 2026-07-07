import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { buildSearchPattern } from "@/ui/lib/search";

export async function GET(req: NextRequest) {
  const q            = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const tipo         = req.nextUrl.searchParams.get("tipo")?.trim() ?? "";
  const fornecedorId = req.nextUrl.searchParams.get("fornecedor_id")?.trim() ?? "";
  const corId        = req.nextUrl.searchParams.get("cor_id")?.trim() ?? "";

  if (q.length < 2) return NextResponse.json([]);

  const admin = createAdminClient();

  // Resolve IDs de linhas pelo filtro de tipo
  let linhaIds: string[] = [];
  if (tipo) {
    const { data: linhas } = await admin.from("linhas").select("id").eq("tipo", tipo);
    linhaIds = (linhas ?? []).map((l: any) => l.id);
    if (!linhaIds.length) return NextResponse.json([]);
  }

  const pattern = buildSearchPattern(q);

  // Busca em paralelo: código/nome, aliases e (legado) produto_fornecedores
  const [byMestre, byAlias, byFornCod] = await Promise.all([
    (() => {
      let q1 = admin.from("produtos")
        .select("id")
        .or(`codigo_mestre.ilike.${pattern},nome.ilike.${pattern}`)
        .eq("status", true);
      if (linhaIds.length) q1 = q1.in("linha_id", linhaIds);
      return q1.limit(20);
    })(),
    admin.from("produto_aliases").select("produto_id").ilike("alias", pattern).limit(20),
    admin.from("produto_fornecedores").select("produto_id").ilike("codigo_fornecedor", pattern).limit(20),
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

    // Busca aliases vinculadas a este fornecedor — pode sobrescrever specs do
    // produto. Um produto pode ter mais de uma alias por fornecedor (uma por
    // cor, ex: FEC325PTR/FEC325BRC); prioriza a alias específica da cor
    // pedida e cai para a genérica (cor_id nulo, "vale para qualquer cor")
    // quando não há uma exata.
    const { data: aliasRows } = await admin
      .from("produto_aliases")
      .select("produto_id, alias, peso_metro, preco_metro, tamanho_mm, preco_kg, cor_id")
      .eq("fornecedor_id", fornecedorId)
      .in("produto_id", prodIds);

    const aliasExata = new Map<string, NonNullable<typeof aliasRows>[number]>();
    const aliasGenerica = new Map<string, NonNullable<typeof aliasRows>[number]>();
    for (const a of aliasRows ?? []) {
      if (corId && a.cor_id === corId) aliasExata.set(a.produto_id, a);
      else if (!a.cor_id) aliasGenerica.set(a.produto_id, a);
    }

    return NextResponse.json(produtos.map((p: any) => {
      const al = aliasExata.get(p.id) ?? aliasGenerica.get(p.id);
      const pesoEfetivo = al?.peso_metro ?? p.peso_metro ?? null;
      // preco_kg × peso calcula preco_metro para barras compradas por peso
      const precoMetroEfetivo = al?.preco_kg != null && pesoEfetivo != null
        ? pesoEfetivo * al.preco_kg
        : al?.preco_metro ?? p.preco_metro ?? null;
      return {
        id: p.id, codigo_mestre: p.codigo_mestre, nome: p.nome, unidade: p.unidade,
        codigo_do_fornecedor: al?.alias ?? (p.fornecedor_mestre_id === fornecedorId ? p.codigo_mestre : null),
        peso_metro:  pesoEfetivo,
        preco_metro: precoMetroEfetivo,
        tamanho_mm:  al?.tamanho_mm ?? p.tamanho_mm ?? null,
      };
    }));
  }

  return NextResponse.json(produtos.map((p: any) => ({
    id: p.id, codigo_mestre: p.codigo_mestre, nome: p.nome, unidade: p.unidade,
    peso_metro: p.peso_metro ?? null, preco_metro: p.preco_metro ?? null, tamanho_mm: p.tamanho_mm ?? null,
  })));
}

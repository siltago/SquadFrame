import { redirect } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { NovoBeneficiamentoCliente } from "@/modules/squadframe/components/compras/novo-beneficiamento-cliente";

export const dynamic = "force-dynamic";

export default async function NovoBeneficiamentoPage({
  searchParams,
}: { searchParams: { pedido_id?: string } }) {
  const usuario = await getUsuarioAtual();
  const podeCriar =
    usuario?.permissoes?.includes("*") || usuario?.permissoes?.includes("compras.beneficiamento.criar");
  if (!podeCriar) redirect("/squadframe/beneficiamento");

  const admin = createAdminClient();

  const [{ data: fornecedores }, { data: formas }] = await Promise.all([
    admin.from("fornecedores").select("id, nome").eq("faz_beneficiamento", true).eq("ativo", true).order("nome"),
    admin.from("formas_pagamento").select("id, nome, is_faturamento_direto").eq("ativo", true).order("nome"),
  ]);

  let pedidoOrigem: {
    id: string; numero: string; obra_id: string | null; obra: { nome: string } | null;
    itens: { id: string; quantidade_pedida: number; unidade: string; descricao_snapshot: string; produto: { id: string; codigo_mestre: string; nome: string; unidade: string; tamanho_mm: number | null; linha_id: string | null } | null }[];
  } | null = null;

  // Só pedidos com itens de perfil cor natural fazem sentido aqui — o
  // seletor abaixo já vem pronto quando chega via botão do pedido de
  // origem; sem pedido_id, mostra uma lista curta pra escolher.
  let pedidosElegiveis: { id: string; numero: string; obra: { nome: string } | null }[] = [];

  if (searchParams.pedido_id) {
    const { data } = await admin
      .from("pedidos_compra")
      .select(`
        id, numero, obra_id, obra:obras(nome),
        itens:pedido_itens(id, quantidade_pedida, unidade, descricao_snapshot,
          produto:produtos(id, codigo_mestre, nome, unidade, tamanho_mm, linha_id),
          cor:cores_ral(codigo_ral)
        )
      `)
      .eq("id", searchParams.pedido_id)
      .single();

    if (data) {
      const itensNatural = (data.itens as any[]).filter((i) => {
        const cor = Array.isArray(i.cor) ? i.cor[0] : i.cor;
        return cor?.codigo_ral?.toUpperCase() === "NATURAL";
      });
      pedidoOrigem = {
        id: data.id,
        numero: data.numero,
        obra_id: data.obra_id,
        obra: Array.isArray(data.obra) ? data.obra[0] ?? null : data.obra,
        itens: itensNatural.map((i) => ({
          ...i,
          produto: Array.isArray(i.produto) ? i.produto[0] ?? null : i.produto,
        })),
      };
    }
  } else {
    const { data } = await admin
      .from("pedidos_compra")
      .select("id, numero, obra:obras(nome), itens:pedido_itens(cor:cores_ral(codigo_ral))")
      .in("status", ["EMITIDO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL", "RECEBIDO"])
      .order("criado_em", { ascending: false })
      .limit(200);

    pedidosElegiveis = (data ?? [])
      .filter((p: any) =>
        (p.itens as any[]).some((i) => {
          const cor = Array.isArray(i.cor) ? i.cor[0] : i.cor;
          return cor?.codigo_ral?.toUpperCase() === "NATURAL";
        })
      )
      .slice(0, 50)
      .map((p: any) => ({ id: p.id, numero: p.numero, obra: Array.isArray(p.obra) ? p.obra[0] ?? null : p.obra }));
  }

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <BackButton href="/squadframe/beneficiamento" />
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Novo Beneficiamento</h1>
      <p className="mt-1 text-sm text-text-2">
        Só perfil comprado cor natural pode virar beneficiamento.
      </p>
      <div className="mt-6">
        <NovoBeneficiamentoCliente
          pedidoOrigem={pedidoOrigem}
          pedidosElegiveis={pedidosElegiveis}
          fornecedores={fornecedores ?? []}
          formasPagamento={formas ?? []}
        />
      </div>
    </div>
  );
}

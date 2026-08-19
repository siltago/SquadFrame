import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { BackButton } from "@/modules/squadframe/components/back-button";
import {
  ROTA_BENEFICIAMENTO_LABEL, STATUS_BENEFICIAMENTO_LABEL, STATUS_BENEFICIAMENTO_COR,
  STATUS_PED_LABEL, STATUS_PED_COR,
} from "@/modules/squadframe/types/compras";
import { BeneficiamentoDetalheCliente } from "@/modules/squadframe/components/compras/beneficiamento-detalhe-cliente";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

export const dynamic = "force-dynamic";

const rel = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export default async function BeneficiamentoDetalhePage({ params }: { params: { id: string } }) {
  const usuario = await getUsuarioAtual();
  const podeGerenciar =
    usuario?.permissoes?.includes("*") || usuario?.permissoes?.includes("compras.beneficiamento.gerenciar");

  const admin = createAdminClient();

  const { data: benef } = await admin
    .from("beneficiamentos")
    .select(`
      id, numero, rota, status, observacoes, criado_em, enviado_em, concluido_em,
      obra:obras(nome),
      pedido_origem:pedidos_compra!beneficiamentos_pedido_origem_id_fkey(id, numero, status),
      pedido_pintura:pedidos_compra!beneficiamentos_pedido_pintura_id_fkey(id, numero, status, fornecedor:fornecedores(nome))
    `)
    .eq("id", params.id)
    .maybeSingle();

  if (!benef) notFound();

  const { data: itens } = await admin
    .from("beneficiamento_itens")
    .select("id, quantidade, produto_cru:produtos!beneficiamento_itens_produto_cru_id_fkey(codigo_mestre, nome, unidade), produto_pintado:produtos!beneficiamento_itens_produto_pintado_id_fkey(codigo_mestre, nome)")
    .eq("beneficiamento_id", params.id);

  const obra = rel(benef.obra);
  const pedidoOrigem = rel(benef.pedido_origem);
  const pedidoPintura = rel(benef.pedido_pintura);
  const fornecedor = pedidoPintura ? rel((pedidoPintura as any).fornecedor) : null;

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <RealtimeRefresher channelName={`beneficiamento-${params.id}`} subs={[{ table: "beneficiamentos", filter: `id=eq.${params.id}` }]} />
      <BackButton href="/squadframe/beneficiamento" />

      <div className="mt-2 flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight font-mono">{benef.numero}</h1>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: STATUS_BENEFICIAMENTO_COR[benef.status as keyof typeof STATUS_BENEFICIAMENTO_COR] + "22", color: STATUS_BENEFICIAMENTO_COR[benef.status as keyof typeof STATUS_BENEFICIAMENTO_COR] }}
        >
          {STATUS_BENEFICIAMENTO_LABEL[benef.status as keyof typeof STATUS_BENEFICIAMENTO_LABEL]}
        </span>
      </div>
      <p className="mt-1 text-sm text-text-2">
        {ROTA_BENEFICIAMENTO_LABEL[benef.rota as keyof typeof ROTA_BENEFICIAMENTO_LABEL]}
        {obra?.nome && ` — ${obra.nome}`}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-3">Pedido de origem</p>
          {pedidoOrigem ? (
            <a href={`/squadframe/compras/pedidos/${pedidoOrigem.id}`} className="mt-1 block hover:underline">
              <span className="font-mono text-sm font-semibold text-primary">{pedidoOrigem.numero}</span>
              <span
                className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: STATUS_PED_COR[pedidoOrigem.status as keyof typeof STATUS_PED_COR] + "22", color: STATUS_PED_COR[pedidoOrigem.status as keyof typeof STATUS_PED_COR] }}
              >
                {STATUS_PED_LABEL[pedidoOrigem.status as keyof typeof STATUS_PED_LABEL]}
              </span>
            </a>
          ) : <p className="text-sm text-text-3">—</p>}
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-3">Pedido de beneficiamento</p>
          {pedidoPintura ? (
            <a href={`/squadframe/compras/pedidos/${pedidoPintura.id}`} className="mt-1 block hover:underline">
              <span className="font-mono text-sm font-semibold text-primary">{pedidoPintura.numero}</span>
              <span
                className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: STATUS_PED_COR[pedidoPintura.status as keyof typeof STATUS_PED_COR] + "22", color: STATUS_PED_COR[pedidoPintura.status as keyof typeof STATUS_PED_COR] }}
              >
                {STATUS_PED_LABEL[pedidoPintura.status as keyof typeof STATUS_PED_LABEL]}
              </span>
              {fornecedor?.nome && <span className="ml-2 text-xs text-text-3">{fornecedor.nome}</span>}
            </a>
          ) : <p className="text-sm text-text-3">—</p>}
        </div>
      </div>

      <div className="mt-4 card overflow-x-auto">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">Itens</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-4 py-2 font-medium">Cru</th>
              <th className="px-4 py-2 font-medium">Pintado</th>
              <th className="px-4 py-2 font-medium text-right">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            {(itens ?? []).map((i: any) => {
              const cru = rel(i.produto_cru);
              const pintado = rel(i.produto_pintado);
              return (
                <tr key={i.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-text-3">{cru?.codigo_mestre}</span>
                    <p className="text-text-2">{cru?.nome}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-text-3">{pintado?.codigo_mestre}</span>
                    <p className="text-text-2">{pintado?.nome}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{i.quantidade} {cru?.unidade}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {benef.observacoes && (
        <div className="mt-4 card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-3">Observações</p>
          <p className="mt-1 text-sm text-text-2">{benef.observacoes}</p>
        </div>
      )}

      <BeneficiamentoDetalheCliente
        beneficiamentoId={benef.id}
        status={benef.status}
        podeGerenciar={!!podeGerenciar}
      />
    </div>
  );
}

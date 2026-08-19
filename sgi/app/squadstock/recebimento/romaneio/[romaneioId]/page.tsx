import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { iniciarRecebimento } from "@/modules/squadstock/actions/recebimento";
import { ReceberRomaneioCliente } from "@/modules/squadframe/components/compras/receber-romaneio-cliente";

export const dynamic = "force-dynamic";

const STATUS_EM_TRANSITO = ["EMITIDO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL"];
const rel = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export default async function RecebimentoRomaneioPage({ params }: { params: { romaneioId: string } }) {
  const admin = createAdminClient();

  const { data: romaneio } = await admin
    .from("romaneios")
    .select("id, numero, data_entrega, fornecedor:fornecedores(nome)")
    .eq("id", params.romaneioId)
    .maybeSingle();
  if (!romaneio) notFound();

  const fornecedorRomaneio = rel(romaneio.fornecedor as any);

  const { data: vinculos } = await admin
    .from("romaneio_pedidos")
    .select("pedido:pedidos_compra(id, numero, status, obra:obras(nome), fornecedor:fornecedores(nome))")
    .eq("romaneio_id", params.romaneioId);

  const pedidosElegiveis = (vinculos ?? [])
    .map((v: any) => rel(v.pedido))
    .filter((p: any) => p && STATUS_EM_TRANSITO.includes(p.status))
    .map((p: any) => ({ ...p, obra: rel(p.obra), fornecedor: rel(p.fornecedor) }))
    .sort((a: any, b: any) => (a.numero ?? "").localeCompare(b.numero ?? ""));

  if (pedidosElegiveis.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-3xl mx-auto">
        <BackButton href="/squadstock/recebimento" />
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Romaneio {romaneio.numero ?? "—"}</h1>
        <p className="mt-4 text-sm text-text-3">
          Nenhum pedido deste romaneio está em trânsito no momento — o lote já foi
          recebido por completo ou nenhum pedido está vinculado.
        </p>
      </div>
    );
  }

  // Idempotente por pedido — marca "iniciado" pra todo mundo que vai ser
  // conferido nesta tela, em paralelo.
  await Promise.all(pedidosElegiveis.map((p: any) => iniciarRecebimento(p.id)));

  const { data: itensRaw } = await admin
    .from("vw_pedido_itens")
    .select("id, pedido_id, descricao_snapshot, unidade, quantidade_pedida, quantidade_recebida, saldo_pendente, produto:produtos(codigo_mestre, nome)")
    .in("pedido_id", pedidosElegiveis.map((p: any) => p.id))
    .gt("saldo_pendente", 0);

  const itensPorPedido = new Map<string, any[]>();
  for (const it of itensRaw ?? []) {
    const arr = itensPorPedido.get(it.pedido_id) ?? [];
    arr.push(it);
    itensPorPedido.set(it.pedido_id, arr);
  }

  const grupos = pedidosElegiveis
    .map((p: any) => {
      const itens = (itensPorPedido.get(p.id) ?? []).slice().sort((a: any, b: any) => {
        const nomeA = a.produto?.nome ?? a.descricao_snapshot ?? "";
        const nomeB = b.produto?.nome ?? b.descricao_snapshot ?? "";
        return nomeA.localeCompare(nomeB, "pt-BR");
      });
      return {
        pedidoId: p.id,
        numero: p.numero,
        obraNome: p.obra?.nome ?? null,
        fornecedorNome: p.fornecedor?.nome ?? null,
        itens,
      };
    })
    .filter((g: any) => g.itens.length > 0);

  if (grupos.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-3xl mx-auto">
        <BackButton href="/squadstock/recebimento" />
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Romaneio {romaneio.numero ?? "—"}</h1>
        <p className="mt-4 text-sm text-text-3">Nenhum item com saldo pendente neste romaneio.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-4xl mx-auto">
      <BackButton href="/squadstock/recebimento" />
      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        Conferência de Recebimento — Romaneio {romaneio.numero ?? "—"}
      </h1>
      <p className="mt-1 text-sm text-text-2">
        {fornecedorRomaneio?.nome ?? "Fornecedor não identificado"} · {grupos.length} pedido{grupos.length !== 1 ? "s" : ""}
      </p>
      <div className="mt-6">
        <ReceberRomaneioCliente romaneioId={params.romaneioId} grupos={grupos} redirectHref="/squadstock/recebimento" />
      </div>
    </div>
  );
}

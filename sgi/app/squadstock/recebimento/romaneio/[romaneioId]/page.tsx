import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { iniciarRecebimento } from "@/modules/squadstock/actions/recebimento";
import { ReceberRomaneioCliente } from "@/modules/squadframe/components/compras/receber-romaneio-cliente";
import { STATUS_PED_LABEL } from "@/modules/squadframe/types/compras";

export const dynamic = "force-dynamic";

const STATUS_EM_TRANSITO = ["EMITIDO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL"];
const rel = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

function AlertaPedidoBloqueado({ p }: { p: { id: string; numero: string; status: string; obraNome: string | null } }) {
  const label = STATUS_PED_LABEL[p.status as keyof typeof STATUS_PED_LABEL] ?? p.status;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm">
      <div>
        <p className="font-medium text-text">
          Pedido {p.numero}{p.obraNome && <span className="font-normal text-text-3"> — {p.obraNome}</span>}
        </p>
        <p className="text-text-2">
          Está com status <strong>{label}</strong> — não pode ser recebido nesta etapa. Corrija o status do pedido antes de continuar.
        </p>
      </div>
      <Link href={`/squadframe/compras/pedidos/${p.id}`} className="shrink-0 font-semibold text-primary hover:underline">
        Ver pedido →
      </Link>
    </div>
  );
}

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

  // FINALIZADO some da tela (já concluído de verdade, nada a fazer); os
  // demais status aparecem sempre — só quem está "em trânsito" vira uma
  // seção de conferência, o resto vira um alerta pedindo pra corrigir o
  // status do pedido antes de continuar.
  const todosVinculados = (vinculos ?? [])
    .map((v: any) => rel(v.pedido))
    .filter((p: any) => p && p.status !== "FINALIZADO")
    .map((p: any) => ({ ...p, obra: rel(p.obra), fornecedor: rel(p.fornecedor) }))
    .sort((a: any, b: any) => (a.numero ?? "").localeCompare(b.numero ?? ""));

  const pedidosReceber = todosVinculados.filter((p: any) => STATUS_EM_TRANSITO.includes(p.status));
  const pedidosBloqueados = todosVinculados.filter((p: any) => !STATUS_EM_TRANSITO.includes(p.status));

  if (todosVinculados.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-3xl mx-auto">
        <BackButton href="/squadstock/recebimento" />
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Romaneio {romaneio.numero ?? "—"}</h1>
        <p className="mt-4 text-sm text-text-3">
          Nenhum pedido vinculado a este romaneio, ou todos já foram finalizados.
        </p>
      </div>
    );
  }

  // Idempotente por pedido — marca "iniciado" só pra quem vai ser conferido
  // nesta tela (os elegíveis), em paralelo.
  await Promise.all(pedidosReceber.map((p: any) => iniciarRecebimento(p.id)));

  const { data: itensRaw } = pedidosReceber.length
    ? await admin
        .from("vw_pedido_itens")
        .select("id, pedido_id, descricao_snapshot, unidade, quantidade_pedida, quantidade_recebida, saldo_pendente, produto:produtos(codigo_mestre, nome)")
        .in("pedido_id", pedidosReceber.map((p: any) => p.id))
        .gt("saldo_pendente", 0)
    : { data: [] };

  const itensPorPedido = new Map<string, any[]>();
  for (const it of itensRaw ?? []) {
    const arr = itensPorPedido.get(it.pedido_id) ?? [];
    arr.push(it);
    itensPorPedido.set(it.pedido_id, arr);
  }

  const grupos = pedidosReceber
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

  const bloqueadosView = pedidosBloqueados.map((p: any) => ({
    id: p.id, numero: p.numero, status: p.status, obraNome: p.obra?.nome ?? null,
  }));

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-4xl mx-auto">
      <BackButton href="/squadstock/recebimento" />
      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        Conferência de Recebimento — Romaneio {romaneio.numero ?? "—"}
      </h1>
      <p className="mt-1 text-sm text-text-2">
        {fornecedorRomaneio?.nome ?? "Fornecedor não identificado"} · {todosVinculados.length} pedido{todosVinculados.length !== 1 ? "s" : ""} vinculado{todosVinculados.length !== 1 ? "s" : ""}
      </p>

      {bloqueadosView.length > 0 && (
        <div className="mt-6 space-y-2">
          {bloqueadosView.map((p) => <AlertaPedidoBloqueado key={p.id} p={p} />)}
        </div>
      )}

      {grupos.length > 0 ? (
        <div className="mt-6">
          <ReceberRomaneioCliente romaneioId={params.romaneioId} grupos={grupos} redirectHref="/squadstock/recebimento" />
        </div>
      ) : (
        <p className="mt-6 text-sm text-text-3">
          Nenhum pedido deste romaneio está pronto pra conferência agora — corrija os status acima ou volte quando o material for emitido.
        </p>
      )}
    </div>
  );
}

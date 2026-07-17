import { notFound, redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { buscarObra } from "@/modules/wise/works/service";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { LoteDetalhe } from "@/modules/wise/works/components/lote-detalhe";
import { createAdminClient } from "@/shared/database/supabase-admin";
import {
  obterContexto, listarNecessidades, obterCobertura, calcularStatusSuprimentos,
  listarItensPedidoDoPacote, listarItensSolicitacaoDoPacote,
} from "@/modules/squadframe/package-procurement/service";
import type {
  WiseLoteComTipologias,
  WiseLotePedido,
  WiseLoteSolicitacao,
} from "@/modules/wise/works/types";

export const dynamic = "force-dynamic";

async function buscarLote(
  loteId: string,
  obraId: string,
): Promise<WiseLoteComTipologias | null> {
  const db = createAdminClient();

  const [resLote, resTipologias] = await Promise.all([
    db
      .from("lotes_obra")
      .select(
        "id, nome, prioridade, criado_em, etapa, liberado_compras, liberado_producao, tipo_producao",
      )
      .eq("id", loteId)
      .eq("obra_id", obraId)
      .maybeSingle(),
    db
      .from("tipologias_obra")
      .select(
        "id, nome, quantidade, status, codigo_esquadria, tipo, largura_mm, altura_mm, tratamento, descricao, peso_unit, preco_unit",
      )
      .eq("lote_id", loteId)
      .order("created_at", { ascending: true }),
  ]);

  if (!resLote.data) return null;

  const raw = resLote.data as Record<string, unknown>;
  return {
    id: raw.id as string,
    nome: raw.nome as string,
    prioridade: (raw.prioridade ?? null) as string | null,
    criado_em: raw.criado_em as string,
    etapa: (raw.etapa ?? null) as string | null,
    liberado_compras: (raw.liberado_compras ?? null) as boolean | null,
    liberado_producao: (raw.liberado_producao ?? null) as boolean | null,
    tipo_producao: (raw.tipo_producao ?? null) as string | null,
    tipologias: (resTipologias.data ?? []) as WiseLoteComTipologias["tipologias"],
  };
}

async function buscarPedidosEsolicitacoes(loteId: string) {
  const db = createAdminClient();

  const [resPedidos, resSols] = await Promise.all([
    db
      .from("pedidos_compra")
      .select("id, numero, status, criado_em, prazo_entrega")
      .eq("lote_id", loteId)
      .order("criado_em", { ascending: false }),
    db
      .from("solicitacoes_compra")
      .select("id, numero, status, prioridade, criado_em")
      .eq("lote_id", loteId)
      .order("criado_em", { ascending: false }),
  ]);

  const pedidos: WiseLotePedido[] = (resPedidos.data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    numero: p.numero as string,
    status: p.status as string,
    criado_em: p.criado_em as string,
    prazo_entrega: (p.prazo_entrega ?? null) as string | null,
    valor_final: null,
    fornecedor: null,
  }));

  const solicitacoes: WiseLoteSolicitacao[] = (resSols.data ?? []).map(
    (s: Record<string, unknown>) => ({
      id: s.id as string,
      numero: s.numero as string,
      status: s.status as string,
      prioridade: s.prioridade as string,
      criado_em: s.criado_em as string,
      solicitante: null,
    }),
  );

  return { pedidos, solicitacoes };
}

export default async function LotePage({
  params,
}: {
  params: { id: string; loteId: string };
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const [obra, lote, { pedidos, solicitacoes }, contextoCompras, necessidades, itensPedidoDisponiveis, itensSolicitacaoDisponiveis] = await Promise.all([
    buscarObra(params.id, wiseUsuario.empresa_id),
    buscarLote(params.loteId, params.id),
    buscarPedidosEsolicitacoes(params.loteId),
    obterContexto(params.loteId),
    listarNecessidades(params.loteId),
    listarItensPedidoDoPacote(params.loteId),
    listarItensSolicitacaoDoPacote(params.loteId),
  ]);

  if (!obra || !lote) notFound();

  const cobertura = await obterCobertura(necessidades);
  const statusSuprimentos = calcularStatusSuprimentos(necessidades, cobertura);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <BackButton href={`/squadwise/obras/${params.id}?aba=lotes`} />
      <div className="mt-4">
        <LoteDetalhe
          lote={lote}
          obraId={params.id}
          obraNome={obra.nome}
          pedidos={pedidos}
          solicitacoes={solicitacoes}
          contextoCompras={contextoCompras}
          necessidades={necessidades}
          cobertura={cobertura}
          statusSuprimentos={statusSuprimentos}
          itensPedidoDisponiveis={itensPedidoDisponiveis}
          itensSolicitacaoDisponiveis={itensSolicitacaoDisponiveis}
        />
      </div>
    </div>
  );
}

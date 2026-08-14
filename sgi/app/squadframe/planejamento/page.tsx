import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { PlanejamentoTabNav } from "@/modules/squadframe/components/planejamento/tab-nav";
import { DashboardBoard } from "@/modules/squadframe/components/planejamento/dashboard-board";
import { ObraPicker } from "@/modules/squadframe/components/planejamento/obra-picker";
import { LoteCard } from "@/modules/squadframe/components/planejamento/lote-card";
import { NovoLoteModal } from "@/modules/squadframe/components/planejamento/novo-lote-modal";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { listarLotesParaDashboard } from "@/modules/squadframe/services/planejamento/dashboard";
import { listarLotesDaObra } from "@/modules/squadframe/services/planejamento/lotes";

export const dynamic = "force-dynamic";

export default async function PlanejamentoPage({
  searchParams,
}: {
  searchParams: { aba?: string; obra?: string };
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) notFound();

  const aba = searchParams.aba === "gerenciamento" ? "gerenciamento" : "dashboard";

  return (
    <div className="px-8 py-8 max-w-6xl">
      <h1 className="text-2xl font-bold tracking-tight">Planejamento</h1>
      <p className="mt-1 text-sm text-text-2">
        Produção, compras e logística por lote — a segunda camada de verdade do SquadFrame, depois da obra.
      </p>

      <PlanejamentoTabNav />

      {aba === "dashboard" && <DashboardTab />}
      {aba === "gerenciamento" && <GerenciamentoTab obraId={searchParams.obra} />}
    </div>
  );
}

async function DashboardTab() {
  const lotes = await listarLotesParaDashboard();
  return (
    <div className="mt-6">
      <DashboardBoard lotes={lotes} />
    </div>
  );
}

async function GerenciamentoTab({ obraId }: { obraId?: string }) {
  if (!obraId) {
    return (
      <div className="mt-6">
        <ObraPicker />
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: obra } = await admin
    .from("obras")
    .select("id, nome, codigo")
    .eq("id", obraId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!obra) {
    return (
      <div className="mt-6">
        <p className="text-sm text-danger">Obra não encontrada.</p>
        <ObraPicker />
      </div>
    );
  }

  const lotes = await listarLotesDaObra(obraId);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <BackButton href="/squadframe/planejamento?aba=gerenciamento" />
          <h2 className="mt-2 text-lg font-semibold text-text">
            {obra.codigo && <span className="font-mono text-sm text-text-3 mr-2">{obra.codigo}</span>}
            {obra.nome}
          </h2>
        </div>
        <NovoLoteModal obraId={obraId} />
      </div>

      {lotes.length === 0 ? (
        <div className="card p-10 text-center text-sm text-text-3">
          Nenhum lote criado ainda para esta obra.
        </div>
      ) : (
        <div className="space-y-2">
          {lotes.map((lote, i) => (
            <LoteCard key={lote.id} lote={lote} obraId={obraId} defaultOpen={i === lotes.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

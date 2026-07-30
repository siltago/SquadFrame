import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { TruckIcon, ClockIcon, AlertTriangleIcon } from "@/ui/icons";
import { StatCard } from "@/modules/squadframe/components/stat-card";
import { STATUS_PED_LABEL } from "@/modules/squadframe/types/compras";

export const dynamic = "force-dynamic";

interface PedidoPrazoRow {
  id: string;
  numero: string;
  status: string;
  prazo_entrega: string | null;
  obra: { nome: string } | { nome: string }[] | null;
  fornecedor: { nome: string } | { nome: string }[] | null;
}

const rel = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

// "Em trânsito" = já emitido pro fornecedor mas ainda não recebido por completo.
const STATUS_EM_TRANSITO = ["EMITIDO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL"];

function diasParaPrazo(prazo: string | null): number | null {
  if (!prazo) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(prazo + "T00:00:00");
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function PrazoBadge({ prazo }: { prazo: string | null }) {
  const dias = diasParaPrazo(prazo);
  if (dias === null) {
    return <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-text-3">Sem prazo</span>;
  }
  if (dias < 0) {
    return <span className="inline-flex items-center rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold text-danger">Atrasado {Math.abs(dias)}d</span>;
  }
  if (dias === 0) {
    return <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">Chega hoje</span>;
  }
  if (dias <= 7) {
    return <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">Em {dias}d</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-text-2">Em {dias}d</span>;
}

export default async function ChegadasPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const admin = createAdminClient();

  const { data: pedidosRaw } = await admin
    .from("pedidos_compra")
    .select("id, numero, status, prazo_entrega, obra:obras(nome), fornecedor:fornecedores(nome)")
    .in("status", STATUS_EM_TRANSITO)
    .order("prazo_entrega", { ascending: true, nullsFirst: false });

  const pedidos = ((pedidosRaw ?? []) as unknown as PedidoPrazoRow[]).sort((a, b) => {
    if (!a.prazo_entrega) return 1;
    if (!b.prazo_entrega) return -1;
    return a.prazo_entrega.localeCompare(b.prazo_entrega);
  });

  const atrasados = pedidos.filter((p) => {
    const d = diasParaPrazo(p.prazo_entrega);
    return d !== null && d < 0;
  });
  const chegandoSemana = pedidos.filter((p) => {
    const d = diasParaPrazo(p.prazo_entrega);
    return d !== null && d >= 0 && d <= 7;
  });

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-soft text-primary-active">
          <TruckIcon size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chegadas</h1>
          <p className="text-sm text-text-3">Prazos de chegada de material em trânsito, direto dos pedidos do SquadFrame.</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Em trânsito" value={pedidos.length} sub="pedidos emitidos" icon={TruckIcon} />
        <StatCard label="Atrasados" value={atrasados.length} tone={atrasados.length > 0 ? "danger" : undefined} icon={AlertTriangleIcon} />
        <StatCard label="Chegando em 7 dias" value={chegandoSemana.length} tone={chegandoSemana.length > 0 ? "warning" : undefined} icon={ClockIcon} />
      </div>

      <div className="mt-6 card overflow-x-auto">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Material a caminho</h2>
          <span className="text-xs text-text-3">{pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-5 py-2 font-medium">Pedido</th>
              <th className="px-5 py-2 font-medium">Fornecedor</th>
              <th className="px-5 py-2 font-medium">Obra</th>
              <th className="px-5 py-2 font-medium">Situação</th>
              <th className="px-5 py-2 font-medium text-right">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-text-3">
                  Nenhum pedido em trânsito no momento.
                </td>
              </tr>
            ) : pedidos.map((p) => {
              const forn = rel(p.fornecedor);
              const obra = rel(p.obra);
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                  <td className="px-5 py-2.5">
                    <Link href={`/squadframe/compras/pedidos/${p.id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                      {p.numero}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-text-2">{forn?.nome ?? "—"}</td>
                  <td className="px-5 py-2.5 text-text-2">{obra?.nome ?? "—"}</td>
                  <td className="px-5 py-2.5 text-text-3 text-xs">{STATUS_PED_LABEL[p.status as keyof typeof STATUS_PED_LABEL] ?? p.status}</td>
                  <td className="px-5 py-2.5 text-right"><PrazoBadge prazo={p.prazo_entrega} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

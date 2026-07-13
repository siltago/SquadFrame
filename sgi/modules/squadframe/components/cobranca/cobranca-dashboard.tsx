import Link from "next/link";
import { Progress } from "@/ui/components/Progress";

export interface CobrancaKpis {
  pedidosAguardandoAprovacao: number;
  pedidosDiasMedio: number;
  solicitacoesAguardandoAprovacao: number;
  solicitacoesDiasMedio: number;
  cobrancasHojeSucesso: number;
  cobrancasHojeErro: number;
  pedidosPrazoVencido: number;
}

export interface LogRow {
  id: string;
  entidade: "pedido" | "solicitacao";
  destino_tipo: "individual" | "grupo";
  mensagem: string;
  sucesso: boolean;
  enviado_em: string;
}

export interface DiaAgregado {
  label: string;
  total: number;
  sucesso: number;
}

export interface ItemMaisCobrado {
  entidade: "pedido" | "solicitacao";
  entidade_id: string;
  numero: string;
  dias_cobrados: number;
}

function KpiCard({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: "warning" | "danger" }) {
  const cor = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-text";
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-text-3">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${cor}`}>{value}</p>
      {sub && <p className="text-xs text-text-3 mt-0.5">{sub}</p>}
    </div>
  );
}

export function CobrancaDashboard({
  periodoAtual,
  kpis,
  logsDiario,
  porDiaSemanal,
  porSemanaMensal,
  maisCobrados,
}: {
  periodoAtual: "diario" | "semanal" | "mensal";
  kpis: CobrancaKpis;
  logsDiario: LogRow[];
  porDiaSemanal: DiaAgregado[];
  porSemanaMensal: DiaAgregado[];
  maisCobrados: ItemMaisCobrado[];
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Cobrança de Prazos</h1>
      <p className="mt-1 text-sm text-text-2">
        Pedidos e solicitações parados em Aguardando Aprovação são cobrados diariamente (dias
        úteis) via WhatsApp.
      </p>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Pedidos aguard. aprovação"
          value={kpis.pedidosAguardandoAprovacao}
          sub={kpis.pedidosAguardandoAprovacao > 0 ? `${kpis.pedidosDiasMedio}d em média` : undefined}
        />
        <KpiCard
          label="Solicitações aguard. aprovação"
          value={kpis.solicitacoesAguardandoAprovacao}
          sub={kpis.solicitacoesAguardandoAprovacao > 0 ? `${kpis.solicitacoesDiasMedio}d em média` : undefined}
        />
        <KpiCard
          label="Cobranças enviadas hoje"
          value={kpis.cobrancasHojeSucesso}
          sub={kpis.cobrancasHojeErro > 0 ? `${kpis.cobrancasHojeErro} com erro` : "0 erros"}
          tone={kpis.cobrancasHojeErro > 0 ? "warning" : undefined}
        />
        <KpiCard
          label="Pedidos com prazo vencido"
          value={kpis.pedidosPrazoVencido}
          sub="Aguardando Recebimento"
          tone={kpis.pedidosPrazoVencido > 0 ? "danger" : undefined}
        />
      </div>

      {/* Sub-abas de período */}
      <div className="mt-8 flex gap-1 border-b border-border">
        {(["diario", "semanal", "mensal"] as const).map((p) => {
          const active = periodoAtual === p;
          const label = p === "diario" ? "Diário" : p === "semanal" ? "Semanal" : "Mensal";
          return (
            <Link
              key={p}
              href={`/squadframe?aba=cobranca&periodo=${p}`}
              className={
                active
                  ? "border-b-2 border-primary px-4 py-2.5 text-sm font-semibold text-text shrink-0"
                  : "px-4 py-2.5 text-sm font-medium text-text-3 hover:text-text-2 shrink-0"
              }
            >
              {label}
            </Link>
          );
        })}
      </div>

      {periodoAtual === "diario" && (
        <div className="mt-6 card overflow-x-auto">
          <div className="border-b border-border px-5 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Cobranças de hoje</h2>
            <span className="text-xs text-text-3">{logsDiario.length} envio{logsDiario.length !== 1 ? "s" : ""}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                <th className="px-5 py-2 font-medium">Entidade</th>
                <th className="px-5 py-2 font-medium">Destino</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium">Hora</th>
              </tr>
            </thead>
            <tbody>
              {logsDiario.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-text-3">
                    Nenhuma cobrança enviada hoje ainda.
                  </td>
                </tr>
              ) : logsDiario.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5 text-text-2">
                    {log.entidade === "pedido" ? "Pedido" : "Solicitação"}
                  </td>
                  <td className="px-5 py-2.5 text-text-2">
                    {log.destino_tipo === "grupo" ? "Grupo" : "Individual"}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={log.sucesso ? "text-success" : "text-danger"}>
                      {log.sucesso ? "Enviado" : "Erro"}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-text-3">
                    {new Date(log.enviado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {periodoAtual === "semanal" && (
        <div className="mt-6 card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text">Cobranças por dia útil (semana atual)</h2>
          {porDiaSemanal.every((d) => d.total === 0) ? (
            <p className="text-sm text-text-3">Nenhuma cobrança enviada nesta semana ainda.</p>
          ) : porDiaSemanal.map((d) => (
            <Progress
              key={d.label}
              label={`${d.label} — ${d.total} envio${d.total !== 1 ? "s" : ""}`}
              value={d.total === 0 ? 0 : d.sucesso}
              max={Math.max(d.total, 1)}
              variant={d.total > 0 && d.sucesso < d.total ? "warning" : "success"}
              showValue
            />
          ))}
        </div>
      )}

      {periodoAtual === "mensal" && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-text">Cobranças por semana (mês atual)</h2>
            {porSemanaMensal.every((s) => s.total === 0) ? (
              <p className="text-sm text-text-3">Nenhuma cobrança enviada neste mês ainda.</p>
            ) : porSemanaMensal.map((s) => (
              <Progress
                key={s.label}
                label={`${s.label} — ${s.total} envio${s.total !== 1 ? "s" : ""}`}
                value={s.total === 0 ? 0 : s.sucesso}
                max={Math.max(s.total, 1)}
                variant={s.total > 0 && s.sucesso < s.total ? "warning" : "success"}
                showValue
              />
            ))}
          </div>

          <div className="card">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-text">Mais cobrados no mês</h2>
            </div>
            <div className="divide-y divide-border">
              {maisCobrados.length === 0 ? (
                <p className="px-5 py-6 text-sm text-text-3 text-center">Nenhum item cobrado repetidamente ainda.</p>
              ) : maisCobrados.map((item) => (
                <Link
                  key={`${item.entidade}-${item.entidade_id}`}
                  href={
                    item.entidade === "pedido"
                      ? `/squadframe/compras/pedidos/${item.entidade_id}`
                      : `/squadframe/compras/solicitacoes`
                  }
                  className="flex items-center justify-between px-5 py-3 hover:bg-bg/50"
                >
                  <span className="text-sm font-medium text-primary">
                    {item.entidade === "pedido" ? "Pedido" : "Solicitação"} #{item.numero}
                  </span>
                  <span className="text-xs text-text-3">{item.dias_cobrados} dia(s) cobrado(s)</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

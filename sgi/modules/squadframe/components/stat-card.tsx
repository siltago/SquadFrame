export type StatCardTone = "success" | "warning" | "danger";

const TOM_VALOR: Record<StatCardTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

const TOM_CHIP: Record<StatCardTone, string> = {
  success: "border-success/30 text-success",
  warning: "border-warning/30 text-warning",
  danger: "border-danger/30 text-danger",
};

// Tile de KPI compartilhado — usado no dashboard de cobrança e no dashboard
// financeiro. Chip de ícone com borda fina (não bolha preenchida) e número
// grande em tabular-nums; cor só aparece quando o estado exige atenção
// (tone), nunca decorativa.
export function StatCard({
  label, value, sub, tone, icon: Icon,
}: {
  label: string; value: string | number; sub?: string; tone?: StatCardTone;
  icon: (p: { size?: number; className?: string }) => React.ReactNode;
}) {
  const corValor = tone ? TOM_VALOR[tone] : "text-text";
  const corChip = tone ? TOM_CHIP[tone] : "border-border text-text-3";
  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-3">{label}</p>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${corChip}`}>
          <Icon size={14} />
        </span>
      </div>
      <div>
        <p className={`text-[28px] font-bold leading-none tabular-nums ${corValor}`}>{value}</p>
        {sub && <p className="mt-1.5 text-xs text-text-3">{sub}</p>}
      </div>
    </div>
  );
}

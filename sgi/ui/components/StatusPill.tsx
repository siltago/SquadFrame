// Pill de status colorido a partir de uma cor hex (ex: mapas STATUS_*_COR de
// modules/squadframe/types/compras.ts) — usa a mesma fórmula de opacidade
// (cor + "20" de background, cor sólida no texto) repetida em Pedidos,
// Solicitações, Devoluções e no painel de lote.
export function StatusPill({
  cor,
  label,
  size = "sm",
}: {
  cor: string | undefined;
  label: string;
  size?: "xs" | "sm";
}) {
  const corFinal = cor ?? "#6b7280";
  return (
    <span
      className={`inline-flex items-center rounded-full text-xs font-medium ${size === "xs" ? "px-2 py-0.5" : "px-2.5 py-0.5"}`}
      style={{ backgroundColor: corFinal + "20", color: corFinal }}
    >
      {label}
    </span>
  );
}

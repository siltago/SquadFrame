// Classe do link de aba ativada por query param — repetida em
// cobranca/tab-nav.tsx (a de financeiro virou rail de ícones, ver
// financeiro/tab-nav.tsx). Pill arredondada com a mesma transição "bubble"
// usada no AppHeader, não sublinhado.
export function tabLinkClass(active: boolean): string {
  const base = "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-[var(--motion-hover)] ease-out hover:scale-[1.03] active:scale-[0.97]";
  return active
    ? `${base} bg-primary text-white shadow-sm`
    : `${base} text-text-3 hover:bg-surface-2 hover:text-text-2`;
}

// Classe do link de aba ativada por query param — repetida em
// cobranca/tab-nav.tsx e financeiro/tab-nav.tsx (3 ocorrências).
export function tabLinkClass(active: boolean): string {
  return active
    ? "border-b-2 border-primary px-4 py-2.5 text-sm font-semibold text-text shrink-0"
    : "px-4 py-2.5 text-sm font-medium text-text-3 hover:text-text-2 shrink-0";
}

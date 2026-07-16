import dynamic from "next/dynamic";
import { HeaderUser } from "@/modules/squadframe/components/header-user";
import type { UsuarioAtual } from "@/shared/auth/auth";

const ThemeToggle = dynamic(
  () => import("@/modules/squadframe/components/theme-toggle").then((m) => m.ThemeToggle),
  { ssr: false }
);

// Topbar fina da área de conteúdo — a identidade do módulo já está na
// sidebar (logo, nome), então aqui só vai o que é do usuário: tema e
// conta. Fundo usa --color-topbar (#4B0570, cor de marca fixa pedida
// explicitamente) — HeaderUser foi desenhado pra combinar com um
// cabeçalho colorido (mesmo par usado no AppHeader do Frame), texto
// branco fixo, não bg-surface claro. Ver seção 11 da spec de UI/UX.
export function SquadWiseTopbar({ usuario }: { usuario: UsuarioAtual }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-end gap-2 bg-topbar px-4 sm:px-6">
      <ThemeToggle />
      <HeaderUser usuario={usuario} />
    </div>
  );
}

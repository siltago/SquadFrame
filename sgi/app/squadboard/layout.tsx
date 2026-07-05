import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { SquadBoardSidebar } from "@/modules/squadboard/components/layout/sidebar";

// Shell do módulo SquadBoard — escopo de tema "squadboard" (paleta Quiet UI
// própria, não herda a cor do SquadFrame) + sidebar sempre escura fixa.
// Não herda header/sidebar do SquadFrame.
//
// Fase 4: o board deixou de ser uma entidade única (mock) — agora é uma
// visão agregada de todos os Pacotes de Trabalho (lotes_obra), por isso o
// título da sidebar é fixo em vez de vir de um "board" real.
export default async function SquadBoardLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  return (
    <div className="squadboard flex h-screen bg-bg text-text">
      <SquadBoardSidebar boardNome="SquadBoard" />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

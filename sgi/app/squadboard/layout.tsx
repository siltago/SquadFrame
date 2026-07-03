// Shell do módulo SquadBoard. Hoje é apenas um pass-through — não herda
// header/sidebar do SquadFrame. Existe para o módulo já ter um ponto de
// extensão próprio (nav, provedores específicos) quando crescer.
export default function SquadBoardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

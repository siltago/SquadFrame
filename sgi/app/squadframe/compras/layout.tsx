import { ComprasSidebar } from "@/modules/squadframe/components/compras-sidebar";

export default function ComprasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "calc(100dvh - 56px - env(safe-area-inset-top))" }}>
      <ComprasSidebar />
      {/* Rail do menu é fixed (mesmo padrão do FinanceiroTabNav), não ocupa
          espaço no fluxo — o conteúdo precisa desse padding pra não ficar
          embaixo dele. */}
      <div className="h-full overflow-y-auto lg:pl-20">{children}</div>
    </div>
  );
}

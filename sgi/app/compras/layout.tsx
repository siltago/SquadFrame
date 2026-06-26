import { ComprasSidebar } from "@/components/compras-sidebar";

export default function ComprasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex" style={{ height: "calc(100dvh - 56px - env(safe-area-inset-top))" }}>
      <ComprasSidebar />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

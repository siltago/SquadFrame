import { ComprasSidebar } from "@/components/compras-sidebar";

export default function ComprasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-56px)]">
      <ComprasSidebar />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

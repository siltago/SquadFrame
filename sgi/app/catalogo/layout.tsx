import { createAdminClient } from "@/lib/supabase-admin";
import { CatalogoSidebar } from "@/components/catalogo-sidebar";

export default async function CatalogoLayout({ children }: { children: React.ReactNode }) {
  const supabase = createAdminClient();
  const { data: tipos } = await supabase
    .from("tipos_linha")
    .select("id, nome, slug")
    .order("ordem");

  return (
    <div className="flex" style={{ height: "calc(100dvh - 56px - env(safe-area-inset-top))" }}>
      <CatalogoSidebar tipos={tipos ?? []} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

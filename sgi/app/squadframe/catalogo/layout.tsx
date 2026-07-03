import { createAdminClient } from "@/shared/database/supabase-admin";
import { CatalogoSidebar } from "@/modules/squadframe/components/catalogo-sidebar";

export default async function CatalogoLayout({ children }: { children: React.ReactNode }) {
  const supabase = createAdminClient();
  const [{ data: tipos }, { data: linhas }] = await Promise.all([
    supabase.from("tipos_linha").select("id, nome, slug").order("ordem"),
    supabase.from("linhas").select("id, nome, tipo").eq("ativo", true).order("nome"),
  ]);

  return (
    <div className="flex" style={{ height: "calc(100dvh - 56px - env(safe-area-inset-top))" }}>
      <CatalogoSidebar tipos={tipos ?? []} linhas={linhas ?? []} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

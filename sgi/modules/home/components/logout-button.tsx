"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/shared/database/supabase-client";
import { LogoutIcon } from "@/ui/icons";

export function LogoutButton({ nome }: { nome: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
      title="Sair"
    >
      <span className="hidden sm:inline">{nome.split(" ")[0]}</span>
      <LogoutIcon size={15} />
    </button>
  );
}

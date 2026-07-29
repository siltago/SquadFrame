import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { NovaMovimentacaoForm } from "@/modules/squadstock/components/nova-movimentacao-form";

export const dynamic = "force-dynamic";

export default async function NovaMovimentacaoPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const podeGerenciar =
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes(STOCK_PERMISSIONS.MOVIMENTACAO_GERENCIAR);
  if (!podeGerenciar) redirect("/squadstock");

  const admin = createAdminClient();
  const [{ data: obras }, { data: produtos }] = await Promise.all([
    admin.from("obras").select("id, nome").order("nome").limit(200),
    admin.from("produtos").select("id, codigo_mestre, nome").eq("status", true).order("nome").limit(500),
  ]);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Nova movimentação</h1>
      <p className="text-sm text-text-3 mt-1">Registre uma saída (consumo) ou um ajuste de saldo.</p>

      <NovaMovimentacaoForm obras={obras ?? []} produtos={produtos ?? []} />
    </div>
  );
}

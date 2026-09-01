import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { caminhoLocal, type LocalNo } from "@/modules/squadstock/lib/caminho-local";
import { calcularSugestoesFrequencia, FREQUENCIA_LABEL } from "@/modules/squadstock/services/frequencia-contagem";
import { NovaContagemForm } from "@/modules/squadstock/components/contagens/nova-contagem-form";

export const dynamic = "force-dynamic";

export default async function NovaContagemPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const podeGerenciar =
    usuario.permissoes?.includes("*") || usuario.permissoes?.includes(STOCK_PERMISSIONS.CONTAGEM_GERENCIAR);
  if (!podeGerenciar) redirect("/squadstock/contagens");

  const admin = createAdminClient();
  const [{ data: locais }, { data: tiposList }, { data: linhas }, sugestoes] = await Promise.all([
    admin.from("stock_locais").select("id, nome, parent_id, ordem").eq("ativo", true).eq("especial", false).order("ordem"),
    admin.from("tipos_linha").select("id, nome, slug").order("ordem"),
    admin.from("linhas").select("id, nome, tipo").order("nome"),
    calcularSugestoesFrequencia(admin),
  ]);

  // Monta o path completo pra cada local — mostrado no <select> pra deixar
  // claro em qual ramo da árvore a contagem vai atuar (ex: "Galpão A ›
  // Corredor 2 › Prateleira 3"), junto com a sugestão de frequência (Fase 3).
  const porId = new Map<string, LocalNo>((locais ?? []).map((l) => [l.id, l]));
  const locaisComCaminho = (locais ?? [])
    .map((l) => ({
      id: l.id,
      caminho: caminhoLocal(porId, l.id),
      sugestaoFrequencia: sugestoes.get(l.id)?.movimentacoes90d ? FREQUENCIA_LABEL[sugestoes.get(l.id)!.frequencia] : null,
    }))
    .sort((a, b) => a.caminho.localeCompare(b.caminho));

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">Nova contagem</h1>
      <p className="mt-1 text-sm text-text-3">
        Escolha um nó do mapa de estoque — a contagem cobre todos os sub-níveis (folhas) dele.
      </p>

      <NovaContagemForm locais={locaisComCaminho} tipos={tiposList ?? []} linhas={linhas ?? []} />
    </div>
  );
}

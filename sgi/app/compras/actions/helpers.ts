import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export async function getUsuarioId(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const admin = createAdminClient();
  const { data } = await admin.from("usuarios").select("id").eq("auth_id", user.id).single();
  return data?.id as string;
}

export async function getUsuario(): Promise<{ id: string; setor_id: string | null; nome: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const admin = createAdminClient();
  const { data } = await admin
    .from("usuarios")
    .select("id, setor_id, nome")
    .eq("auth_id", user.id)
    .single();
  return data as { id: string; setor_id: string | null; nome: string };
}

export async function gerarNumeroPedido(
  admin: ReturnType<typeof createAdminClient>,
): Promise<string> {
  // Usa sequence PostgreSQL — atômica, sem race condition, sem bug de ordenação textual
  const { data, error } = await admin.rpc("gerar_numero_pedido");
  if (error) throw new Error(`Falha ao gerar número de pedido: ${error.message}`);
  return data as string;
}

export function enriquecerItensChapa<T extends {
  unidade?: string;
  largura_m?: number | null;
  altura_m?: number | null;
  qtd_pecas?: number | null;
  descricao_snapshot: string;
}>(itens: T[]): T[] {
  return itens.map((i) => {
    const chapa = ["CHAPA", "M2", "M²"].includes((i.unidade ?? "").toUpperCase());
    if (chapa && i.largura_m && i.altura_m) {
      const lMm = Math.round(i.largura_m * 1000);
      const aMm = Math.round(i.altura_m * 1000);
      const qtd = i.qtd_pecas ?? 1;
      return { ...i, descricao_snapshot: `${i.descricao_snapshot} — ${qtd}× ${lMm}L × ${aMm}A mm` };
    }
    return i;
  });
}

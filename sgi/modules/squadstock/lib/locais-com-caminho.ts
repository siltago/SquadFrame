import type { createAdminClient } from "@/shared/database/supabase-admin";
import { caminhoLocal, type LocalNo } from "./caminho-local";

type Admin = ReturnType<typeof createAdminClient>;

export interface LocalComCaminho {
  id: string;
  caminho: string;
}

// Busca todos os locais com o path completo já montado (ex: "Galpão A ›
// Corredor 2 › Prateleira 3"). Existe porque a Fase 1 (mapa hierárquico)
// derrubou a UNIQUE(nome) global — duas prateleiras diferentes agora podem
// se chamar "Nível 1" — então qualquer <select>/coluna de tabela que ainda
// mostrasse só `nome` ficou ambíguo: duas opções com o mesmo texto e
// nenhuma forma de saber qual é qual. Todo lugar que lista locais pro
// usuário (filtro de movimentações, formulário de nova movimentação, etc.)
// deve usar isso em vez de `select("id, nome")` cru.
export async function buscarLocaisComCaminho(admin: Admin, opts?: { apenasAtivos?: boolean }): Promise<LocalComCaminho[]> {
  let q = admin.from("stock_locais").select("id, nome, parent_id, ativo");
  if (opts?.apenasAtivos !== false) q = q.eq("ativo", true);
  const { data } = await q;

  const porId = new Map<string, LocalNo>((data ?? []).map((l) => [l.id, l]));
  return (data ?? [])
    .map((l) => ({ id: l.id, caminho: caminhoLocal(porId, l.id) }))
    .sort((a, b) => a.caminho.localeCompare(b.caminho));
}

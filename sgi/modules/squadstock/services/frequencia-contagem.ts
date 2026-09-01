import type { createAdminClient } from "@/shared/database/supabase-admin";

type Admin = ReturnType<typeof createAdminClient>;

// Heurística de 1ª versão pra "quanto vale a pena contar esse nível" — não
// é uma regra definitiva, é uma sugestão explicável exibida na UI.
// Ideia: locais com mais movimentação (entrada+saída+ajuste) desregulam o
// saldo físico mais rápido, então valem uma contagem mais frequente; locais
// parados podem esperar mais. A contagem de movimentações de cada
// nó-folha sobe pra cima na hierarquia (nó pai = soma de todos os
// descendentes), assim um "Galpão A" concentra a atividade de todas as
// suas prateleiras, mesmo sem ter saldo direto nele.
const JANELA_DIAS = 90;

export type FrequenciaSugerida = "SEMANAL" | "QUINZENAL" | "MENSAL" | "TRIMESTRAL";

export const FREQUENCIA_LABEL: Record<FrequenciaSugerida, string> = {
  SEMANAL: "Semanal",
  QUINZENAL: "Quinzenal",
  MENSAL: "Mensal",
  TRIMESTRAL: "Trimestral",
};

export interface SugestaoNo {
  movimentacoes90d: number;
  frequencia: FrequenciaSugerida;
}

// Faixas calibradas pra uma operação pequena/média (dezenas de locais) —
// ajustar aqui conforme o volume real de movimentações observado depois de
// um tempo em produção. Não é ciência exata, é um ponto de partida honesto.
function faixaFrequencia(movimentacoes: number): FrequenciaSugerida {
  if (movimentacoes >= 60) return "SEMANAL"; // ~1 mov./dia útil ou mais
  if (movimentacoes >= 20) return "QUINZENAL";
  if (movimentacoes >= 5) return "MENSAL";
  return "TRIMESTRAL";
}

// Calcula a sugestão pra TODOS os nós ativos da árvore de uma vez (uma
// query de árvore + uma query de movimentações, nada por nó) — pensado pra
// rodar uma vez por carregamento de página (mapa ou nova contagem), não um
// cron: no volume esperado (dezenas/poucas centenas de locais) o cálculo
// on-demand é barato; revisitar só se isso pesar na prática.
export async function calcularSugestoesFrequencia(admin: Admin): Promise<Map<string, SugestaoNo>> {
  const [{ data: locais }, { data: movimentacoes }] = await Promise.all([
    admin.from("stock_locais").select("id, parent_id").eq("ativo", true).eq("especial", false),
    admin
      .from("stock_movimentacoes")
      .select("local_id")
      .gte("criado_em", new Date(Date.now() - JANELA_DIAS * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const porPai = new Map<string, string[]>();
  (locais ?? []).forEach((l) => {
    if (l.parent_id) {
      const arr = porPai.get(l.parent_id) ?? [];
      arr.push(l.id);
      porPai.set(l.parent_id, arr);
    }
  });

  const movimentacoesPorLocal = new Map<string, number>();
  for (const m of movimentacoes ?? []) {
    movimentacoesPorLocal.set(m.local_id, (movimentacoesPorLocal.get(m.local_id) ?? 0) + 1);
  }

  const cache = new Map<string, number>();
  function somarSubarvore(id: string): number {
    const cacheado = cache.get(id);
    if (cacheado !== undefined) return cacheado;
    let total = movimentacoesPorLocal.get(id) ?? 0;
    for (const filhoId of porPai.get(id) ?? []) total += somarSubarvore(filhoId);
    cache.set(id, total);
    return total;
  }

  const resultado = new Map<string, SugestaoNo>();
  for (const l of locais ?? []) {
    const total = somarSubarvore(l.id);
    resultado.set(l.id, { movimentacoes90d: total, frequencia: faixaFrequencia(total) });
  }
  return resultado;
}

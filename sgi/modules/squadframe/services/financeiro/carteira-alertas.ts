import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";

export interface SaldoFornecedor {
  fornecedorId: string;
  fornecedor: string;
  saldo: number;
  totalDepositado: number;
  qtdObras: number;
}

const nomeRelacao = (v: any) => (Array.isArray(v) ? v[0]?.nome : v?.nome) ?? "—";

// Um fornecedor pode ter uma carteira por obra — a saúde financeira dele é
// avaliada de forma agregada (soma de todas as obras, mesmo critério de
// confirmar_debito_carteira), não carteira por carteira, senão uma obra com
// saldo baixo isolada dispararia alerta mesmo com o fornecedor bem
// provisionado no total. "totalDepositado" aproxima "o que ele já teve" —
// não existe coluna de saldo inicial/pico no schema (saldo_atual tem CHECK
// >= 0), então é a soma de todos os depósitos históricos daquele fornecedor.
export async function listarSaldosPorFornecedor(
  admin: ReturnType<typeof createAdminClient>,
): Promise<SaldoFornecedor[]> {
  const [{ data: carteirasData }, { data: depositosData }] = await Promise.all([
    admin.from("carteiras").select("id, fornecedor_id, saldo_atual, fornecedor:fornecedores(nome)"),
    admin.from("carteira_movimentacoes").select("carteira_id, valor").eq("tipo", "DEPOSITO"),
  ]);

  const totalDepositadoPorCarteira = new Map<string, number>();
  for (const m of depositosData ?? []) {
    totalDepositadoPorCarteira.set(m.carteira_id, (totalDepositadoPorCarteira.get(m.carteira_id) ?? 0) + m.valor);
  }

  const porFornecedor = new Map<string, SaldoFornecedor>();
  for (const c of (carteirasData ?? []) as any[]) {
    const chave = c.fornecedor_id as string;
    if (!porFornecedor.has(chave)) {
      porFornecedor.set(chave, { fornecedorId: chave, fornecedor: nomeRelacao(c.fornecedor), saldo: 0, totalDepositado: 0, qtdObras: 0 });
    }
    const acumulado = porFornecedor.get(chave)!;
    acumulado.saldo += c.saldo_atual as number;
    acumulado.totalDepositado += totalDepositadoPorCarteira.get(c.id) ?? 0;
    acumulado.qtdObras += 1;
  }

  return [...porFornecedor.values()].sort((a, b) => a.saldo - b.saldo);
}

// Saldo zerado ou abaixo de 25% do total já depositado — mesmo limiar usado
// nos destaques do dashboard inicial.
export function filtrarSaldoBaixo(saldos: SaldoFornecedor[]): SaldoFornecedor[] {
  return saldos.filter((c) => c.saldo <= 0 || (c.totalDepositado > 0 && c.saldo < c.totalDepositado * 0.25));
}

import { createAdminClient } from "@/lib/supabase-admin";
import { criarFormaPagamento } from "@/app/compras/actions";
import { FormasPagamentoLista } from "./formas-lista";

export const dynamic = "force-dynamic";

export default async function FormasPagamentoPage() {
  const admin = createAdminClient();
  const { data: formas } = await admin
    .from("formas_pagamento")
    .select("*")
    .order("nome");

  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Formas de Pagamento</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Defina os métodos disponíveis para seleção nos pedidos de compra.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Form */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ink-faint">Nova forma</h2>
          <form action={criarFormaPagamento} className="card p-5 space-y-4">
            <div>
              <label className="label">Nome <span className="text-red-500">*</span></label>
              <input
                name="nome" required className="field"
                placeholder="Ex: Faturamento 30 dias, PIX, Boleto…"
              />
            </div>
            <div>
              <label className="label">Descrição <span className="text-ink-faint font-normal">(opcional)</span></label>
              <input name="descricao" className="field" placeholder="Detalhes adicionais" />
            </div>
            <button type="submit" className="btn-primary w-full">Adicionar</button>
          </form>
        </div>

        {/* Lista com modo excluir */}
        <div>
          <FormasPagamentoLista formas={(formas ?? []) as any} />
        </div>
      </div>
    </div>
  );
}

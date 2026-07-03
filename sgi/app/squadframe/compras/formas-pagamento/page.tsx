import { createAdminClient } from "@/shared/database/supabase-admin";
import { criarFormaPagamento } from "@/app/squadframe/compras/actions";
import { FormasPagamentoLista } from "@/modules/squadframe/components/compras/formas-lista";
import { NovaFormaForm } from "@/modules/squadframe/components/compras/nova-forma-form";

export const dynamic = "force-dynamic";

export default async function FormasPagamentoPage() {
  const admin = createAdminClient();
  const { data: formas } = await admin
    .from("formas_pagamento")
    .select("id, nome, descricao, ativo, is_faturamento_direto")
    .order("nome");

  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Formas de Pagamento</h1>
      <p className="mt-1 text-sm text-text-2">
        Defina os métodos disponíveis para seleção nos pedidos de compra.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Form */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-text-3">Nova forma</h2>
          <NovaFormaForm />
        </div>

        {/* Lista com modo excluir */}
        <div>
          <FormasPagamentoLista formas={(formas ?? []) as any} />
        </div>
      </div>
    </div>
  );
}

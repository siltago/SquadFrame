import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { criarContrato } from "@/modules/squadframe/actions/compras/contratos";
import { Button } from "@/ui/components/Button";

export const dynamic = "force-dynamic";

export default async function NovoContratoPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) notFound();

  const podeContratos = !!(usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.FINANCEIRO_CONTRATO_GERENCIAR));
  if (!podeContratos) notFound();

  const admin = createAdminClient();
  const { data: obras } = await admin.from("obras").select("id, nome, codigo").is("deleted_at", null).order("nome");

  return (
    <div className="px-8 py-8 max-w-2xl">
      <BackButton href="/squadframe/financeiro/contratos" />
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Novo contrato</h1>
      <p className="mt-1 text-sm text-text-2">
        Só gerencia valores — depois de criado, defina os destinos (abas do catálogo) e a alocação
        por fornecedor dentro de cada destino.
      </p>

      <form action={criarContrato} className="card mt-6 max-w-xl p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="label">Obra <span className="text-danger">*</span></label>
            <select name="obra_id" required defaultValue="" className="field">
              <option value="" disabled>Selecione uma obra</option>
              {(obras ?? []).map((o) => (
                <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Número do contrato <span className="text-danger">*</span></label>
            <input name="numero" required className="field" placeholder="Ex: CT-2026-014" />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Valor total <span className="text-danger">*</span></label>
            <input name="valor_total" type="number" step="0.01" min="0.01" required className="field" placeholder="Ex: 1000000.00" />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Descrição <span className="text-text-3 font-normal">(opcional)</span></label>
            <textarea name="descricao" rows={3} className="field" placeholder="Observações sobre o contrato" />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button type="submit">Criar contrato</Button>
        </div>
      </form>
    </div>
  );
}

import Link from "next/link";
import { criarObra } from "../actions";
import { BackButton } from "@/components/back-button";

export const dynamic = "force-dynamic";

export default async function NovaObraPage() {

  return (
    <div className="px-8 py-8">
      <BackButton href="/obras" />

      <h1 className="mt-4 text-2xl font-bold tracking-tight">Nova obra</h1>
      <p className="mt-1 text-sm text-ink-soft">
        O código interno é gerado automaticamente ao salvar.
      </p>

      <form action={criarObra} className="card mt-6 max-w-2xl p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome da obra</label>
            <input name="nome" required className="field" placeholder="Ex: Fachada Edifício Valmet" />
          </div>

          <div>
            <label className="label">Cliente</label>
            <input name="cliente_nome" required className="field" placeholder="Nome do cliente" />
          </div>

          <div>
            <label className="label">Status inicial</label>
            <select name="status_nome" required className="field">
              <option value="Orçamento">Orçamento</option>
              <option value="Contratada">Contratada</option>
              <option value="Engenharia">Engenharia</option>
              <option value="Produção">Produção</option>
              <option value="Expedição">Expedição</option>
              <option value="Instalação">Instalação</option>
              <option value="Concluída">Concluída</option>
              <option value="Suspensa">Suspensa</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="label">Endereço <span className="text-ink-soft font-normal">(opcional)</span></label>
            <input name="endereco" className="field" placeholder="Rua, número" />
          </div>

          <div>
            <label className="label">Cidade <span className="text-ink-soft font-normal">(opcional)</span></label>
            <input name="cidade" className="field" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">UF <span className="text-ink-soft font-normal">(opcional)</span></label>
              <input name="estado" maxLength={2} className="field uppercase" placeholder="SP" />
            </div>
            <div>
              <label className="label">CEP <span className="text-ink-soft font-normal">(opcional)</span></label>
              <input name="cep" className="field" placeholder="00000-000" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="label">Observações</label>
            <textarea name="observacoes" rows={3} className="field" />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="submit" className="btn-primary">Salvar obra</button>
          <Link href="/obras" className="btn-ghost">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}

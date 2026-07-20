import { createAdminClient } from "@/shared/database/supabase-admin";
import { criarFornecedor } from "@/app/squadframe/compras/actions";
import { FornecedoresLista } from "@/modules/squadframe/components/compras/fornecedores-lista";
import { Button } from "@/ui/components/Button";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

export const dynamic = "force-dynamic";

export default async function FornecedoresPage() {
  const admin = createAdminClient();
  const [{ data: fornecedores }, { data: tiposLinha }] = await Promise.all([
    admin.from("fornecedores").select("id, nome, razao_social, cnpj, email, telefone, contato, ativo, tipos, endereco, numero, bairro, cidade, estado, cep").order("nome"),
    admin.from("tipos_linha").select("nome, slug").order("ordem"),
  ]);

  const tipos = tiposLinha ?? [];

  return (
    <div className="px-8 py-8">
      <RealtimeRefresher channelName="compras-fornecedores" subs={[{ table: "fornecedores" }]} />
      <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-text-3">Novo fornecedor</h2>
          <form action={criarFornecedor} className="card p-5 space-y-4">
            <div>
              <label className="label">Nome Fantasia <span className="text-danger">*</span></label>
              <input name="nome" required className="field" placeholder="Nome fantasia ou comercial" />
            </div>
            <div>
              <label className="label">Razão Social</label>
              <input name="razao_social" className="field" placeholder="Razão social completa" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">CNPJ</label>
                <input name="cnpj" className="field" placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input name="telefone" className="field" placeholder="(11) 99999-0000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">E-mail</label>
                <input name="email" type="email" className="field" />
              </div>
              <div>
                <label className="label">Contato</label>
                <input name="contato" className="field" placeholder="Nome do responsável" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="label">Endereço</label>
                <input name="endereco" className="field" placeholder="Rua, Av." />
              </div>
              <div>
                <label className="label">Número</label>
                <input name="numero" className="field" placeholder="123" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">CEP</label>
                <input name="cep" className="field" placeholder="00000-000" />
              </div>
              <div>
                <label className="label">Cidade</label>
                <input name="cidade" className="field" />
              </div>
              <div>
                <label className="label">Estado</label>
                <input name="estado" className="field" placeholder="SP" maxLength={2} />
              </div>
            </div>
            {tipos.length > 0 && (
              <div>
                <label className="label">Fornece para</label>
                <div className="mt-1 flex flex-wrap gap-3">
                  {tipos.map((t) => (
                    <label key={t.slug} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" name="tipos" value={t.slug} className="rounded" />
                      {t.nome}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-text-3">
                  Tipos de produtos que este fornecedor vende
                </p>
              </div>
            )}
            <Button type="submit" className="w-full">Cadastrar fornecedor</Button>
          </form>
        </div>

        <div>
          <FornecedoresLista
            fornecedores={(fornecedores ?? []) as any}
            tiposLinha={tipos}
          />
        </div>
      </div>
    </div>
  );
}

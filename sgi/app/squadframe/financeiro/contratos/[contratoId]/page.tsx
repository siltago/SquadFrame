import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";
import { criarContratoDestino, criarContratoAlocacao } from "@/modules/squadframe/actions/compras/contratos";
import { Button } from "@/ui/components/Button";
import { ServerActionForm } from "@/ui/components/ServerActionForm";

export const dynamic = "force-dynamic";

function formatarValor(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ContratoDetalhePage({ params }: { params: { contratoId: string } }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) notFound();

  const podeContratos = !!(usuario.permissoes?.includes("*") || usuario.permissoes?.includes(PERMISSIONS.FINANCEIRO_CONTRATO_GERENCIAR));
  if (!podeContratos) notFound();

  const admin = createAdminClient();

  const [{ data: contrato }, { data: tiposLinha }, { data: fornecedores }] = await Promise.all([
    admin.from("contratos").select("id, numero, valor_total, descricao, criado_em, obra:obras(id, nome, codigo)").eq("id", params.contratoId).single(),
    admin.from("tipos_linha").select("nome, slug").order("ordem"),
    admin.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  if (!contrato) notFound();

  const { data: destinos } = await admin
    .from("contrato_destinos")
    .select("id, tipo_linha, valor, alocacoes:contrato_fornecedor_alocacoes(id, valor, fornecedor:fornecedores(id, nome))")
    .eq("contrato_id", params.contratoId)
    .order("criado_em");

  type Alocacao = { id: string; valor: number; fornecedor: { id: string; nome: string } | { id: string; nome: string }[] | null };
  type Destino = { id: string; tipo_linha: string; valor: number; alocacoes: Alocacao[] };
  const destinosRows = (destinos ?? []) as unknown as Destino[];

  const obraRaw = contrato.obra as { id: string; nome: string; codigo: string } | { id: string; nome: string; codigo: string }[] | null;
  const obra = Array.isArray(obraRaw) ? obraRaw[0] : obraRaw;

  const valorJaDestinado = destinosRows.reduce((acc, d) => acc + Number(d.valor), 0);
  const tiposJaUsados = new Set(destinosRows.map((d) => d.tipo_linha));
  const tiposDisponiveis = (tiposLinha ?? []).filter((t) => !tiposJaUsados.has(t.slug));

  return (
    <div className="px-8 py-8 max-w-4xl">
      <RealtimeRefresher
        channelName={`financeiro-contrato-${params.contratoId}`}
        subs={[
          { table: "contrato_destinos", filter: `contrato_id=eq.${params.contratoId}` },
          { table: "contrato_fornecedor_alocacoes" },
        ]}
      />
      <BackButton href="/squadframe/financeiro/contratos" />

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contrato {contrato.numero}</h1>
          <p className="mt-1 text-sm text-text-2">
            {obra ? `${obra.codigo} — ${obra.nome}` : "—"} · Valor total {formatarValor(contrato.valor_total)}
          </p>
          {contrato.descricao && <p className="mt-1 text-sm text-text-3">{contrato.descricao}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-text-3 uppercase tracking-wide">Destinado</p>
          <p className="text-lg font-bold">{formatarValor(valorJaDestinado)} <span className="text-sm font-normal text-text-3">/ {formatarValor(contrato.valor_total)}</span></p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {destinosRows.map((d) => {
          const jaAlocado = d.alocacoes.reduce((acc, a) => acc + Number(a.valor), 0);
          const tipoNome = (tiposLinha ?? []).find((t) => t.slug === d.tipo_linha)?.nome ?? d.tipo_linha;
          const fornecedoresJaAlocados = new Set(
            d.alocacoes.map((a) => (Array.isArray(a.fornecedor) ? a.fornecedor[0]?.id : a.fornecedor?.id)),
          );
          const fornecedoresDisponiveis = (fornecedores ?? []).filter((f) => !fornecedoresJaAlocados.has(f.id));

          return (
            <div key={d.id} className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-text">{tipoNome}</h2>
                <p className="text-sm text-text-2">
                  {formatarValor(jaAlocado)} <span className="text-text-3">/ {formatarValor(d.valor)}</span>
                </p>
              </div>

              {d.alocacoes.length > 0 && (
                <div className="mt-4 divide-y divide-border border-t border-border">
                  {d.alocacoes.map((a) => {
                    const f = Array.isArray(a.fornecedor) ? a.fornecedor[0] : a.fornecedor;
                    return (
                      <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                        <span>{f?.nome ?? "—"}</span>
                        <span className="font-medium">{formatarValor(a.valor)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {jaAlocado < d.valor && fornecedoresDisponiveis.length > 0 && (
                <ServerActionForm action={criarContratoAlocacao.bind(null, params.contratoId, d.id)} className="mt-4 flex items-end gap-3 border-t border-border pt-4">
                  <div className="flex-1">
                    <label className="label">Fornecedor</label>
                    <select name="fornecedor_id" required defaultValue="" className="field">
                      <option value="" disabled>Selecione</option>
                      {fornecedoresDisponiveis.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </div>
                  <div className="w-40">
                    <label className="label">Valor</label>
                    <input name="valor" type="number" step="0.01" min="0.01" max={d.valor - jaAlocado} required className="field" />
                  </div>
                  <Button type="submit" size="sm">Alocar</Button>
                </ServerActionForm>
              )}
            </div>
          );
        })}

        {destinosRows.length === 0 && (
          <p className="text-sm text-text-3">Nenhum destino cadastrado ainda.</p>
        )}

        {valorJaDestinado < contrato.valor_total && tiposDisponiveis.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-text">Novo destino</h2>
            <p className="mt-1 text-xs text-text-3">Restam {formatarValor(contrato.valor_total - valorJaDestinado)} sem destino.</p>
            <ServerActionForm action={criarContratoDestino.bind(null, params.contratoId)} className="mt-4 flex items-end gap-3">
              <div className="flex-1">
                <label className="label">Aba do catálogo</label>
                <select name="tipo_linha" required defaultValue="" className="field">
                  <option value="" disabled>Selecione</option>
                  {tiposDisponiveis.map((t) => <option key={t.slug} value={t.slug}>{t.nome}</option>)}
                </select>
              </div>
              <div className="w-40">
                <label className="label">Valor</label>
                <input name="valor" type="number" step="0.01" min="0.01" max={contrato.valor_total - valorJaDestinado} required className="field" />
              </div>
              <Button type="submit" size="sm">Adicionar</Button>
            </ServerActionForm>
          </div>
        )}
      </div>
    </div>
  );
}

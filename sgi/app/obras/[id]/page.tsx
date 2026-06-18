import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient as createClient } from "@/lib/supabase-admin";
import { StatusBadge } from "@/components/status-badge";
import { AbaProducao } from "./aba-producao";
import { BackButton } from "@/components/back-button";
import { STATUS_PED_COR, STATUS_PED_LABEL } from "@/types/compras";

/*
  SQL — rodar no Supabase para ativar a aba Produção:

  CREATE TABLE tipologias_obra (
    id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id    uuid         NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    nome       varchar(200) NOT NULL,
    quantidade int          NOT NULL DEFAULT 1,
    criado_em  timestamptz  NOT NULL DEFAULT now()
  );
*/

export const dynamic = "force-dynamic";

const ABAS = [
  { label: "Resumo",     slug: "resumo" },
  { label: "Pedidos",    slug: "pedidos" },
  { label: "Produção",   slug: "producao" },
  { label: "Compras",    slug: "compras" },
  { label: "Tarefas",    slug: "tarefas" },
  { label: "Documentos", slug: "documentos" },
  { label: "Histórico",  slug: "historico" },
];

export default async function ObraDetalhePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { aba?: string };
}) {
  const abaAtiva = searchParams.aba ?? "resumo";
  const supabase = createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select(
      `*, numero, cliente:clientes(nome, documento),
       status:obra_status(nome, cor)`
    )
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (!obra) notFound();

  let historico: Array<{ acao: string; motivo: string | null; criado_em: string }> | null = null;
  let tipologias: Array<{ id: string; nome: string; quantidade: number }> | null = null;
  let pedidos: any[] | null = null;

  if (abaAtiva === "resumo") {
    const { data } = await supabase
      .from("obra_historico")
      .select("acao, motivo, criado_em")
      .eq("obra_id", params.id)
      .order("criado_em", { ascending: false });
    historico = data;
  }

  if (abaAtiva === "producao") {
    const { data, error } = await supabase
      .from("tipologias_obra")
      .select("id, nome, quantidade")
      .eq("obra_id", params.id)
      .order("nome", { ascending: true });
    if (error) console.error("[tipologias_obra] erro ao buscar:", error);
    tipologias = data;
  }

  if (abaAtiva === "pedidos") {
    const { data } = await supabase
      .from("pedidos_compra")
      .select("id, numero, status, tipo_linha, criado_em, fornecedor:fornecedores(nome), comprador:usuarios(nome)")
      .eq("obra_id", params.id)
      .order("criado_em", { ascending: false });
    pedidos = data ?? [];
  }

  const obraNumero = obra.numero ? String(obra.numero).padStart(4, "0") : null;

  return (
    <div className="px-8 py-8">
      <BackButton href="/obras" />

      {/* Cabeçalho da obra */}
      <div className="mt-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            {obraNumero && (
              <span className="font-mono text-sm font-bold text-steel">{obraNumero}</span>
            )}
            <span className="font-mono text-xs font-medium text-ink-faint">{obra.codigo}</span>
            {obra.status && (
              <StatusBadge nome={obra.status.nome} cor={obra.status.cor} />
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{obra.nome}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {obra.cliente?.nome}
            {obra.cidade ? ` · ${obra.cidade}/${obra.estado ?? ""}` : ""}
          </p>
        </div>
        {abaAtiva === "pedidos" && (
          <Link
            href={`/compras/pedidos/novo?obra_id=${params.id}`}
            className="btn-primary"
          >
            Novo pedido
          </Link>
        )}
      </div>

      {/* Abas */}
      <div className="mt-6 flex gap-1 border-b border-line overflow-x-auto">
        {ABAS.map(({ label, slug }) => (
          <Link
            key={slug}
            href={`/obras/${params.id}?aba=${slug}`}
            className={
              abaAtiva === slug
                ? "shrink-0 border-b-2 border-steel px-4 py-2.5 text-sm font-medium text-ink"
                : "shrink-0 px-4 py-2.5 text-sm font-medium text-ink-faint hover:text-ink-soft"
            }
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Aba: Resumo */}
      {abaAtiva === "resumo" && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2">
            <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Dados principais
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Campo rotulo="Cliente" valor={obra.cliente?.nome} />
              <Campo rotulo="Documento" valor={obra.cliente?.documento} />
              <Campo rotulo="Endereço" valor={obra.endereco} />
              <Campo
                rotulo="Cidade / UF"
                valor={obra.cidade ? `${obra.cidade}/${obra.estado ?? ""}` : null}
              />
              <Campo rotulo="CEP" valor={obra.cep} />
              <Campo
                rotulo="Entrega prevista"
                valor={
                  obra.data_prevista
                    ? new Date(obra.data_prevista).toLocaleDateString("pt-BR")
                    : null
                }
              />
              <div className="col-span-2">
                <Campo rotulo="Observações" valor={obra.observacoes} />
              </div>
            </dl>
          </div>

          {/* Linha do tempo */}
          <div className="card p-6">
            <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Histórico
            </h2>
            {!historico || historico.length === 0 ? (
              <p className="text-sm text-ink-faint">Sem registros.</p>
            ) : (
              <ol className="space-y-4">
                {historico.map((h, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-steel" />
                    <div>
                      <p className="text-sm font-medium">
                        {h.acao.replace(/_/g, " ").toLowerCase()}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {new Date(h.criado_em).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {/* Aba: Pedidos */}
      {abaAtiva === "pedidos" && (
        <div className="mt-6">
          {!pedidos || pedidos.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm font-medium text-ink">Nenhum pedido para esta obra</p>
              <p className="text-sm text-ink-faint">Crie o primeiro pedido vinculado a esta obra.</p>
              <Link href={`/compras/pedidos/novo?obra_id=${params.id}`} className="btn-primary mt-2">
                Criar pedido
              </Link>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                    <th className="px-5 py-3 font-medium">Nº Pedido</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Tipo</th>
                    <th className="px-5 py-3 font-medium">Fornecedor</th>
                    <th className="px-5 py-3 font-medium">Comprador</th>
                    <th className="px-5 py-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p: any) => {
                    const cor = STATUS_PED_COR[p.status as keyof typeof STATUS_PED_COR] ?? "#94a3b8";
                    return (
                      <tr key={p.id} className="border-b border-line last:border-0 hover:bg-canvas transition-colors">
                        <td className="px-5 py-3">
                          <Link href={`/compras/pedidos/${p.id}`}
                            className="font-mono text-sm font-bold text-steel hover:underline">
                            {p.numero}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: cor + "20", color: cor }}>
                            {STATUS_PED_LABEL[p.status as keyof typeof STATUS_PED_LABEL] ?? p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-ink-soft">
                          {p.tipo_linha ?? <span className="text-ink-faint">—</span>}
                        </td>
                        <td className="px-5 py-3 text-ink-soft">
                          {(p.fornecedor as any)?.nome ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-ink-soft">
                          {(p.comprador as any)?.nome ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-ink-faint text-xs">
                          {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Aba: Produção */}
      {abaAtiva === "producao" && (
        <AbaProducao obraId={params.id} tipologias={tipologias ?? []} />
      )}

      {/* Abas em construção */}
      {!["resumo", "pedidos", "producao"].includes(abaAtiva) && <AbaConstrucao />}
    </div>
  );
}

function AbaConstrucao() {
  return (
    <div className="mt-16 flex flex-col items-center gap-4 text-ink-faint">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
      <p className="text-sm">Este módulo está em construção</p>
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{rotulo}</dt>
      <dd className="mt-0.5 font-medium text-ink">{valor || "—"}</dd>
    </div>
  );
}

import Link from "next/link";
import { createAdminClient } from "@/shared/database/supabase-admin";
import {
  ROTA_BENEFICIAMENTO_LABEL, STATUS_BENEFICIAMENTO_LABEL, STATUS_BENEFICIAMENTO_COR,
  type RotaBeneficiamento, type StatusBeneficiamento,
} from "@/modules/squadframe/types/compras";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

export const dynamic = "force-dynamic";

const STATUSES: StatusBeneficiamento[] = ["AGUARDANDO_ENVIO", "ENVIADO", "CONCLUIDO", "CANCELADO"];

interface BeneficiamentoRow {
  id: string;
  numero: string;
  rota: RotaBeneficiamento;
  status: StatusBeneficiamento;
  criado_em: string;
  obra: { nome: string } | { nome: string }[] | null;
  pedido_origem: { id: string; numero: string } | { id: string; numero: string }[] | null;
  pedido_pintura: { id: string; numero: string; fornecedor: { nome: string } | { nome: string }[] | null } | { id: string; numero: string; fornecedor: { nome: string } | { nome: string }[] | null }[] | null;
}

const rel = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export default async function BeneficiamentoPage({
  searchParams,
}: { searchParams: { status?: string } }) {
  const admin = createAdminClient();

  let q = admin
    .from("beneficiamentos")
    .select(`
      id, numero, rota, status, criado_em,
      obra:obras(nome),
      pedido_origem:pedidos_compra!beneficiamentos_pedido_origem_id_fkey(id, numero),
      pedido_pintura:pedidos_compra!beneficiamentos_pedido_pintura_id_fkey(id, numero, fornecedor:fornecedores(nome))
    `)
    .order("criado_em", { ascending: false });

  if (searchParams.status) q = q.eq("status", searchParams.status);

  const { data } = await q;
  const beneficiamentos = (data ?? []) as unknown as BeneficiamentoRow[];

  return (
    <div className="px-8 py-8">
      <RealtimeRefresher channelName="beneficiamentos-lista" subs={[{ table: "beneficiamentos" }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Beneficiamento</h1>
        <p className="mt-1 text-sm text-text-2">
          Perfil comprado cor natural, mandado pintar — {beneficiamentos.length} registro(s)
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/squadframe/beneficiamento"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!searchParams.status ? "border-primary bg-primary text-white" : "border-border text-text-2 hover:bg-bg"}`}
        >
          Todos
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/squadframe/beneficiamento?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${searchParams.status === s ? "border-primary bg-primary text-white" : "border-border text-text-2 hover:bg-bg"}`}
          >
            {STATUS_BENEFICIAMENTO_LABEL[s]}
          </Link>
        ))}
      </div>

      <div className="mt-4 card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-5 py-2 font-medium">Número</th>
              <th className="px-5 py-2 font-medium">Obra</th>
              <th className="px-5 py-2 font-medium">Rota</th>
              <th className="px-5 py-2 font-medium">Status</th>
              <th className="px-5 py-2 font-medium">Pedido origem</th>
              <th className="px-5 py-2 font-medium">Pedido de pintura</th>
              <th className="px-5 py-2 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {beneficiamentos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-text-3">
                  Nenhum beneficiamento {searchParams.status ? "com esse status" : "criado ainda"}.
                </td>
              </tr>
            ) : beneficiamentos.map((b) => {
              const obra = rel(b.obra);
              const origem = rel(b.pedido_origem);
              const pintura = rel(b.pedido_pintura);
              const fornecedor = pintura ? rel(pintura.fornecedor) : null;
              const cor = STATUS_BENEFICIAMENTO_COR[b.status];
              return (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                  <td className="px-5 py-2.5">
                    <Link href={`/squadframe/beneficiamento/${b.id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                      {b.numero}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-text-2">{obra?.nome ?? "—"}</td>
                  <td className="px-5 py-2.5 text-text-2 text-xs">{ROTA_BENEFICIAMENTO_LABEL[b.rota]}</td>
                  <td className="px-5 py-2.5">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: cor + "22", color: cor }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cor }} />
                      {STATUS_BENEFICIAMENTO_LABEL[b.status]}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    {origem ? (
                      <Link href={`/squadframe/compras/pedidos/${origem.id}`} className="font-mono text-text-3 text-xs hover:text-primary hover:underline">
                        {origem.numero}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-xs">
                    {pintura ? (
                      <Link href={`/squadframe/compras/pedidos/${pintura.id}`} className="hover:underline">
                        <span className="font-mono text-text-2">{pintura.numero}</span>
                        {fornecedor?.nome && <span className="text-text-3"> — {fornecedor.nome}</span>}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-text-3 text-xs">{new Date(b.criado_em).toLocaleDateString("pt-BR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

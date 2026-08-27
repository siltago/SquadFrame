import Link from "next/link";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { Button } from "@/ui/components/Button";

export const dynamic = "force-dynamic";

export default async function EntregasPage() {
  const admin = createAdminClient();

  const { data: romaneiosRaw } = await admin
    .from("romaneios")
    .select("id, numero, data_entrega, criado_em, fornecedor:fornecedores(nome), romaneio_pedidos(pedido_id, pedido:pedidos_compra(numero))")
    .order("criado_em", { ascending: false });

  const romaneios = romaneiosRaw ?? [];

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entregas</h1>
          <p className="mt-1 text-sm text-text-2">Romaneios de entrega anexados aos pedidos.</p>
        </div>
        <Button as="a" href="/squadframe/compras/entregas/novo">Novo romaneio</Button>
      </div>

      <div className="mt-6 card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-5 py-3 font-medium">Número</th>
              <th className="px-5 py-3 font-medium">Fornecedor</th>
              <th className="px-5 py-3 font-medium">Data de entrega</th>
              <th className="px-5 py-3 font-medium">Pedidos vinculados</th>
              <th className="px-5 py-3 font-medium">Cadastrado em</th>
            </tr>
          </thead>
          <tbody>
            {romaneios.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-text-3">
                  Nenhum romaneio cadastrado ainda.
                </td>
              </tr>
            ) : romaneios.map((r: any) => {
              const fornecedor = Array.isArray(r.fornecedor) ? r.fornecedor[0] : r.fornecedor;
              return (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                  <td className="px-5 py-3">
                    <Link href={`/squadframe/compras/entregas/${r.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                      {r.numero ?? "—"}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-text-2">{fornecedor?.nome ?? "—"}</td>
                  <td className="px-5 py-3 text-text-2">
                    {r.data_entrega ? new Date(r.data_entrega + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-5 py-3 text-text-2">
                    {(r.romaneio_pedidos ?? []).map((rp: any) => rp.pedido?.numero).filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-5 py-3 text-xs text-text-3">
                    {new Date(r.criado_em).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

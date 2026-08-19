import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { BackButton } from "@/modules/squadframe/components/back-button";

export const dynamic = "force-dynamic";

export default async function EntregaDetalhePage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();

  const { data: romaneio } = await admin
    .from("romaneios")
    .select("id, numero, data_entrega, arquivo_nome, arquivo_caminho, criado_em, fornecedor:fornecedores(nome), romaneio_pedidos(pedido:pedidos_compra(id, numero, status, obra:obras(nome)))")
    .eq("id", params.id)
    .maybeSingle();

  if (!romaneio) notFound();

  const fornecedor = Array.isArray(romaneio.fornecedor) ? romaneio.fornecedor[0] : romaneio.fornecedor;
  const pedidos = (romaneio.romaneio_pedidos ?? []).map((rp: any) => rp.pedido).filter(Boolean);

  const { data: urlAssinada } = await admin.storage.from("pedido-docs").createSignedUrl(romaneio.arquivo_caminho, 3600);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-3xl mx-auto">
      <BackButton href="/squadframe/compras/entregas" />

      <h1 className="mt-2 text-2xl font-bold tracking-tight">Romaneio {romaneio.numero ?? "—"}</h1>
      <p className="mt-1 text-sm text-text-2">
        {fornecedor?.nome ?? "Fornecedor não identificado"}
        {romaneio.data_entrega && ` · entrega em ${new Date(romaneio.data_entrega + "T00:00:00").toLocaleDateString("pt-BR")}`}
      </p>

      <div className="mt-6 card p-5 space-y-2">
        <p className="text-sm text-text-2">
          Arquivo: {urlAssinada?.signedUrl ? (
            <a href={urlAssinada.signedUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{romaneio.arquivo_nome}</a>
          ) : romaneio.arquivo_nome}
        </p>
        <p className="text-xs text-text-3">Cadastrado em {new Date(romaneio.criado_em).toLocaleDateString("pt-BR")}</p>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-text">Pedidos vinculados</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                <th className="px-5 py-3 font-medium">Pedido</th>
                <th className="px-5 py-3 font-medium">Obra</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-sm text-text-3">Nenhum pedido vinculado.</td></tr>
              ) : pedidos.map((p: any) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <Link href={`/squadframe/compras/pedidos/${p.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                      {p.numero}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-text-2">{p.obra?.nome ?? "—"}</td>
                  <td className="px-5 py-3 text-text-3 text-xs">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

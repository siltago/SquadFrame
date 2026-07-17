import { notFound, redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { buscarObra, listarStatusObra, listarClientes } from "@/modules/wise/works/service";
import { listarUnidades } from "@/modules/wise/organizations/service";
import { ObraDetalhe } from "@/modules/wise/works/components/obra-detalhe";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { createAdminClient } from "@/shared/database/supabase-admin";
import type { WiseLoteComTipologias } from "@/modules/wise/works/types";

export const dynamic = "force-dynamic";

async function buscarLotes(obraId: string): Promise<WiseLoteComTipologias[]> {
  const db = createAdminClient();

  const [resLotes, resTipologias] = await Promise.all([
    db
      .from("lotes_obra")
      .select("id, nome, prioridade, criado_em")
      .eq("obra_id", obraId)
      .order("criado_em", { ascending: true }),
    // tipologias_obra usa "created_at", não "criado_em"
    db
      .from("tipologias_obra")
      .select("id, nome, quantidade, status, codigo_esquadria, tipo, largura_mm, altura_mm, tratamento, descricao, peso_unit, preco_unit, lote_id")
      .eq("obra_id", obraId)
      .order("created_at", { ascending: true }),
  ]);

  const lotesBrutos = (resLotes.data ?? []) as {
    id: string; nome: string; prioridade: string | null; criado_em: string;
  }[];
  const todasTipologias = (resTipologias.data ?? []) as (
    WiseLoteComTipologias["tipologias"][number] & { lote_id: string | null }
  )[];

  const tipsPorLote = new Map<string, WiseLoteComTipologias["tipologias"]>();
  for (const t of todasTipologias) {
    if (!t.lote_id) continue;
    const arr = tipsPorLote.get(t.lote_id) ?? [];
    const { lote_id: _, ...tip } = t;
    arr.push(tip);
    tipsPorLote.set(t.lote_id, arr);
  }

  return lotesBrutos.map((l) => ({
    ...l,
    tipologias: tipsPorLote.get(l.id) ?? [],
  }));
}

export default async function ObraPage({ params }: { params: { id: string } }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const obra = await buscarObra(params.id, wiseUsuario.empresa_id);
  if (!obra) notFound();

  const [clientes, statusOptions, unidades, lotes] =
    await Promise.all([
      listarClientes(),
      listarStatusObra(),
      listarUnidades(wiseUsuario.empresa_id),
      buscarLotes(params.id),
    ]);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <BackButton href="/squadwise/obras" />
      <div className="mt-4">
        <ObraDetalhe
          obra={obra}
          clientes={clientes}
          statusOptions={statusOptions}
          unidades={unidades}
          lotes={lotes}
        />
      </div>
    </div>
  );
}

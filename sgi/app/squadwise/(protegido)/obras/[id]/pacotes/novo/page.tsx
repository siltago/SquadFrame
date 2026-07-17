import { notFound, redirect } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { buscarObra, listarEstruturaFlat } from "@/modules/wise/works/service";
import { PacoteForm } from "@/modules/wise/work-packages/components/pacote-form";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { createAdminClient } from "@/shared/database/supabase-admin";

export const dynamic = "force-dynamic";

async function buscarResponsaveis(empresaId: string) {
  const { data } = await createAdminClient()
    .from("wise_usuarios")
    .select("id, nome")
    .eq("empresa_id", empresaId)
    .eq("status", "ativo")
    .order("nome");
  return (data ?? []) as { id: string; nome: string }[];
}

export default async function NovoPacotePage({ params }: { params: { id: string } }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const obra = await buscarObra(params.id, wiseUsuario.empresa_id);
  if (!obra) notFound();

  const [estrutura, responsaveis] = await Promise.all([
    listarEstruturaFlat(params.id),
    buscarResponsaveis(wiseUsuario.empresa_id),
  ]);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-3xl">
      <BackButton href={`/squadwise/obras/${params.id}`} />
      <div className="mt-4 mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-text-3">
          SquadWise · Obras · {obra.nome}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Novo pacote de trabalho</h1>
      </div>
      <PacoteForm
        obraId={params.id}
        obraNome={obra.nome}
        arvoreEstrutura={estrutura}
        responsaveis={responsaveis}
      />
    </div>
  );
}

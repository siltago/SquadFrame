import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import { buscarObra } from "@/modules/wise/works/service";
import { listarPacotesDaObra } from "@/modules/wise/work-packages/service";
import { PacotesLista } from "@/modules/wise/work-packages/components/pacotes-lista";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { Button } from "@/ui/components/Button";
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

export default async function PacotesDaObraPage({ params }: { params: { id: string } }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) redirect("/");

  const obra = await buscarObra(params.id, wiseUsuario.empresa_id);
  if (!obra) notFound();

  const [pacotes, responsaveis] = await Promise.all([
    listarPacotesDaObra(params.id),
    buscarResponsaveis(wiseUsuario.empresa_id),
  ]);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <BackButton href={`/squadwise/obras/${params.id}`} />

      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-text-3">
            {obra.nome}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Pacotes de Trabalho</h1>
        </div>
        <Button as="a" href={`/squadwise/obras/${params.id}/pacotes/novo`} size="sm">
          Novo pacote
        </Button>
      </div>

      <div className="mt-6">
        <PacotesLista pacotes={pacotes} obraId={params.id} responsaveis={responsaveis} />
      </div>
    </div>
  );
}

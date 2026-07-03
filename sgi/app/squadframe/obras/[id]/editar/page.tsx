import { notFound } from "next/navigation";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { EditarObraCliente } from "@/modules/squadframe/components/obras/editar-obra-cliente";

export const dynamic = "force-dynamic";

export default async function EditarObraPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const usuario = await getUsuarioAtual();

  const podeEditar =
    usuario?.permissoes?.includes("*") ||
    usuario?.permissoes?.includes("obras.editar") ||
    false;

  const { data: obra } = await supabase
    .from("obras")
    .select("*, cliente:clientes(nome)")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (!obra) notFound();

  if (!podeEditar) {
    return (
      <div className="px-8 py-8">
        <BackButton href={`/squadframe/obras/${params.id}`} />
        <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-surface p-12 text-center max-w-md mx-auto">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Acesso restrito</h2>
            <p className="mt-1 text-sm text-text-2">
              Você não tem permissão para editar obras. Solicite ao administrador do sistema.
            </p>
          </div>
          <BackButton href={`/squadframe/obras/${params.id}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-2xl">
      <BackButton href={`/squadframe/obras/${params.id}`} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Editar obra</h1>
      <p className="mt-1 text-sm text-text-2 font-mono">{obra.codigo}</p>
      <div className="mt-6">
        <EditarObraCliente obra={obra as any} />
      </div>
    </div>
  );
}

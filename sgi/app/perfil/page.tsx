import { notFound } from "next/navigation";
import { getUsuarioAtual } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { PerfilCliente } from "./perfil-cliente";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) notFound();

  const admin = createAdminClient();
  const { data: assinatura } = await admin
    .from("assinaturas")
    .select("texto")
    .eq("usuario_id", usuario.id)
    .single();

  return <PerfilCliente usuario={usuario} assinaturaUrl={assinatura?.texto ?? null} />;
}

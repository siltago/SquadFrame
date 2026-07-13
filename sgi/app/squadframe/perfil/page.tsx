import { notFound } from "next/navigation";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { PerfilCliente } from "@/modules/squadframe/components/perfil/perfil-cliente";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const usuario = await getUsuarioAtual();
  if (!usuario) notFound();

  const admin = createAdminClient();
  const [{ data: assinatura }, { data: whatsappStatus }] = await Promise.all([
    admin.from("assinaturas").select("texto").eq("usuario_id", usuario.id).single(),
    admin
      .from("usuarios")
      .select("whatsapp_pendente, whatsapp_codigo_expira_em")
      .eq("id", usuario.id)
      .single(),
  ]);

  const verificacaoPendente =
    !!whatsappStatus?.whatsapp_pendente &&
    !!whatsappStatus?.whatsapp_codigo_expira_em &&
    new Date(whatsappStatus.whatsapp_codigo_expira_em) > new Date();

  return (
    <PerfilCliente
      usuario={usuario}
      assinaturaUrl={assinatura?.texto ?? null}
      whatsappPendente={verificacaoPendente ? whatsappStatus!.whatsapp_pendente : null}
    />
  );
}

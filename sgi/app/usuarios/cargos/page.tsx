import { createAdminClient } from "@/lib/supabase-admin";
import { CargosCliente } from "./cargos-cliente";

function toPermissao(p: { id: string; chave: string }) {
  const [modulo = "", acao = ""] = p.chave.split(".");
  return { id: p.id, chave: p.chave, modulo, acao };
}

export const dynamic = "force-dynamic";

export default async function CargosPage() {
  const supabase = createAdminClient();

  const [
    { data: setores },
    { data: cargos },
    { data: permissoes },
    { data: cargoPerms },
  ] = await Promise.all([
    supabase.from("setores").select("id, nome, cor, ordem").eq("ativo", true).order("ordem"),
    supabase.from("cargos").select("id, nome, cor, setor_id, ordem, is_admin").eq("ativo", true).order("ordem"),
    supabase.from("permissoes").select("id, chave"),
    supabase.from("cargo_permissoes").select("cargo_id, permissao_id"),
  ]);

  const cargosComPerms = (cargos ?? []).map((c) => ({
    ...c,
    permissao_ids: (cargoPerms ?? [])
      .filter((cp) => cp.cargo_id === c.id)
      .map((cp) => cp.permissao_id),
  }));

  return (
    <CargosCliente
      setoresInit={setores ?? []}
      cargosInit={cargosComPerms}
      permissoes={(permissoes ?? []).map(toPermissao)}
    />
  );
}

import { createAdminClient } from "@/shared/database/supabase-admin";
import { CargosCliente } from "@/modules/squadframe/components/usuarios/cargos-cliente";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

function toPermissao(p: { id: string; chave: string; nome: string | null }) {
  const parts = p.chave.split(".");
  const acao  = parts[parts.length - 1];
  const modulo = parts.slice(0, -1).join(".");
  return { id: p.id, chave: p.chave, nome: p.nome ?? p.chave, modulo, acao };
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
    supabase.from("permissoes").select("id, chave, nome"),
    supabase.from("cargo_permissoes").select("cargo_id, permissao_id"),
  ]);

  const cargosComPerms = (cargos ?? []).map((c) => ({
    ...c,
    permissao_ids: (cargoPerms ?? [])
      .filter((cp) => cp.cargo_id === c.id)
      .map((cp) => cp.permissao_id),
  }));

  return (
    <>
      <RealtimeRefresher
        channelName="usuarios-cargos"
        subs={[{ table: "cargos" }, { table: "setores" }, { table: "cargo_permissoes" }]}
      />
      <CargosCliente
        setoresInit={setores ?? []}
        cargosInit={cargosComPerms}
        permissoes={(permissoes ?? []).map(toPermissao)}
      />
    </>
  );
}

import { createAdminClient } from "@/shared/database/supabase-admin";
import { UsuariosCliente } from "@/modules/squadframe/components/usuarios/usuarios-cliente";
import { UsuariosSidebar } from "@/modules/squadframe/components/usuarios-sidebar";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const admin = createAdminClient();

  const [
    { data: usuariosRaw },
    { data: cargos },
    { data: setores },
    authResult,
    { data: cargosAdmin },
  ] = await Promise.all([
    admin.from("usuarios").select("id, auth_id, nome, email, foto_url, ativo, criado_em, cargo_id, setor_id").order("nome"),
    admin.from("cargos").select("id, nome, cor, is_admin, setor_id").eq("ativo", true).order("nome"),
    admin.from("setores").select("id, nome, cor").eq("ativo", true).order("nome"),
    admin.auth.admin.listUsers(),
    admin.from("cargos").select("id").eq("is_admin", true).eq("ativo", true),
  ]);

  const temAdmin = (cargosAdmin ?? []).length > 0;

  const authUsers = authResult.data?.users ?? [];
  let dbUsers: any[] = usuariosRaw ?? [];

  const authIdsNoBanco = authUsers
    .filter((au) => !dbUsers.find((u) => u.auth_id === au.id))
    .map((au) => au.id);

  if (authIdsNoBanco.length > 0) {
    const novas = authUsers
      .filter((au) => authIdsNoBanco.includes(au.id))
      .map((au) => ({
        auth_id: au.id,
        nome: (au.user_metadata?.nome as string) ?? au.email ?? "Usuário",
        email: au.email ?? "",
        foto_url: (au.user_metadata?.foto_url as string) ?? null,
      }));
    await admin.from("usuarios").upsert(novas, { onConflict: "auth_id", ignoreDuplicates: true });
    const { data: recarregados } = await admin
      .from("usuarios")
      .select("id, auth_id, nome, email, foto_url, ativo, criado_em, cargo_id, setor_id")
      .order("nome");
    dbUsers = recarregados ?? [];
  }

  const cargosMap   = Object.fromEntries((cargos  ?? []).map((c: any) => [c.id, c]));
  const setoresMap  = Object.fromEntries((setores ?? []).map((s: any) => [s.id, s]));
  const authUserMap = Object.fromEntries(authUsers.map((au) => [au.id, au]));

  const usuarios = dbUsers.map((u: any) => {
    const authUser = authUserMap[u.auth_id];
    const cargo    = u.cargo_id ? cargosMap[u.cargo_id]   ?? null : null;
    const setorId  = u.setor_id ?? cargo?.setor_id ?? null;
    const setor    = setorId    ? setoresMap[setorId]      ?? null : null;
    const foto_url = u.foto_url ?? (authUser?.user_metadata?.foto_url as string | undefined) ?? null;
    return { ...u, foto_url, cargo, setor };
  });

  const setoresComCount = (setores ?? []).map((s: any) => ({
    ...s,
    count: usuarios.filter((u: any) => u.setor?.id === s.id).length,
  }));

  return (
    <div className="flex" style={{ height: "calc(100dvh - 56px - env(safe-area-inset-top))" }}>
      <RealtimeRefresher
        channelName="usuarios-lista"
        subs={[{ table: "usuarios" }, { table: "cargos" }, { table: "setores" }]}
      />
      <UsuariosSidebar setores={setoresComCount} />
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
        <UsuariosCliente
          usuarios={usuarios as any}
          cargos={(cargos ?? []) as any}
          setores={(setores ?? []) as any}
          temAdmin={temAdmin}
        />
      </div>
    </div>
  );
}

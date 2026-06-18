import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { UsuariosCliente } from "./usuarios-cliente";
import { BackButton } from "@/components/back-button";

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

  // Se a linha em usuarios não existe ainda para um auth user, cria agora
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
    // Usa foto do banco; se não tiver, pega do auth metadata
    const foto_url = u.foto_url ?? (authUser?.user_metadata?.foto_url as string | undefined) ?? null;
    return { ...u, foto_url, cargo, setor };
  });

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <BackButton href="/" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-ink-faint">Usuários</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <Link
            href="/usuarios"
            className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-steel bg-steel/5 border-r-2 border-steel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Todos os usuários
          </Link>
          <Link
            href="/usuarios/cargos"
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-soft hover:bg-canvas hover:text-ink"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
            Cargos e Setores
          </Link>

          {(setores ?? []).length > 0 && (
            <>
              <div className="mt-3 px-4 pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-faint">Por setor</p>
              </div>
              {(setores ?? []).map((s: any) => (
                <div key={s.id} className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-soft">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.cor }} />
                  {s.nome}
                  <span className="ml-auto text-xs text-ink-faint">
                    {usuarios.filter((u: any) => u.setor?.id === s.id).length}
                  </span>
                </div>
              ))}
            </>
          )}
        </nav>
        <div className="border-t border-line p-3">
          <Link href="/cadastro" className="btn-primary w-full text-center text-sm">
            Novo usuário
          </Link>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
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

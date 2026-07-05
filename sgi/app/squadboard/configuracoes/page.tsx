import {
  buscarWorkspacesConfigurados,
  verificarConexaoTrello,
} from "@/modules/squadboard/actions/settings";
import { buscarStatusCache } from "@/modules/squadboard/actions/cache";
import { SettingsView } from "@/modules/squadboard/components/settings/settings-view";

export const dynamic = "force-dynamic";

export default async function SquadBoardConfiguracoesPage() {
  const [workspaces, conexao, cacheStatus] = await Promise.all([
    buscarWorkspacesConfigurados().catch(() => []),
    verificarConexaoTrello().catch(() => ({ ok: false, erro: "Erro ao verificar conexão." })),
    buscarStatusCache().catch(() => []),
  ]);

  const workspace = workspaces.find((w) => w.nome === "Interno" && w.provider === "trello") ?? null;

  return (
    <SettingsView
      workspace={workspace}
      conexaoOk={conexao.ok}
      conexaoErro={conexao.erro}
      temApiKey={!!process.env.TRELLO_API_KEY}
      temToken={!!process.env.TRELLO_TOKEN}
      cacheStatus={cacheStatus}
    />
  );
}

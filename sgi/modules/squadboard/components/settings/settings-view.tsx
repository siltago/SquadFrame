"use client";

import { SquadBoardTopbar } from "@/modules/squadboard/components/layout/topbar";
import { ConnectionPanel } from "./connection-panel";
import { WorkspacePanel } from "./workspace-panel";
import { CachePanel } from "./cache-panel";
import type { Workspace } from "@/modules/squadboard/types/workspace";
import type { CacheStatus } from "@/modules/squadboard/actions/cache";

interface SettingsViewProps {
  workspace: Workspace | null;
  conexaoOk: boolean;
  conexaoErro?: string;
  temApiKey: boolean;
  temToken: boolean;
  cacheStatus: CacheStatus[];
}

export function SettingsView({
  workspace,
  conexaoOk,
  conexaoErro,
  temApiKey,
  temToken,
  cacheStatus,
}: SettingsViewProps) {
  return (
    <div className="flex flex-1 min-w-0 flex-col h-screen overflow-hidden">
      <SquadBoardTopbar onOpenSearch={() => {}} />

      <div className="flex-1 overflow-y-auto scrollbar-thin px-8 py-6">
        <div className="max-w-2xl">
          <h1 className="text-xl font-semibold text-text mb-1">Configurações</h1>
          <p className="text-sm text-text-3 mb-8">
            Gerencie a integração do Quadro Interno com o Trello.
          </p>

          <div className="flex flex-col gap-5">
            <ConnectionPanel
              statusInicial={{ ok: conexaoOk, erro: conexaoErro }}
              temApiKey={temApiKey}
              temToken={temToken}
            />
            <WorkspacePanel workspace={workspace} />
            <CachePanel statusInicial={cacheStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}

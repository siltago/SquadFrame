"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/ui/theme/ThemeProvider";
import { useUsuario } from "@/modules/squadframe/components/user-provider";
import { Avatar } from "@/ui/components/Avatar";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/ui/components/Dropdown";
import { NotificacoesBadge } from "@/modules/squadframe/components/notificacoes/notificacoes-badge";
import { buscarNotificacoes } from "@/modules/squadframe/actions/tarefas/actions";
import { SearchIcon, SunIcon, MoonIcon, LogoutIcon, UserIcon } from "@/ui/icons";

function NotificacoesWrapper() {
  const usuario = useUsuario();
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    if (!usuario?.id) return;
    buscarNotificacoes(1).then((r) => setNaoLidas(r.naoLidas)).catch(() => {});
  }, [usuario?.id]);

  if (!usuario?.id) return null;
  return <NotificacoesBadge usuarioId={usuario.id} naoLidasIniciais={naoLidas} />;
}

export function SquadBoardTopbar({
  onOpenSearch,
}: {
  onOpenSearch: () => void;
}) {
  const { resolvedTheme, toggle } = useTheme();
  const usuario = useUsuario();
  const dark = resolvedTheme === "dark";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
      {/* Busca — abre o Command Palette */}
      <button
        onClick={onOpenSearch}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 text-sm text-text-3 transition-colors hover:border-text-3 sm:max-w-sm"
      >
        <SearchIcon size={15} />
        <span className="flex-1 text-left">Buscar pacotes…</span>
        <kbd className="hidden rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-text-3 sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <NotificacoesWrapper />

        <button
          onClick={toggle}
          aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
        >
          {dark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>

        <Dropdown
          align="right"
          width="200px"
          trigger={
            <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-surface-2">
              <Avatar name={usuario?.nome} src={usuario?.foto_url} size="sm" />
            </button>
          }
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium text-text">{usuario?.nome ?? "Usuário"}</p>
            <p className="truncate text-xs text-text-3">{usuario?.email ?? ""}</p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2.5 border-b border-border px-3 py-2.5 text-sm font-medium text-text-2 transition-colors duration-[80ms] hover:bg-surface-2 hover:text-text"
          >
            <img src="/logo-system.png" alt="" className="h-4 w-4 shrink-0 object-contain" />
            SquadSystem
          </Link>
          <DropdownItem icon={<UserIcon size={14} />}>Meu perfil</DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon={<LogoutIcon size={14} />} variant="danger">Sair</DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/shared/database/supabase-client";
import { usePwa } from "@/modules/squadframe/components/pwa-provider";
import type { UsuarioAtual } from "@/shared/auth/auth";
import {
  ChevronDownIcon, UserIcon, LogoutIcon, BellIcon, PhoneIcon, UploadIcon,
} from "@/ui/icons";

export function HeaderUser({ usuario }: { usuario: UsuarioAtual }) {
  const [aberto, setAberto] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const router = useRouter();
  const { isOnline, canInstall, isInstalled, installApp, showIOSInstructions, isPushSupported, pushPermission, requestPushPermission } = usePwa();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = usuario.nome
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const cargoCor = usuario.cargo?.cor ?? "#475569";

  return (
    <div className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-white/10"
      >
        {/* Avatar */}
        {usuario.foto_url && !imgError ? (
          <img
            src={usuario.foto_url}
            alt={usuario.nome}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-white/30"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: cargoCor }}
          >
            {initials}
          </div>
        )}

        {/* Nome + cargo */}
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium leading-none text-white">
            {usuario.nome.split(" ")[0]}
          </p>
          {usuario.cargo && (
            <p className="mt-0.5 text-xs leading-none" style={{ color: "rgba(255,255,255,0.65)" }}>
              {usuario.cargo.nome}
            </p>
          )}
        </div>

        {/* Chevron */}
        <ChevronDownIcon
          size={14}
          stroke="rgba(255,255,255,0.7)"
          className={`hidden shrink-0 transition-transform sm:block ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {aberto && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setAberto(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-surface shadow-lg">
            {/* Info */}
            <div className="border-b border-border px-4 py-3">
              <div className="mb-2.5 flex items-center gap-3">
                {usuario.foto_url && !imgError ? (
                  <img
                    src={usuario.foto_url}
                    alt={usuario.nome}
                    className="h-[60px] w-[60px] rounded-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div
                    className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{ backgroundColor: cargoCor }}
                  >
                    {initials}
                  </div>
                )}
                <div className="min-w-0 overflow-hidden">
                  <p className="truncate text-sm font-medium text-text">{usuario.nome}</p>
                  <p className="truncate text-xs text-text-3">{usuario.email}</p>
                </div>
              </div>
              {usuario.empresa && (
                <p className="mt-0.5 text-xs text-text-3">{usuario.empresa}</p>
              )}
              {usuario.cargo && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: usuario.cargo.cor }}
                  />
                  <span className="text-xs text-text-2">{usuario.cargo.nome}</span>
                  {usuario.setor && (
                    <span className="text-xs text-text-3">· {usuario.setor.nome}</span>
                  )}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="py-1">
              {/* Status de conexão */}
              <div className="flex items-center gap-2 px-4 py-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: isOnline ? "#10b981" : "#ef4444" }}
                />
                <span className="text-xs text-text-3">{isOnline ? "Online" : "Offline"}</span>
              </div>

              <div className="my-1 border-t border-border" />

              <Link
                href="/squadframe/perfil"
                onClick={() => setAberto(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-text-2 hover:bg-bg hover:text-text"
              >
                <UserIcon size={14} />
                Meu perfil
              </Link>

              {/* Instalar aplicativo (Chrome/Edge/Android) */}
              {canInstall && (
                <button
                  onClick={async () => { setAberto(false); await installApp(); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-2 hover:bg-bg hover:text-text"
                >
                  <PhoneIcon size={14} />
                  Instalar aplicativo
                </button>
              )}

              {showIOSInstructions && (
                <button
                  onClick={() => { setAberto(false); setShowIOSModal(true); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-2 hover:bg-bg hover:text-text"
                >
                  <PhoneIcon size={14} />
                  Instalar no iPhone
                </button>
              )}

              {(isInstalled || isPushSupported) && pushPermission !== "granted" && pushPermission !== "denied" && (
                <button
                  onClick={async () => { setAberto(false); await requestPushPermission(); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-2 hover:bg-bg hover:text-text"
                >
                  <BellIcon size={14} />
                  Ativar notificações
                </button>
              )}

              <div className="my-1 border-t border-border" />

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-2 hover:bg-bg hover:text-danger"
              >
                <LogoutIcon size={14} />
                Sair
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de instrução para iOS */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }} onClick={() => setShowIOSModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-text mb-1">Instalar no iPhone</h3>
            <p className="text-sm text-text-2 mb-4">Para adicionar o SquadFrame à sua tela de início:</p>
            <ol className="space-y-3 text-sm text-text">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">1</span>
                Toque em <strong className="mx-1">Compartilhar</strong>
                <UploadIcon size={16} className="shrink-0" />
                na barra do Safari
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">2</span>
                Role para baixo e toque em <strong className="ml-1">Adicionar à Tela de Início</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">3</span>
                Confirme tocando em <strong className="ml-1">Adicionar</strong>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

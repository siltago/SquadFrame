"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import type { UsuarioAtual } from "@/lib/auth";

export function HeaderUser({ usuario }: { usuario: UsuarioAtual }) {
  const [aberto, setAberto] = useState(false);
  const [imgError, setImgError] = useState(false);
  const router = useRouter();

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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`hidden shrink-0 transition-transform sm:block ${aberto ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {aberto && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setAberto(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-card border border-line bg-surface shadow-lg">
            {/* Info */}
            <div className="border-b border-line px-4 py-3">
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
                <div>
                  <p className="text-sm font-medium text-ink">{usuario.nome}</p>
                  <p className="text-xs text-ink-faint">{usuario.email}</p>
                </div>
              </div>
              {usuario.empresa && (
                <p className="mt-0.5 text-xs text-ink-faint">{usuario.empresa}</p>
              )}
              {usuario.cargo && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: usuario.cargo.cor }}
                  />
                  <span className="text-xs text-ink-soft">{usuario.cargo.nome}</span>
                  {usuario.setor && (
                    <span className="text-xs text-ink-faint">· {usuario.setor.nome}</span>
                  )}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="py-1">
              <Link
                href="/perfil"
                onClick={() => setAberto(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-ink-soft hover:bg-canvas hover:text-ink"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Meu perfil
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink-soft hover:bg-canvas hover:text-red-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sair
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { createContext, useContext } from "react";
import type { UsuarioAtual } from "@/lib/auth";

const UserContext = createContext<UsuarioAtual | null>(null);

export function UserProvider({
  usuario,
  children,
}: {
  usuario: UsuarioAtual | null;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={usuario}>{children}</UserContext.Provider>;
}

export function useUsuario(): UsuarioAtual | null {
  return useContext(UserContext);
}

/** Retorna true se o usuário logado tem ao menos uma das permissões informadas */
export function usePode(...chaves: string[]): boolean {
  const u = useContext(UserContext);
  if (!u || !u.permissoes) return false;
  if (u.permissoes.includes("*")) return true;
  return chaves.some((c) => u.permissoes!.includes(c));
}

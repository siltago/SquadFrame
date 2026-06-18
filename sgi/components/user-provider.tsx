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

/** Retorna true se o usuário logado tem a permissão informada */
export function usePode(chave: string): boolean {
  const u = useContext(UserContext);
  if (!u || !u.permissoes) return false;
  if (u.permissoes.includes("*")) return true;
  return u.permissoes.includes(chave);
}

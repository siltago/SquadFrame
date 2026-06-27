import "server-only";
import { getUsuarioAtual } from "@/lib/auth";

export async function verificarPermissao(...chaves: string[]): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");
  const tem =
    usuario.permissoes?.includes("*") ||
    chaves.some((c) => usuario.permissoes?.includes(c));
  if (!tem) throw new Error("Permissão negada.");
}

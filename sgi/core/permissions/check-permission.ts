import "server-only";
import { getUsuarioAtual } from "@/lib/auth";

export async function verificarPermissao(chave: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");
  const tem =
    usuario.permissoes?.includes("*") ||
    usuario.permissoes?.includes(chave);
  if (!tem) throw new Error(`Permissão negada: ${chave}`);
}

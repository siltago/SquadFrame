export interface LocalNo {
  id: string;
  nome: string;
  parent_id: string | null;
}

// Monta "Galpão A › Sala 2 › Prateleira 3" subindo a cadeia parent_id — usado
// tanto na folha de contagem impressa quanto nas telas de sessão, a partir
// de um Map<id, LocalNo> já carregado (evita N+1 query por local).
export function caminhoLocal(porId: Map<string, LocalNo>, id: string | null | undefined): string {
  const partes: string[] = [];
  let atual = id ? porId.get(id) : undefined;
  while (atual) {
    partes.unshift(atual.nome);
    atual = atual.parent_id ? porId.get(atual.parent_id) : undefined;
  }
  return partes.join(" › ");
}

import { useState, useTransition } from "react";

// Estado + handlers do padrão "modo exclusão em massa" repetido em todas as
// listas de Compras (pedidos, solicitações, fornecedores, formas de
// pagamento): liga o modo, marca itens, confirma excluindo via a action
// passada, com erro/pending prontos pra UI.
export function useBulkSelect(deleteAction: (ids: string[]) => Promise<void>) {
  const [modoExcluir, setModoExcluir] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggleItem(id: string, checked: boolean) {
    setSelecionados((prev) => { const next = new Set(prev); checked ? next.add(id) : next.delete(id); return next; });
  }

  function toggleTodos(ids: string[], checked: boolean) {
    setSelecionados(checked ? new Set(ids) : new Set());
  }

  function ativar() { setModoExcluir(true); }

  function cancelar() { setModoExcluir(false); setSelecionados(new Set()); setErro(null); }

  function confirmarExclusao() {
    setErro(null);
    start(async () => {
      try { await deleteAction(Array.from(selecionados)); cancelar(); }
      catch (e: any) { setErro(e.message); }
    });
  }

  return {
    modoExcluir, ativar, cancelar,
    selecionados, toggleItem, toggleTodos,
    confirmarExclusao, pending, erro,
    n: selecionados.size,
  };
}

"use client";

import { useState, useTransition } from "react";
import { criarDevolucaoPedido } from "@/modules/squadframe/actions/compras/devolucao";
import { Button } from "@/ui/components/Button";

type ItemRecebido = {
  id: string;
  descricao_snapshot: string;
  unidade: string;
  quantidade_pedida: number;
  quantidade_recebida: number;
  preco_unitario: number | null;
};

type ItemSelecionado = {
  pedido_item_id: string;
  descricao_snapshot: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number | null;
  selecionado: boolean;
};

export function DevolucaoPedidoForm({
  pedidoId,
  itens,
  valorFinalPedido,
}: {
  pedidoId: string;
  itens: ItemRecebido[];
  valorFinalPedido: number | null;
}) {
  const [selecionados, setSelecionados] = useState<ItemSelecionado[]>(() =>
    itens
      .filter((i) => (i.quantidade_recebida ?? 0) > 0)
      .map((i) => ({
        pedido_item_id:    i.id,
        descricao_snapshot: i.descricao_snapshot,
        unidade:           i.unidade,
        quantidade:        Number(i.quantidade_recebida ?? 0),
        preco_unitario:    i.preco_unitario != null ? Number(i.preco_unitario) : null,
        selecionado:       false,
      }))
  );

  const [motivo, setMotivo] = useState("");
  const [valorTotal, setValorTotal] = useState(
    valorFinalPedido != null ? String(valorFinalPedido) : ""
  );
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const algumSelecionado = selecionados.some((s) => s.selecionado);

  function toggleItem(idx: number) {
    setSelecionados((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, selecionado: !s.selecionado } : s))
    );
  }

  function setQtd(idx: number, v: number) {
    setSelecionados((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, quantidade: v } : s))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo.trim()) { setErro("Informe o motivo da devolução."); return; }
    if (!algumSelecionado) { setErro("Selecione ao menos um item para devolver."); return; }
    setErro(null);

    const itensSelecionados = selecionados
      .filter((s) => s.selecionado && s.quantidade > 0)
      .map((s) => ({
        pedido_item_id:    s.pedido_item_id,
        descricao_snapshot: s.descricao_snapshot,
        quantidade:        s.quantidade,
        unidade:           s.unidade,
        preco_unitario:    s.preco_unitario,
      }));

    const vt = valorTotal ? parseFloat(valorTotal.replace(/[^0-9,.-]/g, "").replace(",", ".")) : null;

    start(async () => {
      try {
        await criarDevolucaoPedido(pedidoId, motivo, itensSelecionados, vt && vt > 0 ? vt : null);
      } catch (err: any) {
        setErro(err.message);
      }
    });
  }

  if (selecionados.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-text-3">Nenhum item recebido encontrado para devolução.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-300">
        <p className="font-semibold">Devolução de Pedido</p>
        <p className="mt-0.5 text-xs">
          Selecione os itens que serão devolvidos ao fornecedor e informe o motivo.
          Após aprovação, a devolução seguirá o fluxo de envio e entrega.
        </p>
      </div>

      {/* Motivo */}
      <div className="card p-5">
        <label className="label">Motivo da devolução <span className="text-danger">*</span></label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          placeholder="Descreva o motivo da devolução (produto com defeito, quantidade incorreta, etc.)…"
          className="field text-sm"
          required
        />
      </div>

      {/* Seleção de itens */}
      <div className="card overflow-x-auto">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-text">Itens recebidos</p>
          <p className="text-xs text-text-3 mt-0.5">Selecione quais serão devolvidos e a quantidade</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-4 py-2 w-8" />
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-4 py-2 font-medium text-right">Recebido</th>
              <th className="px-4 py-2 font-medium">Qtd. a devolver</th>
              <th className="px-4 py-2 font-medium text-right">Preço unit.</th>
            </tr>
          </thead>
          <tbody>
            {selecionados.map((it, idx) => (
              <tr key={it.pedido_item_id}
                className={`border-b border-border last:border-0 transition-colors ${it.selecionado ? "bg-blue-50/60 dark:bg-blue-900/10" : ""}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={it.selecionado}
                    onChange={() => toggleItem(idx)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                </td>
                <td className="px-4 py-3">
                  <p className={`font-medium ${it.selecionado ? "text-text" : "text-text-2"}`}>
                    {it.descricao_snapshot}
                  </p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-text-2">
                  {it.quantidade} {it.unidade}
                </td>
                <td className="px-4 py-3">
                  {it.selecionado ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0.001"
                        max={it.quantidade}
                        step="any"
                        value={it.quantidade}
                        onChange={(e) => setQtd(idx, parseFloat(e.target.value) || 0)}
                        className="field h-8 w-24 text-sm tabular-nums"
                      />
                      <span className="text-xs text-text-3">{it.unidade}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-text-3">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-text-2 text-xs">
                  {it.preco_unitario != null
                    ? Number(it.preco_unitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Valor total da devolução */}
      <div className="card p-5">
        <label className="label">
          Valor total da devolução
          <span className="text-text-3 font-normal text-xs ml-1">(opcional — para faturamento direto)</span>
        </label>
        <div className="flex items-center gap-2 max-w-xs">
          <span className="text-sm text-text-2 shrink-0">R$</span>
          <input
            type="text"
            inputMode="decimal"
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            placeholder="0,00"
            className="field h-9 text-sm font-mono"
          />
        </div>
        <p className="mt-1.5 text-xs text-text-3">
          Se o pedido original usava faturamento direto, este valor será creditado de volta na carteira ao confirmar a entrega da devolução.
        </p>
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || !algumSelecionado}>
          {pending ? "Criando…" : "Criar devolução"}
        </Button>
        <Button as="a" variant="ghost" href={`/squadframe/compras/pedidos/${pedidoId}`}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

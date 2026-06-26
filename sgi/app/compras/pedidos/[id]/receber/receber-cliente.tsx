"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { registrarRecebimento } from "@/app/compras/actions";
import { AssinarModal } from "@/components/assinar-modal";

type Item = {
  id: string; descricao_snapshot: string; unidade: string;
  quantidade_pedida: number; quantidade_recebida: number; saldo_pendente: number;
  produto?: { codigo_mestre: string; nome: string };
};

export function ReceberCliente({ pedidoId, itens }: { pedidoId: string; itens: Item[] }) {
  const [qtds, setQtds] = useState<Record<string, number>>(
    Object.fromEntries(itens.map((i) => [i.id, Number(i.saldo_pendente)]))
  );
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pendingFn = useRef<(() => Promise<void>) | null>(null);
  const [modalAcao, setModalAcao] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const payload = itens
      .map((i) => ({ pedido_item_id: i.id, quantidade_recebida: qtds[i.id] ?? 0 }))
      .filter((i) => i.quantidade_recebida > 0);
    if (!payload.length) { setErro("Informe ao menos uma quantidade."); return; }

    pendingFn.current = async () => {
      start(async () => {
        try {
          await registrarRecebimento(pedidoId, data, obs, payload);
          router.push(`/compras/pedidos/${pedidoId}`);
          router.refresh();
        } catch (e: any) { setErro(e.message); }
      });
    };
    setModalAcao("Registrar Recebimento de Materiais");
  }

  return (
    <>
      {modalAcao && (
        <AssinarModal
          acao={modalAcao}
          onConfirm={async () => { setModalAcao(null); await pendingFn.current?.(); }}
          onCancel={() => setModalAcao(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data de recebimento</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="field" required />
            </div>
            <div>
              <label className="label">Observações <span className="text-ink-faint font-normal">(opcional)</span></label>
              <input value={obs} onChange={(e) => setObs(e.target.value)} className="field" placeholder="NF, observações gerais…" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink">Quantidades recebidas</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="px-5 py-3 font-medium">Produto</th>
                  <th className="px-5 py-3 font-medium text-right">Pedido</th>
                  <th className="px-5 py-3 font-medium text-right">Já recebido</th>
                  <th className="px-5 py-3 font-medium text-right">Saldo</th>
                  <th className="px-5 py-3 font-medium text-right w-36">Receber agora</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((it) => (
                  <tr key={it.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{it.produto?.nome ?? it.descricao_snapshot}</p>
                      <p className="font-mono text-xs text-ink-faint">{it.produto?.codigo_mestre}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-ink-soft">
                      {Number(it.quantidade_pedida).toLocaleString("pt-BR")} {it.unidade}
                    </td>
                    <td className="px-5 py-3 text-right text-green-600">
                      {Number(it.quantidade_recebida).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-orange-500">
                      {Number(it.saldo_pendente).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="number" min="0" step="any"
                        max={Number(it.saldo_pendente)}
                        value={qtds[it.id] ?? 0}
                        onChange={(e) => setQtds((prev) => ({ ...prev, [it.id]: parseFloat(e.target.value) || 0 }))}
                        className="field h-8 w-full text-right text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Aguarde…" : "Confirmar recebimento"}
          </button>
          <a href={`/compras/pedidos/${pedidoId}`} className="btn-ghost">Cancelar</a>
        </div>
      </form>
    </>
  );
}

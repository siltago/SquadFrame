"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { registrarRecebimentoBeneficiamento } from "@/modules/squadframe/actions/compras/beneficiamentos";
import { AssinarModal } from "@/modules/squadframe/components/assinar-modal";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";
import { DatePicker } from "@/ui/components/DatePicker";

type ItemBenef = {
  id: string; // beneficiamento_item_id
  descricao: string;
  unidade: string;
  quantidade: number;
  quantidadeRecebida: number;
  saldoPendente: number;
};

// Fluxo de recebimento próprio pro beneficiamento — mais enxuto que
// ReceberCliente (sem romaneio, sem preço por item, IDs de
// beneficiamento_item em vez de pedido_item). Não tenta generalizar
// ReceberCliente, que tem bastante lógica específica de pedido que não se
// aplica aqui.
export function ReceberBeneficiamentoCliente({
  pedidoBeneficiamentoId,
  itens,
}: {
  pedidoBeneficiamentoId: string;
  itens: ItemBenef[];
}) {
  const router = useRouter();
  const [qtds, setQtds] = useState<Record<string, number>>(
    Object.fromEntries(itens.map((i) => [i.id, i.saldoPendente]))
  );
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pendingFn = useRef<(() => Promise<void>) | null>(null);
  const [modalAcao, setModalAcao] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const payload = itens
      .map((i) => ({ beneficiamento_item_id: i.id, quantidade_recebida: qtds[i.id] ?? 0 }))
      .filter((i) => i.quantidade_recebida > 0);
    if (!payload.length) { setErro("Informe ao menos uma quantidade."); return; }

    pendingFn.current = async () => {
      start(async () => {
        try {
          await registrarRecebimentoBeneficiamento(pedidoBeneficiamentoId, data, obs, payload);
          router.refresh();
        } catch (e: any) { setErro(e.message); }
      });
    };
    setModalAcao("Registrar Recebimento de Beneficiamento");
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data de recebimento</label>
              <DatePicker value={data} onChange={setData} />
            </div>
            <div>
              <label className="label">Observações <span className="text-text-3 font-normal">(opcional)</span></label>
              <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações gerais…" />
            </div>
          </div>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium text-right">Enviado</th>
                <th className="px-5 py-3 font-medium text-right">Já recebido</th>
                <th className="px-5 py-3 font-medium text-right">Saldo</th>
                <th className="px-5 py-3 font-medium text-right w-36">Receber agora</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((it) => (
                <tr key={it.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium text-text">{it.descricao}</td>
                  <td className="px-5 py-3 text-right text-text-2">
                    {it.quantidade.toLocaleString("pt-BR")} {it.unidade}
                  </td>
                  <td className="px-5 py-3 text-right text-success">
                    {it.quantidadeRecebida.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-orange-500">
                    {it.saldoPendente.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="number" min="0" step="any"
                      max={it.saldoPendente}
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

        {erro && <p className="text-sm text-danger">{erro}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Aguarde…" : "Confirmar recebimento"}
        </Button>
      </form>
    </>
  );
}

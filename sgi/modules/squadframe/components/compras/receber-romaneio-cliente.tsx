"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { registrarRecebimentoLote, type ResultadoLote } from "@/app/squadframe/compras/actions";
import { AssinarModal } from "@/modules/squadframe/components/assinar-modal";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";

type Item = {
  id: string; descricao_snapshot: string; unidade: string;
  quantidade_pedida: number; quantidade_recebida: number; saldo_pendente: number;
  produto?: { codigo_mestre: string; nome: string };
};
type Grupo = { pedidoId: string; numero: string; obraNome: string | null; fornecedorNome: string | null; itens: Item[] };

export function ReceberRomaneioCliente({
  romaneioId,
  grupos,
  redirectHref,
}: {
  romaneioId: string;
  grupos: Grupo[];
  redirectHref: string;
}) {
  const todosItens = grupos.flatMap((g) => g.itens);
  const [qtds, setQtds] = useState<Record<string, number>>(
    Object.fromEntries(todosItens.map((i) => [i.id, Number(i.saldo_pendente)]))
  );
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [resultadoParcial, setResultadoParcial] = useState<ResultadoLote | null>(null);
  const [pending, start] = useTransition();
  const pendingFn = useRef<(() => Promise<void>) | null>(null);
  const [modalAcao, setModalAcao] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const jaSucesso = new Set((resultadoParcial?.sucesso ?? []).map((s) => s.pedidoId));

    const itensPorPedido = grupos
      .filter((g) => !jaSucesso.has(g.pedidoId))
      .map((g) => ({
        pedidoId: g.pedidoId,
        itens: g.itens
          .map((i) => ({ pedido_item_id: i.id, quantidade_recebida: qtds[i.id] ?? 0 }))
          .filter((i) => i.quantidade_recebida > 0),
      }))
      .filter((g) => g.itens.length > 0);

    if (!itensPorPedido.length) { setErro("Informe ao menos uma quantidade."); return; }

    pendingFn.current = async () => {
      start(async () => {
        try {
          const resultado = await registrarRecebimentoLote(romaneioId, data, obs, itensPorPedido);
          if (resultado.falhas.length === 0) {
            router.push(redirectHref);
            router.refresh();
            return;
          }
          setResultadoParcial((prev) => ({
            sucesso: [...(prev?.sucesso ?? []), ...resultado.sucesso],
            falhas: resultado.falhas,
          }));
          router.refresh();
        } catch (e: any) {
          setErro(e.message);
        }
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
            <Input label="Data de recebimento" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            <div>
              <label className="label">Observações <span className="text-text-3 font-normal">(opcional)</span></label>
              <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="NF, observações gerais…" />
            </div>
          </div>
        </div>

        {grupos.map((g) => (
          <div key={g.pedidoId}>
            <h2 className="mb-3 text-sm font-semibold text-text">
              Pedido {g.numero}
              {g.obraNome && <span className="font-normal text-text-3"> — {g.obraNome}</span>}
              {g.fornecedorNome && <span className="font-normal text-text-3"> — {g.fornecedorNome}</span>}
            </h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                    <th className="px-5 py-3 font-medium">Produto</th>
                    <th className="px-5 py-3 font-medium text-right">Pedido</th>
                    <th className="px-5 py-3 font-medium text-right">Já recebido</th>
                    <th className="px-5 py-3 font-medium text-right">Saldo</th>
                    <th className="px-5 py-3 font-medium text-right w-36">Receber agora</th>
                  </tr>
                </thead>
                <tbody>
                  {g.itens.map((it) => (
                    <tr key={it.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium text-text">{it.produto?.nome ?? it.descricao_snapshot}</p>
                        <p className="font-mono text-xs text-text-3">{it.produto?.codigo_mestre}</p>
                      </td>
                      <td className="px-5 py-3 text-right text-text-2">
                        {Number(it.quantidade_pedida).toLocaleString("pt-BR")} {it.unidade}
                      </td>
                      <td className="px-5 py-3 text-right text-success">
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
        ))}

        {erro && <p className="text-sm text-danger">{erro}</p>}

        {resultadoParcial && (
          <div className="card border border-warning p-4 space-y-2">
            <p className="text-sm font-semibold text-warning">
              Recebimento salvo parcialmente — revise antes de tentar novamente.
            </p>
            <ul className="text-sm space-y-1">
              {resultadoParcial.sucesso.map((s) => (
                <li key={s.pedidoId} className="text-success">
                  ✓ Pedido {s.numero}: registrado com sucesso ({s.statusResultante}).
                </li>
              ))}
              {resultadoParcial.falhas.map((f) => (
                <li key={f.pedidoId} className="text-danger">
                  ✗ Pedido {f.numero}: falhou — {f.mensagem}
                </li>
              ))}
            </ul>
            <p className="text-xs text-text-3">
              Os pedidos marcados com ✓ já foram gravados (não repita-os). Ajuste as
              quantidades dos pedidos com ✗ e confirme novamente — só eles serão reenviados.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Aguarde…" : "Confirmar recebimento"}
          </Button>
          <Button as="a" variant="ghost" href={redirectHref}>Cancelar</Button>
        </div>
      </form>
    </>
  );
}

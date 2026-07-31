"use client";

import { useState, useTransition } from "react";
import { Button } from "@/ui/components/Button";
import {
  processarRomaneioAction,
  confirmarRomaneioAction,
  type ResultadoProcessamentoRomaneio,
  type PedidoCandidatoRomaneio,
} from "@/modules/squadframe/actions/compras/romaneios";

export function NovoRomaneioCliente({ fornecedores }: { fornecedores: { id: string; nome: string }[] }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoProcessamentoRomaneio | null>(null);
  const [numero, setNumero] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [pedidosMarcados, setPedidosMarcados] = useState<Record<string, boolean>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [processando, startProcessar] = useTransition();
  const [confirmando, startConfirmar] = useTransition();

  function processar() {
    if (!arquivo) { setErro("Selecione um arquivo PDF."); return; }
    setErro(null);
    startProcessar(async () => {
      try {
        const fd = new FormData();
        fd.set("arquivo", arquivo);
        const r = await processarRomaneioAction(fd);
        setResultado(r);
        setNumero(r.numero ?? "");
        setDataEntrega(r.data_entrega ?? "");
        setFornecedorId(r.fornecedor?.id ?? "");
        setPedidosMarcados(Object.fromEntries(r.pedidosCandidatos.map((p: PedidoCandidatoRomaneio) => [p.id, true])));
      } catch (e: any) {
        setErro(e.message ?? "Falha ao processar o PDF.");
      }
    });
  }

  function confirmar() {
    if (!resultado) return;
    const pedidoIds = Object.entries(pedidosMarcados).filter(([, v]) => v).map(([id]) => id);
    if (!pedidoIds.length) { setErro("Selecione ao menos um pedido vinculado."); return; }
    setErro(null);
    startConfirmar(async () => {
      try {
        await confirmarRomaneioAction({
          numero: numero || null,
          data_entrega: dataEntrega || null,
          fornecedor_id: fornecedorId || null,
          pedidoIds,
          arquivoNome: resultado.arquivoNome,
          arquivoCaminho: resultado.arquivoCaminho,
        });
      } catch (e: any) {
        setErro(e.message ?? "Falha ao confirmar o romaneio.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <label className="label">Arquivo do romaneio (PDF)</label>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => { setArquivo(e.target.files?.[0] ?? null); setResultado(null); setErro(null); }}
          className="field"
        />
        <div className="mt-3">
          <Button onClick={processar} disabled={!arquivo || processando}>
            {processando ? "Lendo PDF…" : "Ler romaneio"}
          </Button>
        </div>
      </div>

      {resultado && (
        <div className="card p-5 space-y-5">
          <h2 className="text-sm font-semibold text-text">Confira os dados identificados</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Número do romaneio</label>
              <input value={numero} onChange={(e) => setNumero(e.target.value)} className="field" placeholder="Não identificado" />
            </div>
            <div>
              <label className="label">Data de entrega</label>
              <input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} className="field" />
            </div>
          </div>

          <div>
            <label className="label">
              Fornecedor {resultado.fornecedor ? <span className="text-success font-normal">(identificado automaticamente)</span> : <span className="text-warning font-normal">(não identificado — selecione manualmente)</span>}
            </label>
            <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} className="field">
              <option value="">Selecione…</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              Pedidos identificados neste romaneio {resultado.pedidosCandidatos.length === 0 && <span className="text-warning font-normal">(nenhum encontrado — confira o PDF)</span>}
            </label>
            <div className="mt-1 divide-y divide-border rounded-lg border border-border">
              {resultado.pedidosCandidatos.map((p) => (
                <label key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pedidosMarcados[p.id] ?? false}
                    onChange={(e) => setPedidosMarcados((prev) => ({ ...prev, [p.id]: e.target.checked }))}
                  />
                  <span className="font-mono text-xs font-semibold text-primary">{p.numero}</span>
                  <span className="text-text-2">{p.obra ?? "—"}</span>
                  <span className="ml-auto text-text-3 text-xs">{p.fornecedor ?? "—"}</span>
                </label>
              ))}
            </div>
          </div>

          {erro && <p className="text-sm text-danger">{erro}</p>}

          <Button onClick={confirmar} disabled={confirmando}>
            {confirmando ? "Confirmando…" : "Confirmar romaneio"}
          </Button>

          <details className="rounded-lg border border-border">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-text-3">
              Diagnóstico da leitura (texto extraído do PDF)
            </summary>
            <div className="border-t border-border px-3 py-2 space-y-2">
              <p className="text-xs text-text-3">
                Tokens numéricos encontrados: {resultado.tokensNumericos.length ? resultado.tokensNumericos.join(", ") : "nenhum"}
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-bg p-2 text-[11px] text-text-2">
                {resultado.texto.trim() || "(nenhum texto extraído do PDF — provavelmente é um PDF escaneado/imagem, sem camada de texto)"}
              </pre>
            </div>
          </details>
        </div>
      )}

      {!resultado && erro && <p className="text-sm text-danger">{erro}</p>}
    </div>
  );
}

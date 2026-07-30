"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ajustarSaldoFornecedor } from "@/modules/squadframe/actions/compras/carteira-ajustes";
import { Button } from "@/ui/components/Button";

export interface FornecedorSaldoOpcao {
  fornecedorId: string;
  fornecedor: string;
  saldoAtual: number;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AjusteSaldoForm({ fornecedores }: { fornecedores: FornecedorSaldoOpcao[] }) {
  const [fornecedorId, setFornecedorId] = useState("");
  const [valorNovo, setValorNovo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const router = useRouter();

  const selecionado = fornecedores.find((f) => f.fornecedorId === fornecedorId) ?? null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const result = await ajustarSaldoFornecedor(fd);
      setOk(`Saldo ajustado: ${fmt(result.valor_anterior)} → ${fmt(result.valor_novo)}.`);
      setValorNovo("");
      setMotivo("");
      router.refresh();
    } catch (err: any) {
      setErro(err.message ?? "Erro ao ajustar saldo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-3">Ajustar saldo (correção)</h2>
      <p className="mt-1 text-xs text-text-3 max-w-xl">
        Corrige o saldo total do fornecedor (soma entre todas as obras). Se aumentar, vira um
        depósito "Ajuste interno: seu nome"; se diminuir, vira um débito com a mesma descrição — o
        motivo digitado aqui fica registrado à parte, pra auditoria.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label">Fornecedor</label>
          <select
            name="fornecedor_id"
            required
            value={fornecedorId}
            onChange={(e) => setFornecedorId(e.target.value)}
            className="field h-9 text-sm"
          >
            <option value="" disabled>Selecione…</option>
            {fornecedores.map((f) => (
              <option key={f.fornecedorId} value={f.fornecedorId}>{f.fornecedor} (saldo atual: {fmt(f.saldoAtual)})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Novo saldo (R$)</label>
          <input
            name="valor_novo"
            type="number"
            step="0.01"
            min="0"
            required
            value={valorNovo}
            onChange={(e) => setValorNovo(e.target.value)}
            placeholder={selecionado ? String(selecionado.saldoAtual) : "0,00"}
            className="field h-9 text-sm"
          />
        </div>

        <div className="sm:col-span-3">
          <label className="label">Motivo <span className="text-danger">*</span></label>
          <input
            name="motivo"
            type="text"
            required
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: conferência com o fornecedor apontou divergência na NF 1234"
            className="field h-9 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Button type="submit" disabled={pending} className="disabled:opacity-50">
          {pending ? "Ajustando…" : "Ajustar saldo"}
        </Button>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        {ok && <p className="text-sm text-success">{ok}</p>}
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { depositarCarteira } from "@/modules/squadframe/actions/compras/financeiro";
import { Button } from "@/ui/components/Button";

type Fornecedor = { id: string; nome: string };

export function ObraDepositarForm({
  obraId,
  fornecedores,
}: {
  obraId: string;
  fornecedores: Fornecedor[];
}) {
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("obra_id", obraId);
      const result = await depositarCarteira(fd);
      setOk(
        `Depósito registrado. Saldo: ${result.novo_saldo.toLocaleString("pt-BR", {
          style: "currency", currency: "BRL",
        })}`
      );
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err: any) {
      setErro(err.message ?? "Erro ao registrar depósito.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
      <div>
        <label className="label">Fornecedor</label>
        <select name="fornecedor_id" required className="field h-9 text-sm">
          <option value="">Selecione…</option>
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>{f.nome}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Valor (R$)</label>
        <input
          name="valor"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0,00"
          className="field h-9 text-sm"
        />
      </div>

      <div>
        <label className="label">Descrição (opcional)</label>
        <input
          name="descricao"
          type="text"
          maxLength={200}
          placeholder="NF, referência…"
          className="field h-9 text-sm"
        />
      </div>

      <div className="sm:col-span-3 flex items-center gap-4">
        <Button type="submit" disabled={pending} className="disabled:opacity-50">
          {pending ? "Registrando…" : "Registrar depósito"}
        </Button>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        {ok && <p className="text-sm text-success">{ok}</p>}
      </div>
    </form>
  );
}

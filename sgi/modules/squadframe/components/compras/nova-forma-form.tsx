"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarFormaPagamento } from "@/app/squadframe/compras/actions";
import { Button } from "@/ui/components/Button";

export function NovaFormaForm() {
  const [isFaturamentoDireto, setIsFaturamentoDireto] = useState(false);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("is_faturamento_direto", String(isFaturamentoDireto));
      await criarFormaPagamento(fd);
      (e.target as HTMLFormElement).reset();
      setIsFaturamentoDireto(false);
      router.refresh();
    } catch (err: any) {
      setErro(err.message ?? "Erro ao criar forma de pagamento.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <div>
        <label className="label">Nome <span className="text-danger">*</span></label>
        <input
          name="nome" required className="field"
          placeholder="Ex: Faturamento 30 dias, PIX, Boleto…"
        />
      </div>
      <div>
        <label className="label">Descrição <span className="text-text-3 font-normal">(opcional)</span></label>
        <input name="descricao" className="field" placeholder="Detalhes adicionais" />
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <div
          onClick={() => setIsFaturamentoDireto((v) => !v)}
          className={`mt-0.5 relative h-5 w-9 rounded-full transition-colors shrink-0 ${isFaturamentoDireto ? "bg-primary" : "bg-border"}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isFaturamentoDireto ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-text">Faturamento Direto</p>
          <p className="text-xs text-text-3">
            Ao selecionar esta forma em um pedido, o valor será debitado automaticamente da carteira da obra ao emitir.
          </p>
        </div>
      </label>

      {erro && <p className="text-sm text-danger">{erro}</p>}
      <Button type="submit" disabled={pending} className="w-full disabled:opacity-50">
        {pending ? "Adicionando…" : "Adicionar"}
      </Button>
    </form>
  );
}

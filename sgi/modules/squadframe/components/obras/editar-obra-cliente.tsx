"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editarObra } from "@/modules/squadframe/actions/obras/actions";
import { Button } from "@/ui/components/Button";

export function EditarObraCliente({ obra }: { obra: any }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await editarObra(obra.id, fd);
        router.refresh();
        router.push(`/squadframe/obras/${obra.id}`);
      } catch (err: any) {
        setErro(err.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nome da obra <span className="text-danger">*</span></label>
          <input name="nome" required defaultValue={obra.nome} className="field" />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Cliente <span className="text-danger">*</span></label>
          <input name="cliente_nome" required defaultValue={obra.cliente?.nome ?? ""} className="field" placeholder="Nome do cliente" />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Endereço <span className="text-text-2 font-normal">(opcional)</span></label>
          <input name="endereco" defaultValue={obra.endereco ?? ""} className="field" placeholder="Rua, número" />
        </div>

        <div>
          <label className="label">Cidade <span className="text-text-2 font-normal">(opcional)</span></label>
          <input name="cidade" defaultValue={obra.cidade ?? ""} className="field" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">UF <span className="text-text-2 font-normal">(opcional)</span></label>
            <input name="estado" maxLength={2} defaultValue={obra.estado ?? ""} className="field uppercase" placeholder="SP" />
          </div>
          <div>
            <label className="label">CEP <span className="text-text-2 font-normal">(opcional)</span></label>
            <input name="cep" defaultValue={obra.cep ?? ""} className="field" placeholder="00000-000" />
          </div>
        </div>

        <div>
          <label className="label">Data prevista <span className="text-text-2 font-normal">(opcional)</span></label>
          <input
            type="date"
            name="data_prevista"
            defaultValue={obra.data_prevista ? obra.data_prevista.slice(0, 10) : ""}
            className="field"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Observações</label>
          <textarea name="observacoes" rows={3} defaultValue={obra.observacoes ?? ""} className="field" />
        </div>
      </div>

      {erro && (
        <p className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{erro}</p>
      )}

      <div className="mt-6 flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
        <Button as="a" href={`/squadframe/obras/${obra.id}`} variant="ghost">Cancelar</Button>
      </div>
    </form>
  );
}

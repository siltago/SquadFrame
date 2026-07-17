"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarObraAction, editarObraAction } from "@/modules/wise/works/actions";
import { Button } from "@/ui/components/Button";
import type { WiseObra, WiseObraStatusRow, WiseCliente } from "@/modules/wise/works/types";
import type { WiseUnidade } from "@/modules/wise/organizations/types";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

interface Props {
  obra?: WiseObra;
  clientes: WiseCliente[];
  statusOptions: WiseObraStatusRow[];
  unidades: WiseUnidade[];
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
}

export function ObraForm({ obra, clientes, statusOptions, unidades, onSuccess, onCancel }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      nome:                    String(fd.get("nome") || "").trim(),
      cliente_id:              String(fd.get("cliente_id") || ""),
      unidade_id:              String(fd.get("unidade_id") || "") || null,
      status_id:               String(fd.get("status_id") || ""),
      endereco:                String(fd.get("endereco") || "").trim() || null,
      cidade:                  String(fd.get("cidade") || "").trim() || null,
      estado:                  String(fd.get("estado") || "") || null,
      cep:                     String(fd.get("cep") || "").trim() || null,
      responsavel_comercial_id:String(fd.get("responsavel_comercial_id") || "") || null,
      responsavel_tecnico_id:  String(fd.get("responsavel_tecnico_id") || "") || null,
      data_prevista:           String(fd.get("data_prevista") || "") || null,
      observacoes:             String(fd.get("observacoes") || "").trim() || null,
    };
    setErro(null);
    start(async () => {
      const resultado = obra
        ? await editarObraAction(obra.id, input)
        : await criarObraAction(input);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      if (onSuccess) {
        onSuccess(obra?.id ?? (resultado as any).data?.id ?? "");
      } else {
        router.push("/squadwise/obras");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identificação */}
      <fieldset className="card p-5 space-y-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-text-3">
          Identificação
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome da obra <span className="text-danger">*</span></label>
            <input name="nome" required defaultValue={obra?.nome ?? ""} className="field" placeholder="Ex: Residencial Parque das Flores" />
          </div>
          <div>
            <label className="label">Cliente <span className="text-danger">*</span></label>
            <select name="cliente_id" required defaultValue={obra?.cliente_id ?? ""} className="field">
              <option value="">Selecione o cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status <span className="text-danger">*</span></label>
            <select name="status_id" required defaultValue={obra?.status_id ?? (statusOptions[0]?.id ?? "")} className="field">
              {statusOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Unidade responsável</label>
            <select name="unidade_id" defaultValue={obra?.unidade_id ?? ""} className="field">
              <option value="">Sem unidade específica</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.nome} ({u.codigo})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Prazo previsto</label>
            <input name="data_prevista" type="date" defaultValue={obra?.data_prevista ?? ""} className="field" />
          </div>
        </div>
      </fieldset>

      {/* Localização */}
      <fieldset className="card p-5 space-y-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-text-3">
          Localização
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="label">Endereço</label>
            <input name="endereco" defaultValue={obra?.endereco ?? ""} className="field" placeholder="Rua, número, bairro" />
          </div>
          <div>
            <label className="label">Cidade</label>
            <input name="cidade" defaultValue={obra?.cidade ?? ""} className="field" placeholder="São Paulo" />
          </div>
          <div>
            <label className="label">Estado</label>
            <select name="estado" defaultValue={obra?.estado ?? ""} className="field">
              <option value="">—</option>
              {ESTADOS_BR.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="label">CEP</label>
            <input name="cep" defaultValue={obra?.cep ?? ""} className="field" placeholder="00000-000" maxLength={10} />
          </div>
        </div>
      </fieldset>

      {/* Observações */}
      <fieldset className="card p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-text-3">
          Observações
        </legend>
        <textarea name="observacoes" defaultValue={obra?.observacoes ?? ""} rows={3}
          className="field mt-2 resize-none" placeholder="Informações adicionais sobre a obra…" />
      </fieldset>

      {erro && <p className="text-sm text-danger">{erro}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : obra ? "Salvar alterações" : "Criar obra"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

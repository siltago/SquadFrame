"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarPacoteAction, editarPacoteAction } from "@/modules/wise/work-packages/actions";
import { Button } from "@/ui/components/Button";
import {
  MODULOS_LABEL, PRIORIDADE_LABEL,
  type WisePacote, type WisePacoteInput, type WisePacoteModulo, type WisePrioridade,
} from "@/modules/wise/work-packages/types";
import type { WiseObraEstrutura } from "@/modules/wise/works/types";

const TODOS_MODULOS: WisePacoteModulo[] = ["frame", "board", "flow", "stock", "measure"];
const PRIORIDADES: WisePrioridade[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];

interface Props {
  obraId: string;
  obraNome: string;
  pacote?: WisePacote;
  arvoreEstrutura?: WiseObraEstrutura[];
  responsaveis?: { id: string; nome: string }[];
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function PacoteForm({
  obraId, obraNome, pacote, arvoreEstrutura = [], responsaveis = [], onCancel, onSuccess,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const modulosAtuais = (pacote?.modulos ?? [])
    .filter((m) => m.habilitado)
    .map((m) => m.modulo);

  const [modulosSelecionados, setModulosSelecionados] = useState<WisePacoteModulo[]>(
    modulosAtuais.length > 0 ? modulosAtuais : ["frame", "board"],
  );

  function toggleModulo(m: WisePacoteModulo) {
    setModulosSelecionados((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input: WisePacoteInput = {
      obra_id:         obraId,
      nome:            String(fd.get("nome") || "").trim(),
      descricao:       String(fd.get("descricao") || "").trim() || null,
      prioridade:      (String(fd.get("prioridade") || "") as WisePrioridade) || null,
      prazo:           String(fd.get("prazo") || "") || null,
      responsavel_id:  String(fd.get("responsavel_id") || "") || null,
      tipo:            String(fd.get("tipo") || "").trim() || null,
      modulos:         modulosSelecionados,
    };
    setErro(null);
    start(async () => {
      const resultado = pacote
        ? await editarPacoteAction(pacote.id, obraId, input)
        : await criarPacoteAction(input);
      if (!resultado.ok) { setErro(resultado.erro); return; }
      if (onSuccess) { onSuccess(); return; }
      router.push(`/squadwise/obras/${obraId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identificação */}
      <fieldset className="card p-5 space-y-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-text-3">
          Identificação
        </legend>
        <div className="text-xs text-text-3 bg-bg rounded px-3 py-2 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Obra: <span className="font-medium text-text">{obraNome}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome do pacote <span className="text-danger">*</span></label>
            <input name="nome" required defaultValue={pacote?.nome ?? ""} className="field"
              placeholder="Ex: Torre A — Pavimentos 01 ao 05" />
          </div>
          <div>
            <label className="label">Tipo</label>
            <input name="tipo" defaultValue={pacote?.tipo ?? ""} className="field"
              placeholder="Ex: Fachada, Esquadrias internas…" />
          </div>
          <div>
            <label className="label">Prioridade</label>
            <select name="prioridade" defaultValue={pacote?.prioridade ?? ""} className="field">
              <option value="">Não definida</option>
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Prazo</label>
            <input name="prazo" type="date" defaultValue={pacote?.prazo ?? ""} className="field" />
          </div>
          <div>
            <label className="label">Responsável</label>
            <select name="responsavel_id" defaultValue={pacote?.responsavel_id ?? ""} className="field">
              <option value="">Sem responsável</option>
              {responsaveis.map((r) => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descrição</label>
            <textarea name="descricao" rows={2} defaultValue={pacote?.descricao ?? ""}
              className="field resize-none" placeholder="Descreva o escopo resumido deste pacote…" />
          </div>
        </div>
      </fieldset>

      {/* Módulos participantes */}
      <fieldset className="card p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-text-3">
          Módulos participantes
        </legend>
        <p className="mt-2 mb-4 text-xs text-text-3">
          Selecione quais módulos do SquadSystem irão operar sobre este pacote.
          Eventos serão enviados apenas para os módulos selecionados.
        </p>
        <div className="space-y-2">
          {TODOS_MODULOS.map((m) => (
            <label key={m} className="flex items-center gap-3 cursor-pointer group">
              <div onClick={() => toggleModulo(m)}
                className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                  modulosSelecionados.includes(m)
                    ? "border-primary bg-primary"
                    : "border-border bg-surface group-hover:border-primary/50"
                }`}>
                {modulosSelecionados.includes(m) && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <span className="text-sm text-text">{MODULOS_LABEL[m]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {erro && <p className="text-sm text-danger">{erro}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : pacote ? "Salvar alterações" : "Criar pacote"}
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

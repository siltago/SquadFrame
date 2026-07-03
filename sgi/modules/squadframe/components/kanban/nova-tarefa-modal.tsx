"use client";

import { useRef, useState, useTransition } from "react";
import { criarTarefa } from "@/modules/squadframe/actions/tarefas/actions";
import { Button } from "@/ui/components/Button";

interface Props {
  colunaId: string;
  setorId: string | null;
  usuarioId: string | null;
  onClose: () => void;
}

export function NovaTarefaModal({ colunaId, setorId, usuarioId, onClose }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    fd.set("coluna_id", colunaId);
    if (setorId) fd.set("setor_id", setorId);
    setErro(null);
    startTransition(async () => {
      const res = await criarTarefa(fd);
      if (!res.ok) {
        setErro((res as any).erro ?? "Erro ao criar tarefa");
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-2xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-text text-base">Nova Tarefa</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-3 hover:bg-bg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Título *</label>
            <input name="titulo" required className="field" placeholder="Descreva a tarefa..." autoFocus />
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea name="descricao" className="field resize-none" rows={3} placeholder="Detalhes opcionais..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prioridade</label>
              <select name="prioridade" defaultValue="MEDIA" className="field">
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
            <div>
              <label className="label">Data Limite</label>
              <input name="data_limite" type="date" className="field" />
            </div>
          </div>

          {erro && <p className="text-sm text-danger">{erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Criando..." : "Criar Tarefa"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

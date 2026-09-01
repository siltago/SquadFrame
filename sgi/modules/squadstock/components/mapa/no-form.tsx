"use client";

import { useState, useTransition } from "react";
import { Button } from "@/ui/components/Button";
import { criarNo, editarNo } from "@/modules/squadstock/actions/mapa";

interface NoFormProps {
  parentId: string | null;
  no?: { id: string; nome: string; nivel_tipo: string | null; ordem: number };
  onDone: () => void;
  onCancel: () => void;
}

// Form inline (não modal) — criado embaixo do nó pai (novo filho) ou no
// lugar do próprio nó (edição), mesma ideia de "form aparece onde a
// ação foi pedida" já usada em nova-aba-inline.tsx do catálogo.
export function NoForm({ parentId, no, onDone, onCancel }: NoFormProps) {
  const [nome, setNome] = useState(no?.nome ?? "");
  const [nivelTipo, setNivelTipo] = useState(no?.nivel_tipo ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submeter(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      try {
        if (no) {
          await editarNo(no.id, formData);
        } else {
          formData.set("parent_id", parentId ?? "");
          await criarNo(formData);
        }
        onDone();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao salvar.");
      }
    });
  }

  return (
    <form action={submeter} className="card flex flex-wrap items-end gap-2 p-3">
      {no && <input type="hidden" name="parent_id" value={parentId ?? ""} />}
      <input type="hidden" name="ordem" value={no?.ordem ?? 0} />
      <div className="min-w-[160px] flex-1">
        <label className="label">Nome</label>
        <input
          name="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Galpão A, Prateleira 3…"
          required
          autoFocus
          className="field h-9 text-sm"
        />
      </div>
      <div className="min-w-[140px]">
        <label className="label">Tipo de nível</label>
        <input
          name="nivel_tipo"
          value={nivelTipo}
          onChange={(e) => setNivelTipo(e.target.value)}
          placeholder="Ex: Sala, Corredor…"
          className="field h-9 text-sm"
        />
      </div>
      <Button type="submit" size="sm" variant="accent" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
        Cancelar
      </Button>
      {erro && <p className="w-full text-xs text-danger">{erro}</p>}
    </form>
  );
}

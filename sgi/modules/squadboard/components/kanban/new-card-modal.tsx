"use client";

import { useState } from "react";
import { Modal } from "@/ui/components/Modal";
import { Input } from "@/ui/components/Input";
import { Button } from "@/ui/components/Button";

export function NewCardModal({
  open, onClose, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (titulo: string) => void;
}) {
  const [titulo, setTitulo] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    onCreate(titulo.trim());
    setTitulo("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo card" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Título"
          autoFocus
          placeholder="Ex: Revisar contrato do fornecedor X"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={!titulo.trim()}>Criar card</Button>
        </div>
      </form>
    </Modal>
  );
}

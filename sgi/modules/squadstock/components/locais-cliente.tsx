"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { criarLocal, desativarLocal } from "@/modules/squadstock/actions/locais";

interface Local {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
}

const TIPO_LABEL: Record<string, string> = {
  GALPAO: "Galpão",
  FILIAL: "Filial",
  OUTRO: "Outro",
};

export function LocaisCliente({ locais, podeGerenciar }: { locais: Local[]; podeGerenciar: boolean }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("GALPAO");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submeter(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      try {
        await criarLocal(formData);
        setNome("");
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao criar local.");
      }
    });
  }

  function remover(id: string) {
    startTransition(async () => {
      try {
        await desativarLocal(id);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao desativar local.");
      }
    });
  }

  return (
    <div className="mt-6">
      {podeGerenciar && (
        <form action={submeter} className="card flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="label">Nome</label>
            <input
              name="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Galpão 1"
              required
              className="field h-9 text-sm"
            />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="field h-9 text-sm">
              <option value="GALPAO">Galpão</option>
              <option value="FILIAL">Filial</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Salvando…" : "Novo local"}
          </Button>
          {erro && <p className="text-sm text-danger">{erro}</p>}
        </form>
      )}

      <div className="mt-4 card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-5 py-2 font-medium">Nome</th>
              <th className="px-5 py-2 font-medium">Tipo</th>
              <th className="px-5 py-2 font-medium">Status</th>
              {podeGerenciar && <th className="px-5 py-2 font-medium text-right">Ação</th>}
            </tr>
          </thead>
          <tbody>
            {locais.length === 0 ? (
              <tr>
                <td colSpan={podeGerenciar ? 4 : 3} className="px-5 py-8 text-center text-sm text-text-3">
                  Nenhum local cadastrado ainda.
                </td>
              </tr>
            ) : locais.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5 font-medium">{l.nome}</td>
                <td className="px-5 py-2.5 text-text-2">{TIPO_LABEL[l.tipo] ?? l.tipo}</td>
                <td className="px-5 py-2.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${l.ativo ? "bg-success-soft text-success" : "bg-surface-2 text-text-3"}`}>
                    {l.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                {podeGerenciar && (
                  <td className="px-5 py-2.5 text-right">
                    {l.ativo && (
                      <button onClick={() => remover(l.id)} disabled={pending} className="text-xs font-medium text-danger hover:underline disabled:opacity-50">
                        Desativar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { registrarSaida, registrarAjuste } from "@/app/squadstock/actions";

interface Produto {
  id: string;
  codigo_mestre: string;
  nome: string;
}

interface Obra {
  id: string;
  nome: string;
}

interface Local {
  id: string;
  caminho: string;
}

interface CorRal {
  id: string;
  codigo_ral: string;
  nome: string | null;
}

export function NovaMovimentacaoForm({
  obras, produtos, locais, coresRal, defaultObraId, defaultProdutoId, defaultLocalId,
}: {
  obras: Obra[]; produtos: Produto[]; locais: Local[]; coresRal: CorRal[];
  defaultObraId?: string; defaultProdutoId?: string; defaultLocalId?: string;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"SAIDA" | "AJUSTE">("SAIDA");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submeter(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      try {
        if (tipo === "SAIDA") {
          await registrarSaida(formData);
        } else {
          await registrarAjuste(formData);
        }
        router.push("/squadstock/movimentacoes");
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao registrar movimentação.");
      }
    });
  }

  return (
    <form action={submeter} className="mt-6 space-y-5 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Tipo</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipo("SAIDA")}
            className={`rounded border px-3 py-1.5 text-sm font-medium transition-colors ${tipo === "SAIDA" ? "border-primary bg-primary text-white" : "border-border text-text-2 hover:border-primary/40"}`}
          >
            Saída (consumo)
          </button>
          <button
            type="button"
            onClick={() => setTipo("AJUSTE")}
            className={`rounded border px-3 py-1.5 text-sm font-medium transition-colors ${tipo === "AJUSTE" ? "border-primary bg-primary text-white" : "border-border text-text-2 hover:border-primary/40"}`}
          >
            Ajuste (correção)
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Local</label>
        <select name="local_id" required defaultValue={defaultLocalId ?? ""} className="field w-full">
          <option value="" disabled>
            Selecione um local
          </option>
          {locais.map((l) => (
            <option key={l.id} value={l.id}>
              {l.caminho}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">
          Obra <span className="font-normal text-text-3">(opcional — reserva o saldo pra ela)</span>
        </label>
        <select name="obra_id" defaultValue={defaultObraId ?? ""} className="field w-full">
          <option value="">Nenhuma (estoque geral)</option>
          {obras.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Produto</label>
        <select name="produto_id" required defaultValue={defaultProdutoId ?? ""} className="field w-full">
          <option value="" disabled>
            Selecione um produto
          </option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo_mestre} — {p.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">
          Cor <span className="font-normal text-text-3">(opcional — só relevante pra perfil/conexões)</span>
        </label>
        <select name="cor_id" defaultValue="" className="field w-full">
          <option value="">Sem cor (natural)</option>
          {coresRal.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo_ral}{c.nome ? ` — ${c.nome}` : ""}
            </option>
          ))}
        </select>
      </div>

      {tipo === "AJUSTE" && (
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Direção do ajuste</label>
          <select name="direcao" defaultValue="positivo" className="field w-full">
            <option value="positivo">Adicionar (saldo maior do que o sistema tinha)</option>
            <option value="negativo">Remover (saldo menor do que o sistema tinha)</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Quantidade</label>
        <input type="number" name="quantidade" step="0.001" min="0.001" required className="field w-full" />
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">
          Observações {tipo === "AJUSTE" && <span className="text-danger">*</span>}
        </label>
        <textarea
          name="observacoes"
          required={tipo === "AJUSTE"}
          rows={3}
          placeholder={tipo === "AJUSTE" ? "Motivo do ajuste (obrigatório)" : "Opcional"}
          className="field w-full"
        />
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Registrando…" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}

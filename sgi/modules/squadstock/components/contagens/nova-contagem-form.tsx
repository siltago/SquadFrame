"use client";

import { useMemo, useState } from "react";
import { Button } from "@/ui/components/Button";
import { ServerActionForm } from "@/ui/components/ServerActionForm";
import { criarContagem } from "@/modules/squadstock/actions/contagens";

interface LocalOpcao {
  id: string;
  caminho: string;
  sugestaoFrequencia: string | null;
}
interface TipoOpcao {
  id: string;
  nome: string;
  slug: string;
}
interface LinhaOpcao {
  id: string;
  nome: string;
  tipo: string;
}

export function NovaContagemForm({
  locais,
  tipos,
  linhas,
}: {
  locais: LocalOpcao[];
  tipos: TipoOpcao[];
  linhas: LinhaOpcao[];
}) {
  const [filtroTipo, setFiltroTipo] = useState("");
  const [localId, setLocalId] = useState("");

  // Linha só faz sentido depois de escolhido o tipo — evita listar centenas
  // de linhas de todo o catálogo de uma vez num único <select>.
  const linhasDoTipo = useMemo(
    () => (filtroTipo ? linhas.filter((l) => l.tipo === filtroTipo) : []),
    [linhas, filtroTipo]
  );

  const localSelecionado = useMemo(() => locais.find((l) => l.id === localId) ?? null, [locais, localId]);

  return (
    <ServerActionForm action={criarContagem} className="mt-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Local (raiz da contagem)</label>
        <select
          name="local_raiz_id"
          required
          value={localId}
          onChange={(e) => setLocalId(e.target.value)}
          className="field w-full"
        >
          <option value="" disabled>
            Selecione um local
          </option>
          {locais.map((l) => (
            <option key={l.id} value={l.id}>
              {l.caminho}
              {l.sugestaoFrequencia ? ` (sugestão: ${l.sugestaoFrequencia})` : ""}
            </option>
          ))}
        </select>
        {localSelecionado?.sugestaoFrequencia && (
          <p className="mt-1.5 text-xs text-text-3">
            Baseado na movimentação dos últimos 90 dias, a sugestão de 1ª versão é contar esse local com frequência{" "}
            <strong className="text-text-2">{localSelecionado.sugestaoFrequencia.toLowerCase()}</strong> — não é uma regra fixa.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">
          Tipo <span className="font-normal text-text-3">(opcional — perfil, componente, etc.)</span>
        </label>
        <select
          name="filtro_tipo"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="field w-full"
        >
          <option value="">Todos os tipos</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.slug}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>

      {filtroTipo && (
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Linha <span className="font-normal text-text-3">(opcional — restringe a uma linha específica)</span>
          </label>
          <select name="filtro_linha_id" defaultValue="" className="field w-full">
            <option value="">Todas as linhas do tipo</option>
            {linhasDoTipo.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Modo de contagem</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/5">
            <input type="radio" name="modo" value="SISTEMA" defaultChecked className="mt-0.5" />
            <span>
              <span className="block font-medium text-text">Sistema</span>
              <span className="block text-xs text-text-3">Conta direto na tela, item por item.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/5">
            <input type="radio" name="modo" value="PAPEL" className="mt-0.5" />
            <span>
              <span className="block font-medium text-text">Papel</span>
              <span className="block text-xs text-text-3">Imprime a folha, confere manual e digita depois.</span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit">Criar contagem</Button>
      </div>
    </ServerActionForm>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editarProduto } from "@/modules/squadframe/actions/catalogo/actions";
import { BotaoExcluir } from "./botao-excluir";
import { specLabels, TIPO_UNIDADE_OPCOES } from "@/modules/squadframe/lib/tipo-unidade";
import { Button } from "@/ui/components/Button";

type Produto = {
  id: string; codigo_mestre: string; nome: string; unidade: string;
  status: boolean; descricao?: string | null; observacoes?: string | null;
  fornecedor_mestre_id?: string | null;
  peso_metro?: number | null; preco_metro?: number | null; preco_kg?: number | null; tamanho_mm?: number | null;
  linha?: { nome: string; fabricante?: string | null } | null;
  categoria?: { id?: string; nome: string } | null;
};
type Fornecedor = { id: string; nome: string };
type LinhaDisp = { id: string; nome: string };
type CategoriaDisp = { id: string; nome: string; linha_id: string };

export function AbaGeral({
  produto, linhaId, tipoUnidade, fornecedoresDisponiveis, linhasDisponiveis, todasCategorias,
}: {
  produto: Produto; linhaId: string; tipoUnidade?: string | null;
  fornecedoresDisponiveis: Fornecedor[];
  linhasDisponiveis?: LinhaDisp[];
  todasCategorias?: CategoriaDisp[];
}) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [linhaIdSelecionada, setLinhaIdSelecionada] = useState(linhaId);
  const [categoriaIdSelecionada, setCategoriaIdSelecionada] = useState((produto.categoria as any)?.id ?? "");
  const [statusAtivo, setStatusAtivo] = useState(produto.status);
  const router = useRouter();

  const labels = specLabels(tipoUnidade);
  const showTamanho = !!labels.tamanho;
  const showSpecs = tipoUnidade && tipoUnidade !== "UN" && tipoUnidade !== "CX";

  // Categorias filtradas pela linha selecionada no form
  const categoriasDaLinha = (todasCategorias ?? []).filter(
    (c) => c.linha_id === linhaIdSelecionada
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const result = await editarProduto(produto.id, linhaId, fd);
        if (result?.redirect) {
          router.push(result.redirect);
        } else {
          setEditando(false);
          router.refresh();
        }
      } catch (err: any) { setErro(err.message); }
    });
  }

  const linha = produto.linha as any;
  const categoria = produto.categoria as any;

  if (editando) {
    return (
      <div className="mt-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-2">Editar produto</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Código mestre</label>
              <input name="codigo_mestre" defaultValue={produto.codigo_mestre} required className="field font-mono" />
            </div>
            <div>
              <label className="label">Unidade</label>
              <select name="unidade" defaultValue={produto.unidade} required className="field">
                {TIPO_UNIDADE_OPCOES.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Nome técnico</label>
              <input name="nome" defaultValue={produto.nome} required className="field" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Fornecedor principal <span className="text-text-3 font-normal">(quem usa o código mestre)</span></label>
              <select name="fornecedor_mestre_id" defaultValue={produto.fornecedor_mestre_id ?? ""} className="field">
                <option value="">Sem fornecedor</option>
                {fornecedoresDisponiveis.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>

            {(linhasDisponiveis?.length ?? 0) > 1 && (
              <div>
                <label className="label">Linha</label>
                <select
                  name="linha_id"
                  value={linhaIdSelecionada}
                  onChange={(e) => {
                    setLinhaIdSelecionada(e.target.value);
                    setCategoriaIdSelecionada(""); // reset categoria ao trocar linha
                  }}
                  className="field"
                >
                  {linhasDisponiveis!.map((l) => (
                    <option key={l.id} value={l.id}>{l.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label">Categoria</label>
              <select
                name="categoria_id"
                value={categoriaIdSelecionada}
                onChange={(e) => setCategoriaIdSelecionada(e.target.value)}
                className="field"
              >
                <option value="">Sem categoria</option>
                {categoriasDaLinha.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            {showSpecs && (
              <div className="sm:col-span-2 border-t border-border pt-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-3">Especificações</p>
                <div className={`grid grid-cols-1 gap-4 ${showTamanho ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                  {showTamanho && (
                    <div>
                      <label className="label">{labels.tamanho}</label>
                      <input name="tamanho_mm" type="number" step="any" min="0"
                        defaultValue={produto.tamanho_mm ?? ""} className="field" placeholder="Ex: 6000" />
                    </div>
                  )}
                  <div>
                    <label className="label">{labels.peso}</label>
                    <input name="peso_metro" type="number" step="any" min="0"
                      defaultValue={produto.peso_metro ?? ""} className="field" placeholder="Ex: 1.23" />
                  </div>
                  <div>
                    <label className="label">{labels.preco}</label>
                    <input name="preco_metro" type="number" step="any" min="0"
                      defaultValue={produto.preco_metro ?? ""} className="field" placeholder="Ex: 12.50" />
                  </div>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="label">Descrição</label>
              <textarea name="descricao" defaultValue={produto.descricao ?? ""} rows={2} className="field" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observações</label>
              <textarea name="observacoes" defaultValue={produto.observacoes ?? ""} rows={2} className="field" />
            </div>
            <div className="flex items-center gap-3">
              <label className="label mb-0">Status</label>
              <label className="relative inline-flex cursor-pointer items-center gap-2 text-sm">
                <input type="hidden" name="status" value="false" disabled={statusAtivo} />
                <input type="checkbox" name="status" value="true"
                  checked={statusAtivo}
                  onChange={(e) => setStatusAtivo(e.target.checked)}
                  className="h-4 w-4 rounded" />
                <span className="text-text-2">Ativo</span>
              </label>
            </div>
          </div>

          {erro && <p className="text-xs text-danger">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setEditando(false); setErro(null); }}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── Modo visualização ─────────────────────────────────────────

  const sufixoTamanho = tipoUnidade === "CHAPA" ? "mm (espessura)" : "mm";
  const sufixoPeso    = (tipoUnidade === "CHAPA" || tipoUnidade === "M2") ? "kg/m²" : "kg/m";
  const isBarra       = tipoUnidade?.toUpperCase() === "BARRA";
  const sufixoPreco   = (tipoUnidade === "CHAPA" || tipoUnidade === "M2") ? "/m²" : "/m";
  // Perfil (BARRA): preço é cotado por kg (preco_kg, calculado automaticamente
  // pelos pedidos confirmados no mês — ver recalcularPrecoKgPerfis), não por
  // metro. preco_metro continua existindo só como valor derivado (peso × preco_kg).
  const precoExibido = isBarra && produto.preco_kg != null ? produto.preco_kg : produto.preco_metro;
  const sufixoPrecoExibido = isBarra ? "/kg" : sufixoPreco;

  return (
    <div className="mt-6 max-w-2xl">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-2">
            Dados do produto
          </h2>
          <Button variant="ghost" onClick={() => setEditando(true)} className="text-xs gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editar
          </Button>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Campo rotulo="Código mestre" valor={produto.codigo_mestre} mono />
          <Campo rotulo="Unidade" valor={produto.unidade} />
          <Campo rotulo="Linha" valor={linha?.nome} />
          <Campo rotulo="Fabricante" valor={linha?.fabricante} />
          <Campo rotulo="Categoria" valor={categoria?.nome} />
          <Campo rotulo="Status" valor={produto.status ? "Ativo" : "Inativo"} />
          {produto.fornecedor_mestre_id && (
            <Campo rotulo="Fornecedor (cód. mestre)" valor={
              fornecedoresDisponiveis.find(f => f.id === produto.fornecedor_mestre_id)?.nome ?? "—"
            } />
          )}
          {(produto.tamanho_mm || produto.peso_metro || precoExibido) && (
            <div className="col-span-2 border-t border-border pt-3 mt-1">
              <dt className="text-xs uppercase tracking-wide text-text-3 mb-2">Especificações</dt>
              <div className="flex flex-wrap gap-4 text-sm">
                {produto.tamanho_mm && (
                  <span>
                    <span className="text-text-3">{labels.tamanho ?? "Tamanho"}:</span>{" "}
                    <span className="font-medium">{Number(produto.tamanho_mm).toLocaleString("pt-BR")} {sufixoTamanho}</span>
                  </span>
                )}
                {produto.peso_metro && (
                  <span>
                    <span className="text-text-3">Peso:</span>{" "}
                    <span className="font-medium">{Number(produto.peso_metro).toLocaleString("pt-BR", { minimumFractionDigits: 3 })} {sufixoPeso}</span>
                  </span>
                )}
                {precoExibido != null && (
                  <span>
                    <span className="text-text-3">Preço:</span>{" "}
                    <span className="font-medium">{Number(precoExibido).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}{sufixoPrecoExibido}</span>
                  </span>
                )}
              </div>
            </div>
          )}
          {produto.descricao && (
            <div className="col-span-2"><Campo rotulo="Descrição" valor={produto.descricao} /></div>
          )}
          {produto.observacoes && (
            <div className="col-span-2"><Campo rotulo="Observações" valor={produto.observacoes} /></div>
          )}
        </dl>
      </div>
      <div className="mt-4 flex justify-end">
        <BotaoExcluir linhaId={linhaId} produtoId={produto.id} />
      </div>
    </div>
  );
}

function Campo({ rotulo, valor, mono = false }: { rotulo: string; valor?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-3">{rotulo}</dt>
      <dd className={`mt-0.5 font-medium text-text ${mono ? "font-mono text-xs" : ""}`}>{valor || "—"}</dd>
    </div>
  );
}

"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { criarRetornoPedido } from "@/modules/squadframe/actions/compras/retorno";
import { AssinarModal } from "@/modules/squadframe/components/assinar-modal";
import { calcPrecoUnit } from "@/modules/squadframe/lib/tipo-unidade";
import { Button } from "@/ui/components/Button";
import { DataInputBr } from "@/modules/squadframe/components/ui/data-input-br";

type Produto    = { id: string; codigo_mestre: string; nome: string; unidade: string; tamanho_mm?: number | null; peso_metro?: number | null; preco_metro?: number | null };
type Fornecedor = { id: string; nome: string; ativo?: boolean };
type Obra       = { id: string; nome: string; codigo: string };
type FormaPag   = { id: string; nome: string };
type CorRal     = { id: string; codigo_ral: string; nome: string | null; tipos: string[] };

type Item = {
  produto_id: string | null;
  descricao_snapshot: string;
  quantidade_pedida: number;
  unidade: string;
  preco_unitario: number;
  preco_metro: number | null;
  codigo_fornecedor: string;
  obra_id: string | null;
  solicitacao_item_id: string | null;
  tamanho_mm: number | null;
  largura_m: number | null;
  altura_m: number | null;
  qtd_pecas: number | null;
  cor_id: string | null;
};

function isChapa(it: Item) { return ["CHAPA","M²","M2"].includes((it.unidade ?? "").toUpperCase()); }
function itemAreaChapa(it: Item): number | null {
  if (!isChapa(it)) return null;
  if (it.largura_m && it.altura_m && it.qtd_pecas) return it.largura_m * it.altura_m * it.qtd_pecas;
  return null;
}

function BuscaProduto({ onAdd }: { onAdd: (p: Produto) => void }) {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [aberto, setAberto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  function buscar(v: string) {
    setQ(v);
    clearTimeout(timer.current);
    if (v.length < 2) { setResultados([]); setAberto(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/produtos/search?q=${encodeURIComponent(v)}`);
      setResultados(await res.json());
      setAberto(true);
    }, 280);
  }

  return (
    <div className="relative">
      <input value={q} onChange={(e) => buscar(e.target.value)}
        placeholder="Buscar produto para adicionar…" className="field h-9 w-full text-sm" />
      {aberto && resultados.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface shadow-lg">
          {resultados.map((p) => (
            <button key={p.id} type="button"
              onClick={() => { onAdd(p); setQ(""); setResultados([]); setAberto(false); }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-bg">
              <span className="font-mono text-xs text-text-3 w-24 shrink-0">{p.codigo_mestre}</span>
              <span className="flex-1 text-text">{p.nome}</span>
              <span className="text-xs text-text-3">{p.unidade}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RetornoPedidoForm({
  pedido, itensIniciais, fornecedores, obras, formasPagamento, coresRal,
}: {
  pedido: any;
  itensIniciais: any[];
  fornecedores: Fornecedor[];
  obras: Obra[];
  formasPagamento: FormaPag[];
  coresRal: CorRal[];
}) {
  const [itens, setItens] = useState<Item[]>(() =>
    itensIniciais.map((i) => ({
      produto_id:          i.produto?.id ?? null,
      descricao_snapshot:  i.produto?.nome ?? i.descricao_snapshot,
      quantidade_pedida:   Number(i.quantidade_pedida),
      unidade:             i.unidade,
      preco_unitario:      Number(i.preco_unitario) || 0,
      preco_metro:         i.produto?.preco_metro ?? null,
      codigo_fornecedor:   i.codigo_fornecedor || "",
      obra_id:             i.obra_id ?? null,
      solicitacao_item_id: i.solicitacao_item_id ?? null,
      tamanho_mm:          i.produto?.tamanho_mm ?? null,
      largura_m:           i.largura_m ?? null,
      altura_m:            i.altura_m ?? null,
      qtd_pecas:           i.qtd_pecas ?? null,
      cor_id:              i.cor_id ?? null,
    }))
  );
  const [motivo, setMotivo] = useState("");
  const [prazoRetorno, setPrazoRetorno] = useState(pedido.prazo_entrega ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pendingFn = useRef<(() => Promise<void>) | null>(null);
  const [modalAcao, setModalAcao] = useState<string | null>(null);
  const [modoCorPedido, setModoCorPedido] = useState<"unica" | "por-item">(() =>
    itensIniciais.some((i) => i.cor_id) ? "por-item" : "unica"
  );

  function addProduto(p: Produto) {
    const chapa = ["CHAPA","M²","M2"].includes((p.unidade ?? "").toUpperCase());
    setItens((prev) => [...prev, {
      produto_id: p.id, descricao_snapshot: p.nome,
      quantidade_pedida: 1, unidade: p.unidade,
      preco_unitario: chapa ? 0 : calcPrecoUnit(p.unidade, p.tamanho_mm, p.preco_metro),
      preco_metro: p.preco_metro ?? null, codigo_fornecedor: "", obra_id: null,
      solicitacao_item_id: null, tamanho_mm: p.tamanho_mm ?? null,
      largura_m: null, altura_m: null, qtd_pecas: chapa ? 1 : null, cor_id: null,
    }]);
  }

  const coresFiltradas = pedido.tipo_linha
    ? coresRal.filter((c) => (c.tipos ?? []).includes(pedido.tipo_linha))
    : coresRal;
  const corPorItem = modoCorPedido === "por-item" && coresRal.length > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!motivo.trim()) { setErro("O motivo do retorno é obrigatório."); return; }
    if (!itens.length)  { setErro("O pedido precisa ter ao menos um item."); return; }
    setErro(null);

    const fd = new FormData(e.currentTarget);
    const itensJson = itens.map((i) => {
      const chapa = isChapa(i);
      const area  = chapa && i.largura_m && i.altura_m && i.qtd_pecas
        ? i.largura_m * i.altura_m * i.qtd_pecas : null;
      return {
        produto_id:          i.produto_id,
        descricao_snapshot:  i.descricao_snapshot,
        quantidade_pedida:   chapa ? (i.qtd_pecas ?? 1) : i.quantidade_pedida,
        unidade:             i.unidade,
        preco_unitario:      chapa
          ? (area && i.preco_metro && i.qtd_pecas ? (area / i.qtd_pecas) * i.preco_metro : i.preco_unitario)
          : i.preco_unitario,
        codigo_fornecedor:   i.codigo_fornecedor || null,
        obra_id:             i.obra_id || null,
        largura_m:           i.largura_m || null,
        altura_m:            i.altura_m || null,
        qtd_pecas:           i.qtd_pecas || null,
        ...(corPorItem && i.cor_id ? { cor_id: i.cor_id } : {}),
      };
    });

    const alteracoes = {
      fornecedor_id:      fd.get("fornecedor_id") as string,
      obra_id:            (fd.get("obra_id") as string) || null,
      forma_pagamento_id: (fd.get("forma_pagamento_id") as string) || null,
      cor_id:             (fd.get("cor_id") as string) || null,
      observacoes:        (fd.get("observacoes") as string) || null,
      prazo_entrega:      prazoRetorno || null,
      itens:              itensJson,
    };

    pendingFn.current = async () => {
      start(async () => {
        try {
          await criarRetornoPedido(pedido.id, motivo, alteracoes);
          router.refresh();
        } catch (err: any) {
          setErro(err.message);
        }
      });
    };
    setModalAcao("Enviar Retorno de Pedido para Aprovação");
  }

  const total = itens.reduce((acc, i) => {
    if (isChapa(i)) { const a = itemAreaChapa(i); return acc + (a ?? 0) * (i.preco_metro ?? 0); }
    return acc + i.quantidade_pedida * i.preco_unitario;
  }, 0);

  return (
    <>
      {modalAcao && (
        <AssinarModal
          acao={modalAcao}
          onConfirm={async () => { setModalAcao(null); await pendingFn.current?.(); }}
          onCancel={() => setModalAcao(null)}
        />
      )}

      {/* Banner explicativo */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
        <p className="font-semibold">Retorno de Pedido</p>
        <p className="mt-0.5 text-xs">
          Edite o que precisa ser alterado e informe o motivo. O pedido voltará para aprovação
          do gestor e, quando aprovado, retornará automaticamente ao status anterior ({pedido.status}).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Motivo — obrigatório */}
        <div className="card p-5">
          <label className="label">
            Motivo do retorno <span className="text-danger">*</span>
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Descreva o motivo pelo qual este pedido precisa ser alterado…"
            className="field text-sm"
            required
          />
        </div>

        {/* Dados principais */}
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-semibold text-text">Dados do pedido</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Fornecedor <span className="text-danger">*</span></label>
              <select name="fornecedor_id" required defaultValue={pedido.fornecedor_id} className="field">
                <option value="">Selecione…</option>
                {fornecedores.filter((f) => f.ativo !== false).map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
                {(() => {
                  const atual = fornecedores.find((f) => f.id === pedido.fornecedor_id && f.ativo === false);
                  return atual ? <option key={atual.id} value={atual.id}>{atual.nome} (inativo)</option> : null;
                })()}
              </select>
            </div>
            <div>
              <label className="label">Obra</label>
              <select name="obra_id" defaultValue={pedido.obra_id ?? ""} className="field">
                <option value="">Sem obra</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Forma de pagamento</label>
              <select name="forma_pagamento_id" defaultValue={pedido.forma_pagamento_id ?? ""} className="field">
                <option value="">Não definida</option>
                {formasPagamento.map((fp) => <option key={fp.id} value={fp.id}>{fp.nome}</option>)}
              </select>
            </div>
            {coresRal.length > 0 && modoCorPedido === "unica" && (
              <div>
                <label className="label">Cor</label>
                <select name="cor_id" defaultValue={pedido.cor_id ?? ""} className="field">
                  <option value="">Sem cor</option>
                  {coresFiltradas.map((c) => (
                    <option key={c.id} value={c.id}>{c.codigo_ral}{c.nome ? ` — ${c.nome}` : ""}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">Prazo de entrega</label>
              <DataInputBr value={prazoRetorno} onChange={setPrazoRetorno} className="field" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observações</label>
              <textarea name="observacoes" rows={2} defaultValue={pedido.observacoes ?? ""} className="field" />
            </div>
          </div>
        </div>

        {/* Itens */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Itens do pedido</h2>
            <p className="text-sm text-text-2">
              Total: <span className="font-semibold text-text">
                {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </p>
          </div>

          {itens.length > 0 && (
            <div className="card overflow-x-auto mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                    <th className="px-4 py-2 font-medium">Produto / Item</th>
                    <th className="px-4 py-2 font-medium">Qtd / Dimensões</th>
                    <th className="px-4 py-2 font-medium w-36">Preço unit.</th>
                    <th className="px-4 py-2 font-medium w-32">Cód. Forn.</th>
                    {corPorItem && <th className="px-4 py-2 font-medium w-36">Cor</th>}
                    <th className="px-4 py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it, idx) => {
                    const itChapa = isChapa(it);
                    const area    = itemAreaChapa(it);
                    const precoDisplay = itChapa && area && it.qtd_pecas && it.preco_metro
                      ? (area / it.qtd_pecas) * it.preco_metro
                      : it.preco_unitario;
                    return (
                      <tr key={idx} className="border-b border-border last:border-0">
                        <td className="px-4 py-2">
                          <p className="font-medium text-text">{it.descricao_snapshot}</p>
                          {it.tamanho_mm && (
                            <p className="text-xs text-text-3">{it.tamanho_mm} mm</p>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {itChapa ? (
                            <div className="flex flex-col gap-1 min-w-[200px]">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-medium text-text-3 w-4">L</span>
                                <input type="number" min="0" step="1" placeholder="mm"
                                  value={it.largura_m != null ? Math.round(it.largura_m * 1000) : ""}
                                  onChange={(e) => {
                                    const vM = (parseFloat(e.target.value) || 0) / 1000 || null;
                                    setItens((prev) => prev.map((x, i) => {
                                      if (i !== idx) return x;
                                      const a2 = (vM ?? 0) * (x.altura_m ?? 0) * (x.qtd_pecas ?? 1);
                                      return { ...x, largura_m: vM, preco_unitario: a2 && x.preco_metro ? (a2 / (x.qtd_pecas ?? 1)) * x.preco_metro : x.preco_unitario };
                                    }));
                                  }}
                                  className="field h-7 w-20 text-xs" />
                                <span className="text-xs text-text-3">×</span>
                                <span className="text-[10px] font-medium text-text-3 w-4">A</span>
                                <input type="number" min="0" step="1" placeholder="mm"
                                  value={it.altura_m != null ? Math.round(it.altura_m * 1000) : ""}
                                  onChange={(e) => {
                                    const vM = (parseFloat(e.target.value) || 0) / 1000 || null;
                                    setItens((prev) => prev.map((x, i) => {
                                      if (i !== idx) return x;
                                      const a2 = (x.largura_m ?? 0) * (vM ?? 0) * (x.qtd_pecas ?? 1);
                                      return { ...x, altura_m: vM, preco_unitario: a2 && x.preco_metro ? (a2 / (x.qtd_pecas ?? 1)) * x.preco_metro : x.preco_unitario };
                                    }));
                                  }}
                                  className="field h-7 w-20 text-xs" />
                                <span className="text-xs text-text-3">mm</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input type="number" min="1" step="1" placeholder="Qtd pç"
                                  value={it.qtd_pecas ?? 1}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value) || 1;
                                    setItens((prev) => prev.map((x, i) => {
                                      if (i !== idx) return x;
                                      const a2 = (x.largura_m ?? 0) * (x.altura_m ?? 0) * v;
                                      return { ...x, qtd_pecas: v, quantidade_pedida: v, preco_unitario: a2 && x.preco_metro ? (a2 / v) * x.preco_metro : x.preco_unitario };
                                    }));
                                  }}
                                  className="field h-7 w-16 text-xs" />
                                <span className="text-xs text-text-3">peças</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <input type="number" min="0" step="any" value={it.quantidade_pedida}
                                onChange={(e) => setItens((prev) => prev.map((x, i) => i === idx ? { ...x, quantidade_pedida: parseFloat(e.target.value) || 0 } : x))}
                                className="field h-8 w-20 text-sm" />
                              <span className="text-xs text-text-3 shrink-0">{it.unidade}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {itChapa ? (
                            <p className="text-sm">{precoDisplay.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                          ) : (
                            <input type="number" min="0" step="0.01" value={it.preco_unitario || ""}
                              onChange={(e) => setItens((prev) => prev.map((x, i) => i === idx ? { ...x, preco_unitario: parseFloat(e.target.value) || 0 } : x))}
                              placeholder="0,00" className="field h-8 w-32 text-sm" />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <input value={it.codigo_fornecedor}
                            onChange={(e) => setItens((prev) => prev.map((x, i) => i === idx ? { ...x, codigo_fornecedor: e.target.value } : x))}
                            placeholder="—" className="field h-8 w-28 text-sm" />
                        </td>
                        {corPorItem && (
                          <td className="px-4 py-2">
                            <select value={it.cor_id ?? ""}
                              onChange={(e) => setItens((prev) => prev.map((x, i) => i === idx ? { ...x, cor_id: e.target.value || null } : x))}
                              className="field h-8 text-xs w-36">
                              <option value="">—</option>
                              {coresFiltradas.map((c) => (
                                <option key={c.id} value={c.id}>{c.codigo_ral}{c.nome ? ` — ${c.nome}` : ""}</option>
                              ))}
                            </select>
                          </td>
                        )}
                        <td className="px-4 py-2">
                          <button type="button" onClick={() => setItens((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-text-3 hover:text-danger">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="mb-2 text-xs font-medium text-text-3 uppercase tracking-widest">Adicionar produto do catálogo</p>
            <BuscaProduto onAdd={addProduto} />
          </div>
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Enviando…" : "Enviar para aprovação"}
          </Button>
          <Button as="a" variant="ghost" href={`/squadframe/compras/pedidos/${pedido.id}`}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );
}

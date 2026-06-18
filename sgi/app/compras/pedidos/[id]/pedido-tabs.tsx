"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pluralUnit } from "@/lib/unidade";
import { calcMedida, calcPesoTotal } from "@/lib/tipo-unidade";
import {
  adicionarAnotacao,
  obterUrlUploadDocumento,
  registrarDocumento,
  excluirDocumento,
  gerarUrlDownload,
} from "@/app/compras/actions";
import { STATUS_PED_LABEL } from "@/types/compras";
import { createClient } from "@/lib/supabase-client";

const TABS = ["Resumo", "Itens", "Recebimentos", "Documentos", "Anotações", "Histórico"] as const;
type Tab = (typeof TABS)[number];

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

// ── Resumo ────────────────────────────────────────────────────────
function TabResumo({ pedido, itens, coresRal }: { pedido: any; itens: any[]; coresRal?: any[] }) {
  const totalPedido = itens.reduce((a, i) => a + Number(i.quantidade_pedida) * Number(i.preco_unitario || 0), 0);
  const totalQtdPedida = itens.reduce((a, i) => a + Number(i.quantidade_pedida), 0);
  const totalQtdRecebida = itens.reduce((a, i) => a + Number(i.quantidade_recebida || 0), 0);
  const totalMetros = itens.reduce((s, i) => { const m = itemMedida(i); return m?.sufixo === "m"  ? s + m.valor : s; }, 0);
  const totalArea   = itens.reduce((s, i) => { const m = itemMedida(i); return m?.sufixo === "m²" ? s + m.valor : s; }, 0);
  const totalPeso   = itens.reduce((s, i) => s + (itemPeso(i) ?? 0), 0);
  const pct = totalQtdPedida > 0 ? Math.round((totalQtdRecebida / totalQtdPedida) * 100) : 0;
  const forn = pedido.fornecedor as any;
  const obra = pedido.obra as any;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Fornecedor */}
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-2">Fornecedor</p>
          <p className="font-semibold text-ink">{forn?.nome ?? "—"}</p>
          {forn?.email && <p className="mt-1 text-sm text-ink-soft">{forn.email}</p>}
          {forn?.telefone && <p className="text-sm text-ink-soft">{forn.telefone}</p>}
        </div>

        {/* Obra / Comprador */}
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-2">Detalhes</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Obra</span>
              <span className="text-ink">{obra?.nome ?? "Sem obra"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Comprador</span>
              <span className="text-ink">{(pedido.comprador as any)?.nome ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Pagamento</span>
              <span className="text-ink">{(pedido.forma_pagamento as any)?.nome ?? "—"}</span>
            </div>
            {pedido.cor_id && (() => {
              const cor = (coresRal ?? []).find((c: any) => c.id === pedido.cor_id);
              if (!cor) return null;
              return (
                <div className="flex items-center justify-between">
                  <span className="text-ink-soft">Cor</span>
                  <div className="flex items-center gap-1.5">
                    {cor.hex && (
                      <span className="inline-block h-3.5 w-3.5 rounded-sm border border-line"
                        style={{ backgroundColor: cor.hex }} />
                    )}
                    <span className="font-mono text-xs text-ink">{cor.codigo_ral}</span>
                    {cor.nome && <span className="text-ink-soft">— {cor.nome}</span>}
                  </div>
                </div>
              );
            })()}
            <div className="flex justify-between">
              <span className="text-ink-soft">Criado em</span>
              <span className="text-ink">{new Date(pedido.criado_em).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
        </div>

        {/* Totais */}
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-2">Totais</p>
          <p className="text-2xl font-bold text-ink">
            {totalPedido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{itens.length} iten(s) no pedido</p>
          {totalMetros > 0 && (
            <p className="text-sm text-ink-soft">{totalMetros.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m lineares</p>
          )}
          {totalArea > 0 && (
            <p className="text-sm text-ink-soft">{totalArea.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²</p>
          )}
          {totalPeso > 0 && (
            <p className="text-sm text-ink-soft">{totalPeso.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg estimados</p>
          )}
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-ink-soft">
              <span>Recebido</span>
              <span className="font-medium text-ink">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-canvas overflow-hidden">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {pedido.observacoes && (
        <div className="card px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-1">Observações</p>
          <p className="text-sm text-ink-soft whitespace-pre-wrap">{pedido.observacoes}</p>
        </div>
      )}
    </div>
  );
}

// ── Helpers de specs ─────────────────────────────────────────────
function isItChapa(it: any) {
  return ["CHAPA","M²","M2"].includes((it.unidade ?? "").toUpperCase());
}
function itAreaChapa(it: any): number | null {
  if (!isItChapa(it)) return null;
  const l = Number(it.largura_m), h = Number(it.altura_m), q = Number(it.qtd_pecas);
  if (l > 0 && h > 0 && q > 0) return l * h * q;
  return null;
}
function itemMedida(it: any) {
  const area = itAreaChapa(it);
  if (area != null) return { valor: area, sufixo: "m²" };
  return calcMedida(Number(it.quantidade_pedida), it.unidade ?? "", it.produto?.tamanho_mm);
}
function itemPeso(it: any) {
  const area = itAreaChapa(it);
  if (area != null && it.produto?.peso_metro) return area * Number(it.produto.peso_metro);
  return calcPesoTotal(Number(it.quantidade_pedida), it.unidade ?? "", it.produto?.tamanho_mm, it.produto?.peso_metro);
}

// ── Itens ─────────────────────────────────────────────────────────
function TabItens({ pedido, itens, coresRal }: { pedido: any; itens: any[]; coresRal?: any[] }) {
  const totalPedido = itens.reduce((a, i) => a + Number(i.quantidade_pedida) * Number(i.preco_unitario || 0), 0);
  const podeReceber = ["EMITIDO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL"].includes(pedido.status);
  const temSpecs = itens.some((it) => it.produto?.tamanho_mm || it.produto?.peso_metro ||
    ["M","ML","M²","M2","CHAPA"].includes((it.unidade ?? "").toUpperCase()));
  const totalMetros = itens.reduce((s, it) => { const m = itemMedida(it); return m?.sufixo === "m"  ? s + m.valor : s; }, 0);
  const totalArea   = itens.reduce((s, it) => { const m = itemMedida(it); return m?.sufixo === "m²" ? s + m.valor : s; }, 0);
  const totalPeso   = itens.reduce((s, it) => s + (itemPeso(it) ?? 0), 0);
  const temCorItem  = itens.some((it) => it.cor_id);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-4 text-sm text-ink-soft">
          <span>{itens.length} iten(s) · Total: <span className="font-semibold text-ink">{totalPedido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></span>
          {temSpecs && totalMetros > 0 && <span>{totalMetros.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m lineares</span>}
          {temSpecs && totalArea   > 0 && <span>{totalArea.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²</span>}
          {temSpecs && totalPeso   > 0 && <span>{totalPeso.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg</span>}
        </div>
        {podeReceber && (
          <Link href={`/compras/pedidos/${pedido.id}/receber`} className="btn-primary text-sm">
            Registrar recebimento
          </Link>
        )}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3 font-medium">Produto</th>
              <th className="px-5 py-3 font-medium">Cód. Forn.</th>
              {temCorItem && <th className="px-5 py-3 font-medium">Cor</th>}
              <th className="px-5 py-3 font-medium text-right">Pedido</th>
              {temSpecs && <th className="px-5 py-3 font-medium text-right">Linear / Área</th>}
              {temSpecs && <th className="px-5 py-3 font-medium text-right">Peso</th>}
              <th className="px-5 py-3 font-medium text-right">Recebido</th>
              <th className="px-5 py-3 font-medium text-right">Saldo</th>
              <th className="px-5 py-3 font-medium text-right">Preço unit.</th>
              <th className="px-5 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((it: any) => {
              const saldo    = Number(it.saldo_pendente);
              const medida   = itemMedida(it);
              const peso     = itemPeso(it);
              const itChapa  = isItChapa(it);
              const areaIt   = itAreaChapa(it);
              return (
                <tr key={it.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{it.produto?.nome ?? it.descricao_snapshot}</p>
                    <p className="font-mono text-xs text-ink-faint">{it.produto?.codigo_mestre}</p>
                    {it.produto?.tamanho_mm && (
                      <p className="text-xs text-ink-faint">{Number(it.produto.tamanho_mm).toLocaleString("pt-BR")} mm {itChapa ? "(esp.)" : "(barra)"}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-faint">{it.codigo_fornecedor || "—"}</td>
                  {temCorItem && (() => {
                    const cor = it.cor_id ? (coresRal ?? []).find((c: any) => c.id === it.cor_id) : null;
                    return (
                      <td className="px-5 py-3">
                        {cor ? (
                          <div className="flex items-center gap-1.5">
                            {cor.hex && (
                              <span className="inline-block h-3.5 w-3.5 rounded-sm border border-line shrink-0"
                                style={{ backgroundColor: cor.hex }} />
                            )}
                            <span className="font-mono text-xs text-ink">{cor.codigo_ral}</span>
                          </div>
                        ) : <span className="text-xs text-ink-faint">—</span>}
                      </td>
                    );
                  })()}
                  <td className="px-5 py-3 text-right">
                    {itChapa && it.largura_m && it.altura_m ? (
                      <div>
                        <p className="font-medium">{Number(it.qtd_pecas || 1).toLocaleString("pt-BR")} pç</p>
                        <p className="text-xs text-ink-faint">
                          <span className="font-medium">L</span>{" "}
                          {Math.round(Number(it.largura_m) * 1000).toLocaleString("pt-BR")} ×{" "}
                          <span className="font-medium">A</span>{" "}
                          {Math.round(Number(it.altura_m) * 1000).toLocaleString("pt-BR")} mm
                        </p>
                      </div>
                    ) : (
                      <span>{Number(it.quantidade_pedida).toLocaleString("pt-BR")} {pluralUnit(Number(it.quantidade_pedida), it.unidade)}</span>
                    )}
                  </td>
                  {temSpecs && <td className="px-5 py-3 text-right text-xs text-ink-soft">{medida != null ? `${medida.valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${medida.sufixo}` : "—"}</td>}
                  {temSpecs && <td className="px-5 py-3 text-right text-xs text-ink-soft">{peso != null ? `${peso.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg` : "—"}</td>}
                  <td className="px-5 py-3 text-right text-green-600">{Number(it.quantidade_recebida).toLocaleString("pt-BR")}</td>
                  <td className={`px-5 py-3 text-right font-medium ${saldo > 0 ? "text-orange-500" : "text-ink-faint"}`}>
                    {saldo.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-5 py-3 text-right text-ink-soft">
                    {it.preco_unitario ? Number(it.preco_unitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-ink">
                    {it.preco_unitario
                      ? (Number(it.quantidade_pedida) * Number(it.preco_unitario)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-canvas">
              <td colSpan={(temSpecs ? 4 : 2) + (temCorItem ? 1 : 0)} className="px-5 py-2 text-right text-sm font-semibold text-ink">Total</td>
              {temSpecs && (
                <td className="px-5 py-2 text-right text-xs font-semibold text-ink">
                  {totalMetros > 0 && <span>{totalMetros.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m</span>}
                  {totalMetros > 0 && totalArea > 0 && <br />}
                  {totalArea > 0 && <span>{totalArea.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²</span>}
                  {totalMetros === 0 && totalArea === 0 && "—"}
                </td>
              )}
              {temSpecs && <td className="px-5 py-2 text-right text-xs font-semibold text-ink">{totalPeso > 0 ? `${totalPeso.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg` : "—"}</td>}
              <td colSpan={temSpecs ? 3 : 4} />
              <td className="px-5 py-2 text-right font-bold text-ink">
                {totalPedido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Recebimentos ──────────────────────────────────────────────────
function TabRecebimentos({ recebimentos }: { recebimentos: any[] }) {
  if (!recebimentos.length)
    return <p className="text-sm text-ink-faint">Nenhum recebimento registrado.</p>;

  return (
    <div className="space-y-3">
      {recebimentos.map((r: any) => (
        <div key={r.id} className="card px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-ink">
                {new Date(r.data_recebimento + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
              <span className="ml-2 text-sm text-ink-soft">por {(r.responsavel as any)?.nome}</span>
            </div>
            <span className="text-xs text-ink-faint">{r.itens?.length} iten(s)</span>
          </div>
          {r.observacoes && <p className="mt-1 text-sm text-ink-soft">{r.observacoes}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {(r.itens ?? []).map((ri: any) => (
              <span key={ri.id} className="rounded bg-canvas px-2 py-0.5 text-xs text-ink-soft">
                {ri.pedido_item?.descricao_snapshot}: {Number(ri.quantidade_recebida).toLocaleString("pt-BR")}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Documentos ────────────────────────────────────────────────────
function TabDocumentos({ pedidoId, documentos }: { pedidoId: string; documentos: any[] }) {
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [docs] = useState(documentos);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    setUploading(true);
    try {
      const { token, caminho } = await obterUrlUploadDocumento(pedidoId, file.name);
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("pedido-docs")
        .uploadToSignedUrl(caminho, token, file);
      if (upErr) throw new Error(upErr.message);
      await registrarDocumento(pedidoId, file.name, caminho, file.size);
      router.refresh();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDownload(caminho: string, nome: string) {
    const url = await gerarUrlDownload(caminho);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este documento?")) return;
    try {
      await excluirDocumento(id);
      router.refresh();
    } catch (e: any) {
      setErro(e.message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
        <button type="button" disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="btn-primary">
          {uploading ? "Enviando…" : "Anexar documento"}
        </button>
        <span className="text-xs text-ink-faint">PDF, imagens, planilhas, etc.</span>
      </div>

      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}

      {docs.length === 0 && documentos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-ink-faint">
          Nenhum documento anexado.
        </div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {documentos.map((d: any) => (
            <div key={d.id} className="flex items-center gap-4 px-5 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-ink-faint">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-ink">{d.nome_arquivo}</p>
                <p className="text-xs text-ink-faint">
                  {d.usuario?.nome} · {new Date(d.criado_em).toLocaleDateString("pt-BR")}
                  {d.tamanho_bytes ? ` · ${formatBytes(d.tamanho_bytes)}` : ""}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => handleDownload(d.caminho_storage, d.nome_arquivo)}
                  className="btn-ghost text-xs">
                  Baixar
                </button>
                <button type="button" onClick={() => handleDelete(d.id)}
                  className="text-ink-faint hover:text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Anotações ─────────────────────────────────────────────────────
function TabAnotacoes({ pedidoId, anotacoes }: { pedidoId: string; anotacoes: any[] }) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setErro(null);
    start(async () => {
      try {
        await adicionarAnotacao(pedidoId, texto);
        setTexto("");
        router.refresh();
      } catch (e: any) { setErro(e.message); }
    });
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="card p-4 space-y-3">
        <label className="text-sm font-medium text-ink">Nova anotação</label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          placeholder="Registre algo relevante sobre este pedido…"
          className="field text-sm"
        />
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={pending || !texto.trim()} className="btn-primary text-sm">
            {pending ? "Salvando…" : "Adicionar anotação"}
          </button>
        </div>
      </form>

      {anotacoes.length === 0 ? (
        <p className="text-sm text-ink-faint">Nenhuma anotação registrada.</p>
      ) : (
        <div className="space-y-3">
          {anotacoes.map((a: any) => (
            <div key={a.id} className="card px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-ink">{(a.usuario as any)?.nome ?? "—"}</span>
                {a.status_pedido && (
                  <span className="rounded bg-canvas px-2 py-0.5 text-xs text-ink-soft">
                    {STATUS_PED_LABEL[a.status_pedido as keyof typeof STATUS_PED_LABEL] ?? a.status_pedido}
                  </span>
                )}
                <span className="ml-auto text-xs text-ink-faint">
                  {new Date(a.criado_em).toLocaleString("pt-BR")}
                </span>
              </div>
              <p className="text-sm text-ink-soft whitespace-pre-wrap">{a.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Histórico ─────────────────────────────────────────────────────
function TabHistorico({ historico }: { historico: any[] }) {
  if (!historico.length)
    return <p className="text-sm text-ink-faint">Nenhum evento registrado.</p>;

  return (
    <div className="space-y-3">
      {historico.map((h: any) => (
        <div key={h.id} className="flex gap-3 text-sm">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-steel" />
          <div>
            <span className="font-medium text-ink">{h.acao.replace(/_/g, " ")}</span>
            {h.usuario && <span className="text-ink-faint"> por {(h.usuario as any).nome}</span>}
            {h.dados?.observacoes && (
              <p className="mt-0.5 text-ink-soft">{h.dados.observacoes}</p>
            )}
            <p className="text-xs text-ink-faint">{new Date(h.criado_em).toLocaleString("pt-BR")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────
export function PedidoTabs({
  pedido, itens, recebimentos, historico, anotacoes, documentos, coresRal,
}: {
  pedido: any; itens: any[]; recebimentos: any[]; historico: any[];
  anotacoes: any[]; documentos: any[]; coresRal?: any[];
}) {
  const [aba, setAba] = useState<Tab>("Resumo");

  const contadores: Partial<Record<Tab, number>> = {
    Recebimentos: recebimentos.length,
    Documentos: documentos.length,
    Anotações: anotacoes.length,
  };

  return (
    <div>
      {/* Tabs nav */}
      <div className="border-b border-line">
        <div className="flex overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setAba(t)}
              className={`-mb-px shrink-0 border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                aba === t ? "border-steel text-steel" : "border-transparent text-ink-soft hover:text-ink"
              }`}>
              {t}
              {contadores[t] != null && contadores[t]! > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  aba === t ? "bg-steel/10 text-steel" : "bg-canvas text-ink-faint"
                }`}>
                  {contadores[t]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="mt-5">
        {aba === "Resumo"       && <TabResumo pedido={pedido} itens={itens} coresRal={coresRal} />}
        {aba === "Itens"        && <TabItens pedido={pedido} itens={itens} coresRal={coresRal} />}
        {aba === "Recebimentos" && <TabRecebimentos recebimentos={recebimentos} />}
        {aba === "Documentos"   && <TabDocumentos pedidoId={pedido.id} documentos={documentos} />}
        {aba === "Anotações"    && <TabAnotacoes pedidoId={pedido.id} anotacoes={anotacoes} />}
        {aba === "Histórico"    && <TabHistorico historico={historico} />}
      </div>
    </div>
  );
}

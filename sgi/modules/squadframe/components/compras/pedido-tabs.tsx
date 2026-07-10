"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pluralUnit } from "@/modules/squadframe/lib/unidade";
import { calcMedida, calcPesoTotal } from "@/modules/squadframe/lib/tipo-unidade";
import {
  adicionarAnotacao,
  obterUrlUploadDocumento,
  registrarDocumento,
  excluirDocumento,
  gerarUrlDownload,
} from "@/app/squadframe/compras/actions";
import { STATUS_PED_LABEL } from "@/modules/squadframe/types/compras";
import { createClient } from "@/shared/database/supabase-client";
import { Button } from "@/ui/components/Button";
import { Alert } from "@/ui/components/Alert";

const TABS = ["Resumo", "Itens", "Recebimentos", "Documentos", "Anotações", "Histórico"] as const;
type Tab = (typeof TABS)[number];

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

// ── Resumo ────────────────────────────────────────────────────────
function TabResumo({ pedido, itens, coresRal }: { pedido: any; itens: any[]; coresRal?: any[] }) {
  // Perfil com valor final confirmado: o "estimado pelos itens" usa peso ×
  // (valor_final ÷ peso_total), não quantidade × preco_unitario — ver TabItens.
  const usaPrecoKg = (pedido.tipo_linha ?? "").toUpperCase().includes("PERFIL") && pedido.valor_final != null;
  const pesoTotalPedido = itens.reduce((s, i) => s + (itemPeso(i) ?? 0), 0);
  const precoKgMedioResumo = usaPrecoKg && pesoTotalPedido > 0 ? Number(pedido.valor_final) / pesoTotalPedido : null;
  const totalPedido = itens.reduce((a, i) => a + itemTotal(itemPeso(i), precoKgMedioResumo, Number(i.quantidade_pedida), Number(i.preco_unitario || 0)), 0);
  // Quando o valor final já foi confirmado com o fornecedor, ele é o total
  // que vale (mesma regra já usada em confirmar_debito_carteira) — a soma
  // dos itens é só a estimativa usada antes disso.
  const temValorFinal = pedido.valor_final != null;
  const totalExibido = temValorFinal ? Number(pedido.valor_final) : totalPedido;
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
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-3 mb-2">Fornecedor</p>
          <p className="font-semibold text-text">{forn?.nome ?? "—"}</p>
          {forn?.email && <p className="mt-1 text-sm text-text-2">{forn.email}</p>}
          {forn?.telefone && <p className="text-sm text-text-2">{forn.telefone}</p>}
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-3 mb-2">Detalhes</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-text-2">Obra</span>
              <span className="text-text">{obra?.nome ?? "Sem obra"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-2">Comprador</span>
              <span className="text-text">{(pedido.comprador as any)?.nome ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-2">Pagamento</span>
              <span className="text-text">{(pedido.forma_pagamento as any)?.nome ?? "—"}</span>
            </div>
            {pedido.cor_id && (() => {
              const cor = (coresRal ?? []).find((c: any) => c.id === pedido.cor_id);
              if (!cor) return null;
              return (
                <div className="flex items-center justify-between">
                  <span className="text-text-2">Cor</span>
                  <div className="flex items-center gap-1.5">
                    {cor.hex && (
                      <span className="inline-block h-3.5 w-3.5 rounded-sm border border-border"
                        style={{ backgroundColor: cor.hex }} />
                    )}
                    <span className="font-mono text-xs text-text">{cor.codigo_ral}</span>
                    {cor.nome && <span className="text-text-2">— {cor.nome}</span>}
                  </div>
                </div>
              );
            })()}
            <div className="flex justify-between">
              <span className="text-text-2">Criado em</span>
              <span className="text-text">{new Date(pedido.criado_em).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-3 mb-2">Totais</p>
          <p className="text-2xl font-bold text-text">
            {totalExibido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {temValorFinal && (
            <p className="mt-0.5 text-xs text-text-3">
              Valor final confirmado
              {Math.abs(totalPedido - totalExibido) > 0.01 &&
                ` · estimado pelos itens: ${totalPedido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
            </p>
          )}
          <p className="mt-1 text-sm text-text-2">{itens.length} iten(s) no pedido</p>
          {totalMetros > 0 && (
            <p className="text-sm text-text-2">{totalMetros.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m lineares</p>
          )}
          {totalArea > 0 && (
            <p className="text-sm text-text-2">{totalArea.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²</p>
          )}
          {totalPeso > 0 && (
            <p className="text-sm text-text-2">{totalPeso.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg estimados</p>
          )}
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-text-2">
              <span>Recebido</span>
              <span className="font-medium text-text">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-bg overflow-hidden">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {pedido.observacoes && (
        <div className="card px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-3 mb-1">Observações</p>
          <p className="text-sm text-text-2 whitespace-pre-wrap">{pedido.observacoes}</p>
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
const FATOR_MASSA_CHAPA = 0.0000025;
function itemPeso(it: any) {
  if (isItChapa(it) && it.largura_m && it.altura_m && it.produto?.tamanho_mm && it.qtd_pecas) {
    return Number(it.largura_m) * 1000 * Number(it.altura_m) * 1000 * Number(it.produto.tamanho_mm) * FATOR_MASSA_CHAPA * Number(it.qtd_pecas);
  }
  const area = itAreaChapa(it);
  if (area != null && it.produto?.peso_metro) return area * Number(it.produto.peso_metro);
  return calcPesoTotal(Number(it.quantidade_pedida), it.unidade ?? "", it.produto?.tamanho_mm, it.produto?.peso_metro);
}

// ── Itens ─────────────────────────────────────────────────────────
// Pedidos de perfil com valor final confirmado: o total de cada item é
// calculado direto de peso × (valor_final ÷ peso_total_do_pedido) — não lemos
// preco_unitario do banco pra isso. Isso evita depender de a distribuição
// server-side (distribuirValorFinalPorPeso) ter batido exatamente com o peso
// recalculado aqui; a tela sempre soma valor_final certinho, e o "preço/kg"
// exibido é sempre o mesmo número (a média) pra todos os itens do pedido.
function itemTotal(peso: number | null, precoKgMedio: number | null, quantidade: number, precoUnitarioFallback: number): number {
  if (precoKgMedio != null && peso != null) return peso * precoKgMedio;
  return quantidade * precoUnitarioFallback;
}

function TabItens({ pedido, itens, coresRal }: { pedido: any; itens: any[]; coresRal?: any[] }) {
  const usaPrecoKg = (pedido.tipo_linha ?? "").toUpperCase().includes("PERFIL") && pedido.valor_final != null;
  const podeReceber = ["EMITIDO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL"].includes(pedido.status);
  const temSpecs = itens.some((it) => it.produto?.tamanho_mm || it.produto?.peso_metro ||
    ["M","ML","M²","M2","CHAPA"].includes((it.unidade ?? "").toUpperCase()));
  const totalMetros = itens.reduce((s, it) => { const m = itemMedida(it); return m?.sufixo === "m"  ? s + m.valor : s; }, 0);
  const totalArea   = itens.reduce((s, it) => { const m = itemMedida(it); return m?.sufixo === "m²" ? s + m.valor : s; }, 0);
  const totalPeso   = itens.reduce((s, it) => s + (itemPeso(it) ?? 0), 0);
  const precoKgMedio = usaPrecoKg && totalPeso > 0 ? Number(pedido.valor_final) / totalPeso : null;
  const totalPedido = itens.reduce((a, i) => a + itemTotal(itemPeso(i), precoKgMedio, Number(i.quantidade_pedida), Number(i.preco_unitario || 0)), 0);
  const temCorItem  = itens.some((it) => it.cor_id);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-4 text-sm text-text-2">
          <span>{itens.length} iten(s) · Total: <span className="font-semibold text-text">{totalPedido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></span>
          {temSpecs && totalMetros > 0 && <span>{totalMetros.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m lineares</span>}
          {temSpecs && totalArea   > 0 && <span>{totalArea.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²</span>}
          {temSpecs && totalPeso   > 0 && <span>{totalPeso.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg</span>}
        </div>
        {podeReceber && (
          <Button as="a" href={`/squadframe/compras/pedidos/${pedido.id}/receber`} size="sm">
            Registrar recebimento
          </Button>
        )}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-5 py-3 font-medium">Produto</th>
              <th className="px-5 py-3 font-medium">Cód. Forn.</th>
              {temCorItem && <th className="px-5 py-3 font-medium">Cor</th>}
              <th className="px-5 py-3 font-medium text-right">Pedido</th>
              {temSpecs && <th className="px-5 py-3 font-medium text-right">Linear / Área</th>}
              {temSpecs && <th className="px-5 py-3 font-medium text-right">Peso</th>}
              <th className="px-5 py-3 font-medium text-right">Recebido</th>
              <th className="px-5 py-3 font-medium text-right">Saldo</th>
              <th className="px-5 py-3 font-medium text-right">{precoKgMedio != null ? "Preço/kg" : "Preço unit."}</th>
              <th className="px-5 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((it: any) => {
              const saldo    = Number(it.saldo_pendente);
              const medida   = itemMedida(it);
              const peso     = itemPeso(it);
              const itChapa  = isItChapa(it);
              return (
                <tr key={it.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-text">{it.produto?.nome ?? it.descricao_snapshot}</p>
                    <p className="font-mono text-xs text-text-3">{it.produto?.codigo_mestre}</p>
                    {it.produto?.tamanho_mm && (
                      <p className="text-xs text-text-3">{Number(it.produto.tamanho_mm).toLocaleString("pt-BR")} mm {itChapa ? "(esp.)" : "(barra)"}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-text-3">{it.codigo_fornecedor || "—"}</td>
                  {temCorItem && (() => {
                    const cor = it.cor_id ? (coresRal ?? []).find((c: any) => c.id === it.cor_id) : null;
                    return (
                      <td className="px-5 py-3">
                        {cor ? (
                          <div className="flex items-center gap-1.5">
                            {cor.hex && (
                              <span className="inline-block h-3.5 w-3.5 rounded-sm border border-border shrink-0"
                                style={{ backgroundColor: cor.hex }} />
                            )}
                            <span className="font-mono text-xs text-text">{cor.codigo_ral}</span>
                          </div>
                        ) : <span className="text-xs text-text-3">—</span>}
                      </td>
                    );
                  })()}
                  <td className="px-5 py-3 text-right">
                    {itChapa && it.largura_m && it.altura_m ? (
                      <div>
                        <p className="font-medium">{Number(it.qtd_pecas || 1).toLocaleString("pt-BR")} pç</p>
                        <p className="text-xs text-text-3">
                          <span className="font-medium">L</span>{" "}
                          {Math.round(Number(it.largura_m) * 1000).toLocaleString("pt-BR")} ×{" "}
                          <span className="font-medium">A</span>{" "}
                          {Math.round(Number(it.altura_m) * 1000).toLocaleString("pt-BR")}
                          {it.produto?.tamanho_mm ? ` × E ${Number(it.produto.tamanho_mm).toLocaleString("pt-BR")}` : ""} mm
                        </p>
                        {it.largura_m && it.altura_m && it.qtd_pecas && (
                          <p className="text-xs text-text-3">
                            {(Number(it.largura_m) * Number(it.altura_m) * Number(it.qtd_pecas)).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} m²
                          </p>
                        )}
                      </div>
                    ) : (
                      <span>{Number(it.quantidade_pedida).toLocaleString("pt-BR")} {pluralUnit(Number(it.quantidade_pedida), it.unidade)}</span>
                    )}
                  </td>
                  {temSpecs && <td className="px-5 py-3 text-right text-xs text-text-2">{medida != null ? `${medida.valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${medida.sufixo}` : "—"}</td>}
                  {temSpecs && <td className="px-5 py-3 text-right text-xs text-text-2">{peso != null ? `${peso.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg` : "—"}</td>}
                  <td className="px-5 py-3 text-right text-success">{Number(it.quantidade_recebida).toLocaleString("pt-BR")}</td>
                  <td className={`px-5 py-3 text-right font-medium ${saldo > 0 ? "text-warning" : "text-text-3"}`}>
                    {saldo.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-5 py-3 text-right text-text-2">
                    {precoKgMedio != null
                      ? `${precoKgMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/kg`
                      : it.preco_unitario
                        ? Number(it.preco_unitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-text">
                    {precoKgMedio != null || it.preco_unitario
                      ? itemTotal(peso, precoKgMedio, Number(it.quantidade_pedida), Number(it.preco_unitario || 0))
                          .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-bg">
              <td colSpan={(temSpecs ? 4 : 2) + (temCorItem ? 1 : 0)} className="px-5 py-2 text-right text-sm font-semibold text-text">Total</td>
              {temSpecs && (
                <td className="px-5 py-2 text-right text-xs font-semibold text-text">
                  {totalMetros > 0 && <span>{totalMetros.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m</span>}
                  {totalMetros > 0 && totalArea > 0 && <br />}
                  {totalArea > 0 && <span>{totalArea.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²</span>}
                  {totalMetros === 0 && totalArea === 0 && "—"}
                </td>
              )}
              {temSpecs && <td className="px-5 py-2 text-right text-xs font-semibold text-text">{totalPeso > 0 ? `${totalPeso.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg` : "—"}</td>}
              <td colSpan={temSpecs ? 3 : 4} />
              <td className="px-5 py-2 text-right font-bold text-text">
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
    return <p className="text-sm text-text-3">Nenhum recebimento registrado.</p>;

  return (
    <div className="space-y-3">
      {recebimentos.map((r: any) => (
        <div key={r.id} className="card px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-text">
                {new Date(r.data_recebimento + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
              <span className="ml-2 text-sm text-text-2">por {(r.responsavel as any)?.nome}</span>
            </div>
            <span className="text-xs text-text-3">{r.itens?.length} iten(s)</span>
          </div>
          {r.observacoes && <p className="mt-1 text-sm text-text-2">{r.observacoes}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {(r.itens ?? []).map((ri: any) => (
              <span key={ri.id} className="rounded bg-bg px-2 py-0.5 text-xs text-text-2">
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
        <Button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? "Enviando…" : "Anexar documento"}
        </Button>
        <span className="text-xs text-text-3">PDF, imagens, planilhas, etc.</span>
      </div>

      {erro && <Alert variant="danger" className="mb-3">{erro}</Alert>}

      {docs.length === 0 && documentos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-text-3">
          Nenhum documento anexado.
        </div>
      ) : (
        <div className="card divide-y divide-border overflow-hidden">
          {documentos.map((d: any) => (
            <div key={d.id} className="flex items-center gap-4 px-5 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-text-3">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-text">{d.nome_arquivo}</p>
                <p className="text-xs text-text-3">
                  {d.usuario?.nome} · {new Date(d.criado_em).toLocaleDateString("pt-BR")}
                  {d.tamanho_bytes ? ` · ${formatBytes(d.tamanho_bytes)}` : ""}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDownload(d.caminho_storage, d.nome_arquivo)}>
                  Baixar
                </Button>
                <button type="button" onClick={() => handleDelete(d.id)}
                  className="text-text-3 hover:text-danger transition-colors">
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
        <label className="text-sm font-medium text-text">Nova anotação</label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          placeholder="Registre algo relevante sobre este pedido…"
          className="field text-sm"
        />
        {erro && <Alert variant="danger">{erro}</Alert>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending || !texto.trim()} size="sm">
            {pending ? "Salvando…" : "Adicionar anotação"}
          </Button>
        </div>
      </form>

      {anotacoes.length === 0 ? (
        <p className="text-sm text-text-3">Nenhuma anotação registrada.</p>
      ) : (
        <div className="space-y-3">
          {anotacoes.map((a: any) => (
            <div key={a.id} className="card px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-text">{(a.usuario as any)?.nome ?? "—"}</span>
                {a.status_pedido && (
                  <span className="rounded bg-bg px-2 py-0.5 text-xs text-text-2">
                    {STATUS_PED_LABEL[a.status_pedido as keyof typeof STATUS_PED_LABEL] ?? a.status_pedido}
                  </span>
                )}
                <span className="ml-auto text-xs text-text-3">
                  {new Date(a.criado_em).toLocaleString("pt-BR")}
                </span>
              </div>
              <p className="text-sm text-text-2 whitespace-pre-wrap">{a.texto}</p>
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
    return <p className="text-sm text-text-3">Nenhum evento registrado.</p>;

  return (
    <div className="space-y-3">
      {historico.map((h: any) => (
        <div key={h.id} className="flex gap-3 text-sm">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
          <div>
            <span className="font-medium text-text">{h.acao.replace(/_/g, " ")}</span>
            {h.usuario && <span className="text-text-3"> por {(h.usuario as any).nome}</span>}
            {h.dados?.observacoes && (
              <p className="mt-0.5 text-text-2">{h.dados.observacoes}</p>
            )}
            <p className="text-xs text-text-3">{new Date(h.criado_em).toLocaleString("pt-BR")}</p>
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
      <div className="border-b border-border">
        <div className="flex overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setAba(t)}
              className={`-mb-px shrink-0 border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                aba === t ? "border-primary text-primary" : "border-transparent text-text-2 hover:text-text"
              }`}>
              {t}
              {contadores[t] != null && contadores[t]! > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  aba === t ? "bg-primary/10 text-primary" : "bg-bg text-text-3"
                }`}>
                  {contadores[t]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

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

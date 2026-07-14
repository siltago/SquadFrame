import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { PrintButton, SalvarPdfButton } from "@/modules/squadframe/components/compras/print-button";
import { PdfScaleWrapper } from "@/modules/squadframe/components/compras/pdf-scale-wrapper";

export const dynamic = "force-dynamic";

function fmt(v: number, casas = 3) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// Nome sugerido pro arquivo salvo: "<número>-<obra> [AAAA-MM-DD HHmm].pdf" —
// sem caracteres inválidos em nome de arquivo (Windows/macOS/Android/iOS).
function nomeArquivoPdf(numero: string, obraNome: string): string {
  const agora = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())} ${pad(agora.getHours())}${pad(agora.getMinutes())}`;
  const base = `${numero}-${obraNome} [${timestamp}]`.replace(/[\\/:*?"<>|]/g, "-").trim();
  return `${base}.pdf`;
}

function DataRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 3, fontSize: 11 }}>
      <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{label}:</span>
      <span>{value ?? "—"}</span>
    </div>
  );
}

export default async function VisualizarPedidoPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();

  const [pedResult, itensResult, empResult, coresResult, aprovResult] = await Promise.all([
    admin.from("pedidos_compra")
      .select(`*,
        obra:obras(id, nome, codigo, numero),
        fornecedor:fornecedores(nome, razao_social, cnpj, telefone, email),
        comprador:usuarios(nome, cargo:cargos(nome)),
        forma_pagamento:formas_pagamento(nome)
      `)
      .eq("id", params.id)
      .single(),
    admin.from("vw_pedido_itens")
      .select("*, produto:produtos(codigo_mestre, nome, peso_metro, tamanho_mm)")
      .eq("pedido_id", params.id),
    admin.from("empresa").select("*").eq("id", "default").maybeSingle(),
    admin.from("cores_ral").select("id, codigo_ral, nome, hex").order("codigo_ral"),
    admin.from("compra_historico")
      .select("usuario_id, criado_em, usuario:usuarios(nome, cargo:cargos(nome))")
      .eq("entidade", "pedido")
      .eq("entidade_id", params.id)
      .eq("acao", "STATUS_APROVADO")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!pedResult.data) notFound();

  const ped = pedResult.data;
  const itens = itensResult.data ?? [];

  const produtoIds = [...new Set(itens.map((i: any) => i.produto_id).filter(Boolean))];
  const fornecedorId = (ped as any).fornecedor_id;

  let imagensMap: Record<string, string> = {};
  let aliasMap: Record<string, string> = {};
  if (produtoIds.length > 0) {
    const [arquivosRes, aliasRes] = await Promise.all([
      admin.from("produto_arquivos")
        .select("produto_id, url, url_preview, tipo")
        .in("produto_id", produtoIds)
        .order("criado_em", { ascending: true }),
      fornecedorId
        ? admin.from("produto_aliases")
            .select("produto_id, alias")
            .eq("fornecedor_id", fornecedorId)
            .in("produto_id", produtoIds)
        : Promise.resolve({ data: [] }),
    ]);
    for (const arq of arquivosRes.data ?? []) {
      if (!imagensMap[arq.produto_id] && (arq.tipo?.startsWith("image") || arq.url_preview)) {
        imagensMap[arq.produto_id] = arq.url_preview ?? arq.url;
      }
    }
    for (const al of (aliasRes as any).data ?? []) {
      aliasMap[al.produto_id] = al.alias;
    }
  }
  const emp = (empResult.data ?? {}) as any;
  const coresRaw = coresResult.data ?? [];
  const forn = (ped.fornecedor as any) ?? {};
  const obra = (ped.obra as any) ?? {};
  const comprador = (ped.comprador as any) ?? {};
  const compradorCargo = (comprador.cargo as any)?.nome ?? null;
  const formaPgto = (ped.forma_pagamento as any) ?? {};
  const coresMap = Object.fromEntries((coresRaw ?? []).map((c: any) => [c.id, c]));

  const aprov = aprovResult.data as any;
  const aprovador = (aprov?.usuario as any) ?? {};
  const aprovadorCargo = (aprovador.cargo as any)?.nome ?? null;
  const aprovadoEm = aprov?.criado_em ? new Date(aprov.criado_em) : null;
  const elaboradoEm = ped.criado_em ? new Date(ped.criado_em) : null;

  function assinadoEm(d: Date | null) {
    return d
      ? d.toLocaleString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : null;
  }

  function endereco(e: any) {
    const partes = [
      e.endereco && e.numero ? `${e.endereco}, ${e.numero}` : e.endereco,
      e.bairro,
      e.cidade && e.estado ? `${e.cidade}/${e.estado}` : (e.cidade ?? e.estado),
    ].filter(Boolean);
    return partes.join(" – ") || null;
  }

  let totalProduto = 0;
  let totalKg = 0;

  const isVidro = (ped.tipo_linha ?? "").toUpperCase().includes("VIDRO");
  // Perfil com valor final confirmado: preco_unitario foi redefinido para
  // R$/kg pela distribuição por peso (ver distribuirValorFinalPorPeso), não
  // R$/m — o total do item vira peso × preco_unitario, e não
  // quantidade × comprimento × preco_unitario como no modo estimativa.
  const usaPrecoKg = (ped.tipo_linha ?? "").toUpperCase().includes("PERFIL") && ped.valor_final != null;
  // Para pedidos de vidro, o pedido já enriquece descricao_snapshot com "— NxL×A mm" (enriquecerItensChapa).
  // Como o PDF de vidro tem coluna própria "Larg x Alt", removemos esse sufixo redundante só na exibição.
  const SUFIXO_DIMENSOES = /\s*—\s*\d+\s*×\s*\d+L\s*×\s*\d+A\s*mm\s*$/;
  function descricaoExibir(desc: string) {
    return isVidro ? desc.replace(SUFIXO_DIMENSOES, "") : desc;
  }

  const FATOR_MASSA_CHAPA = 0.0000025;

  function calcTotalItemKg(item: any): number {
    const isChapa = ["CHAPA","M²","M2"].includes((item.unidade ?? "").toUpperCase());
    const tamanhoM = (item.produto?.tamanho_mm ?? 6000) / 1000;
    const temTamanho = !!(item.produto?.tamanho_mm);
    if (isChapa && item.largura_m && item.altura_m && item.produto?.tamanho_mm && item.qtd_pecas) {
      // L(mm) × A(mm) × espessura(mm) × 0.0000025 × qtd_pecas
      return item.largura_m * 1000 * item.altura_m * 1000 * item.produto.tamanho_mm * FATOR_MASSA_CHAPA * item.qtd_pecas;
    }
    const pesoUnit = item.produto?.peso_metro ?? 0;
    return temTamanho ? item.quantidade_pedida * tamanhoM * pesoUnit : item.quantidade_pedida * pesoUnit;
  }

  // Preço/kg médio calculado direto de valor_final ÷ peso_total_do_pedido —
  // não lemos preco_unitario do banco pra isso (mesma razão do TabItens: a
  // tela sempre bate com valor_final, mesmo que a distribuição server-side
  // não tenha gravado exatamente esse peso).
  const totalKgPedido = usaPrecoKg ? itens.reduce((s: number, item: any) => s + calcTotalItemKg(item), 0) : 0;
  const precoKgMedio = usaPrecoKg && totalKgPedido > 0 ? Number(ped.valor_final) / totalKgPedido : null;

  const linhas = itens.map((item: any) => {
    const totalItemKg = calcTotalItemKg(item);
    // preco_unitario já vem pronto por unidade pedida (R$/barra, R$/peça de
    // chapa, R$/m, R$/un — ver calcPrecoUnit e o preenchimento de itens em
    // novo-pedido-cliente.tsx), então o total do item é sempre
    // quantidade × preco_unitario, sem multiplicar pelo comprimento de novo
    // (fazia isso e inflava o total de perfis pelo tamanho da barra).
    const totalItem = precoKgMedio != null
      ? totalItemKg * precoKgMedio
      : item.quantidade_pedida * (item.preco_unitario ?? 0);
    totalProduto += totalItem;
    totalKg += totalItemKg;
    // cor por item → cor única do pedido → "Natural"
    const corId = item.cor_id || (ped as any).cor_id || null;
    const cor = corId ? coresMap[corId] : null;
    const thumb = imagensMap[item.produto_id] ?? null;
    const codigoExibir = item.codigo_fornecedor || aliasMap[item.produto_id] || item.produto?.codigo_mestre || "—";
    const corNome = cor ? (cor.nome ? `${cor.codigo_ral} - ${cor.nome}` : cor.codigo_ral) : "Natural";
    return { ...item, totalItem, totalItemKg, corNome, thumb, codigoExibir };
  });

  const pcNum = ped.numero ?? "—";
  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  // Valor final confirmado com o fornecedor prevalece sobre a soma dos itens
  // no total do pedido (mesma regra da action registrarValorFinal e da RPC
  // confirmar_debito_carteira) — TOTAL PRODUTO continua mostrando a soma
  // bruta dos itens, informativa.
  const totalDoPedido = ped.valor_final != null ? Number(ped.valor_final) : totalProduto;

  function largAlt(item: any) {
    if (item.largura_m == null || item.altura_m == null) return "—";
    return `${Math.round(item.largura_m * 1000)} x ${Math.round(item.altura_m * 1000)}`;
  }

  // Estilos inline para fidelidade ao PDF
  const azul = "#1e3a5f";
  const azulClaro = "#eaf0f8";
  const cinzaLinha = "#e0e0e0";

  const thStyle: React.CSSProperties = {
    padding: "6px 8px", color: "white", fontWeight: 700, fontSize: 10,
    textAlign: "center", whiteSpace: "pre-line", backgroundColor: azul,
  };
  const tdStyle: React.CSSProperties = { padding: "5px 8px", fontSize: 11, borderBottom: `1px solid ${cinzaLinha}` };

  return (
    <div className="min-h-full bg-gray-100">
      {/* Toolbar — oculta ao imprimir */}
      <div className="print:hidden sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface px-3 py-3 shadow-sm sm:gap-3 sm:px-6">
        <Link
          href={`/squadframe/compras/pedidos/${params.id}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-text-2 transition-colors duration-[120ms] hover:bg-surface-2 hover:text-text"
          title="Voltar ao pedido"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="hidden sm:inline">Voltar ao pedido</span>
        </Link>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">Visualização — PC {pcNum}</span>
        <div className="flex shrink-0 items-center gap-2">
          <PrintButton />
          <SalvarPdfButton elementId="pdf-content" nomeArquivo={nomeArquivoPdf(String(pcNum), obra.nome ?? "obra")} />
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm 13mm 14mm 13mm;
          }
          html, body { margin: 0; padding: 0; background: white; }
          body * { visibility: hidden; }
          #pdf-content, #pdf-content * { visibility: visible; }
          #pdf-content {
            position: absolute;
            top: 0; left: 0; right: 0;
            box-shadow: none !important;
            margin: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* cabeçalho da tabela repete em cada página */
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          /* impede que uma linha seja cortada no meio */
          tbody tr { page-break-inside: avoid; break-inside: avoid; }
          /* mantém blocos de totais e assinaturas juntos */
          .pdf-no-break { page-break-inside: avoid; break-inside: avoid; }
          /* garante que totais não fiquem orphaned */
          .pdf-totais { page-break-before: auto; break-before: auto; }
        }
      `}</style>

      {/* Folha A4 — 794px = 210mm a 96dpi. Em telas menores, PdfScaleWrapper reduz proporcionalmente. */}
      <div className="my-8 print:my-0">
      <PdfScaleWrapper>
      <div
        id="pdf-content"
        className="mx-auto bg-white shadow-xl print:shadow-none print:w-full"
        style={{ width: 794, minHeight: 1123, fontFamily: "Arial, Helvetica, sans-serif", fontSize: 12, color: "#1a1a1a" }}
      >
        {/* ── Cabeçalho ─────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 28px 14px", borderBottom: `3px solid ${azul}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {emp.logo_url && (
              <img src={emp.logo_url} alt="Logo" style={{ height: 108, maxWidth: 200, objectFit: "contain" }} />
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{emp.nome_fantasia ?? emp.nome ?? "EMPRESA"}</div>
              <div style={{ fontSize: 10, color: "#555", marginTop: 3, maxWidth: 420 }}>
                {[endereco(emp), emp.cep && `CEP: ${emp.cep}`, emp.cnpj && `CNPJ: ${emp.cnpj}`, emp.telefone].filter(Boolean).join("  |  ")}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right", paddingTop: 2 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Pedido de Compra</div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8, justifyContent: "flex-end" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>PC - Nº</span>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{pcNum}</span>
            </div>
          </div>
        </div>

        {/* ── Obra ──────────────────────────────────────────── */}
        <div style={{ backgroundColor: azul, color: "white", padding: "7px 28px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 12 }}>OBRA:</span>
          <span style={{ fontSize: 12 }}>{obra.nome ? `${obra.nome}${obra.codigo ? ` - ${obra.codigo}` : ""}` : "—"}</span>
        </div>

        {/* ── Fornecedor / Emitente ─────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${cinzaLinha}` }}>
          <div style={{ padding: "10px 28px", borderRight: `1px solid ${cinzaLinha}` }}>
            <div style={{ backgroundColor: azul, color: "white", padding: "3px 0", fontWeight: 700, fontSize: 11, textAlign: "center", marginBottom: 10 }}>FORNECEDOR</div>
            <DataRow label="Fornecedor" value={forn.razao_social ?? forn.nome} />
            <DataRow label="Endereço" value={endereco(forn)} />
            <DataRow label="CEP" value={forn.cep} />
            <DataRow label="CNPJ/CPF" value={forn.cnpj} />
          </div>
          <div style={{ padding: "10px 28px" }}>
            <div style={{ backgroundColor: azul, color: "white", padding: "3px 0", fontWeight: 700, fontSize: 11, textAlign: "center", marginBottom: 10 }}>EMITENTE</div>
            <DataRow label="Emitente" value={emp.nome_fantasia ?? emp.nome} />
            <DataRow label="Endereço" value={endereco(emp)} />
            <DataRow label="CEP" value={emp.cep} />
            <DataRow label="CNPJ/CPF" value={emp.cnpj} />
          </div>
        </div>

        {/* ── Cond. Pgto / Transporte ───────────────────────── */}
        <div style={{ backgroundColor: azulClaro, borderBottom: `1px solid ${cinzaLinha}`, padding: "7px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ fontSize: 11 }}>
            <strong>Cond. Pagamento: </strong>{formaPgto.nome ?? "—"}
          </div>
          <div style={{ fontSize: 11 }}>
            <strong>Tipo Transporte: </strong>{(ped as any).tipo_transporte ?? "—"}
          </div>
        </div>

        {/* ── Tabela de itens ───────────────────────────────── */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: "5%" }}>FOTO</th>
              <th style={{ ...thStyle, textAlign: "left", width: "10%" }}>CÓDIGO{"\n"}DO ITEM</th>
              <th style={{ ...thStyle, textAlign: "left", width: isVidro ? "20%" : "24%" }}>DESCRIÇÃO DO ITEM</th>
              <th style={{ ...thStyle, width: "12%" }}>COR /{"\n"}ACABAMENTO</th>
              {isVidro && (
                <th style={{ ...thStyle, width: "11%" }}>LARG X ALT{"\n"}(mm)</th>
              )}
              <th style={{ ...thStyle, width: "9%" }}>QTD</th>
              <th style={{ ...thStyle, width: "11%" }}>VLR UNIT{"\n"}{precoKgMedio != null ? "(R$/kg)" : "(R$/m)"}</th>
              {!isVidro && (
                <th style={{ ...thStyle, width: "10%" }}>PESO UNIT{"\n"}kg/m</th>
              )}
              <th style={{ ...thStyle, width: "11%" }}>TOTAL ITEM{"\n"}(R$)</th>
              <th style={{ ...thStyle, width: "9%" }}>TOTAL{"\n"}KG</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: "#888", padding: 20 }}>
                  Nenhum item no pedido
                </td>
              </tr>
            )}
            {linhas.map((item: any, i: number) => (
              <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f7fafd", pageBreakInside: "avoid", breakInside: "avoid" }}>
                <td style={{ ...tdStyle, textAlign: "center", padding: "4px 6px" }}>
                  {item.thumb ? (
                    <img
                      src={item.thumb}
                      alt=""
                      style={{ width: 36, height: 36, objectFit: "contain", display: "block", margin: "0 auto" }}
                    />
                  ) : null}
                </td>
                <td style={{ ...tdStyle, fontFamily: "monospace" }}>{item.codigoExibir}</td>
                <td style={{ ...tdStyle, fontStyle: "italic" }}>{descricaoExibir(item.descricao_snapshot)}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{item.corNome}</td>
                {isVidro && (
                  <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace" }}>{largAlt(item)}</td>
                )}
                <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(item.quantidade_pedida)}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>R$ {fmt(precoKgMedio ?? item.preco_unitario ?? 0, 2)}</td>
                {!isVidro && (
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    {["CHAPA","M²","M2"].includes((item.unidade ?? "").toUpperCase())
                      ? (item.produto?.tamanho_mm ? `${item.produto.tamanho_mm} mm` : "—")
                      : fmt(item.produto?.peso_metro ?? 0, 3)}
                  </td>
                )}
                <td style={{ ...tdStyle, textAlign: "right" }}>R$ {fmt(item.totalItem, 2)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(item.totalItemKg, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totais ────────────────────────────────────────── */}
        <div className="pdf-no-break pdf-totais" style={{ borderTop: `2px solid ${azul}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 28px", backgroundColor: azulClaro, borderBottom: `1px solid ${cinzaLinha}` }}>
            <span style={{ fontSize: 11 }} />
            <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 11 }}>TOTAL PRODUTO:</span>
              <span style={{ fontSize: 11, fontWeight: 600, minWidth: 120, textAlign: "right" }}>R$ {fmt(totalProduto, 2)}</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "5px 28px", borderBottom: `1px solid ${cinzaLinha}` }}>
            <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 11 }}>TOTAL KG:</span>
              <span style={{ fontSize: 11, fontWeight: 600, minWidth: 120, textAlign: "right" }}>{fmt(totalKg, 3)} kg</span>
            </div>
          </div>
          <div style={{ backgroundColor: azul, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 28px" }}>
            <span style={{ fontWeight: 700, fontSize: 12 }}>TOTAL DO PEDIDO:</span>
            <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>R$ {fmt(totalDoPedido, 2)}</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{fmt(totalKg, 3)} kg</span>
            </div>
          </div>
        </div>

        {/* ── Observações ───────────────────────────────────── */}
        <div className="pdf-no-break" style={{ padding: "12px 28px", borderTop: `1px solid ${cinzaLinha}`, minHeight: 80 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12 }}>Observações:</div>
          <div style={{ fontSize: 11, color: "#333", whiteSpace: "pre-wrap" }}>{ped.observacoes ?? ""}</div>
        </div>

        {/* ── Assinaturas ───────────────────────────────────── */}
        <div className="pdf-no-break" style={{ borderTop: `1px solid ${cinzaLinha}`, marginTop: 48, padding: "16px 28px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, color: "#888", marginBottom: 32 }}>Elaborador</div>
            <div style={{ borderTop: `1px solid #aaa`, paddingTop: 6 }}>
              {assinadoEm(elaboradoEm) && (
                <div style={{ fontSize: 9, color: "#888" }}>Assinado digitalmente: {assinadoEm(elaboradoEm)}</div>
              )}
              <div style={{ fontSize: 11, marginTop: 2 }}>
                Elaborador: {comprador.nome ?? "—"}{compradorCargo ? ` - ${compradorCargo}` : ""}
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#888", marginBottom: 32 }}>Aprovador</div>
            <div style={{ borderTop: `1px solid #aaa`, paddingTop: 6 }}>
              {aprovadoEm ? (
                <>
                  <div style={{ fontSize: 9, color: "#888" }}>Assinado digitalmente: {assinadoEm(aprovadoEm)}</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    Aprovador: {aprovador.nome ?? "—"}{aprovadorCargo ? ` - ${aprovadorCargo}` : ""}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 11 }}>&nbsp;</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Rodapé ────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${cinzaLinha}`, padding: "4px 28px", display: "flex", justifyContent: "space-between", backgroundColor: "#fafafa" }}>
          <span style={{ fontSize: 9, color: "#888" }}>{pcNum}</span>
          <span style={{ fontSize: 9, color: "#888" }}>Emitido em {dataEmissao}</span>
        </div>
      </div>
      </PdfScaleWrapper>
      </div>
    </div>
  );
}

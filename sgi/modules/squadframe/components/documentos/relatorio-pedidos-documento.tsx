import Link from "next/link";
import { PrintButton, SalvarPdfButton } from "@/modules/squadframe/components/compras/print-button";
import { PdfScaleWrapper } from "@/modules/squadframe/components/compras/pdf-scale-wrapper";
import { RelatorioGraficos } from "@/modules/squadframe/components/documentos/relatorio-graficos";
import { FolhaA4 } from "@/modules/squadframe/components/documentos/folha-a4";
import { empacotarSecoes, type SecaoTabela } from "@/modules/squadframe/lib/paginacao";
import type { RelatorioPedidosData } from "@/modules/squadframe/services/relatorios/relatorio-pedidos";
import { STATUS_PED_LABEL, type StatusPedido } from "@/modules/squadframe/types/compras";

const azul = "#1e3a5f";
const cinzaLinha = "#e0e0e0";
const vermelho = "#b91c1c";
const vermelhoClaro = "#fef2f2";
const ambar = "#92400e";
const ambarClaro = "#fffbeb";

function formatarMoeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataHora(d: Date): string {
  return d.toLocaleString("pt-BR");
}

function formatarDataCurta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T00:00:00-03:00`).toLocaleDateString("pt-BR");
}

function nomeArquivoPdf(nome: string): string {
  const agora = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())} ${pad(agora.getHours())}${pad(agora.getMinutes())}`;
  const base = `${nome} [${timestamp}]`.replace(/[\\/:*?"<>|]/g, "-").trim();
  return `${base}.pdf`;
}

const th: React.CSSProperties = { textAlign: "left", padding: "5px 8px", fontWeight: 700, borderBottom: `1px solid ${cinzaLinha}` };
const td: React.CSSProperties = { padding: "5px 8px" };
const trStyle: React.CSSProperties = { breakInside: "avoid", pageBreakInside: "avoid" };

// Renderiza uma SecaoTabela já empacotada — título + tabela com o thead
// original repetido (a paginação já cuidou de qual pedaço de linhas entra
// em cada folha; aqui só desenha o que foi entregue). Quando é continuação
// da mesma seção numa folha seguinte, pula a barra de título e só repete o
// thead — a tabela simplesmente continua.
function BlocoSecao({ secao }: { secao: SecaoTabela }) {
  return (
    <div style={{ padding: "20px 28px 0" }}>
      {!secao.continuacao && (
        <div
          style={{
            backgroundColor: secao.cor,
            color: "white",
            padding: "5px 10px",
            fontWeight: 700,
            fontSize: 11,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{secao.titulo}</span>
          {secao.resumoSufixo && <span>{secao.resumoSufixo}</span>}
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
        <thead>{secao.thead}</thead>
        <tbody>{secao.linhas}</tbody>
      </table>
    </div>
  );
}

interface RelatorioPedidosDocumentoProps {
  dados: RelatorioPedidosData;
  titulo: string;
  subtitulo: string;
  empresa: any;
  autorNome: string;
  voltarHref: string;
}

// Documento A4 paginado (tela + PDF) pro relatório de pedidos — reaproveitado
// tanto pelo relatório Geral quanto pelo Por Obra, cada um só muda o título/
// subtítulo do cabeçalho e os `dados` já agregados pelo serviço. Nada aqui é
// persistido: o documento é gerado on-the-fly a partir dos filtros da URL.
export function RelatorioPedidosDocumento({ dados, titulo, subtitulo, empresa, autorNome, voltarHref }: RelatorioPedidosDocumentoProps) {
  const multiObra = dados.porObra.length > 1;

  const secoes: SecaoTabela[] = [];

  if (multiObra) {
    secoes.push({
      titulo: "RESUMO POR OBRA",
      cor: azul,
      thead: (
        <tr style={{ backgroundColor: "#f2f2f2" }}>
          <th style={th}>Obra</th>
          <th style={th}>Pedidos</th>
          <th style={{ ...th, textAlign: "right" }}>Valor</th>
        </tr>
      ),
      linhas: dados.porObra.map((g) => (
        <tr key={g.chave} style={trStyle}>
          <td style={td}>{g.chave}</td>
          <td style={td}>{g.quantidade}</td>
          <td style={{ ...td, textAlign: "right" }}>{formatarMoeda(g.valor)}</td>
        </tr>
      )),
    });
  }

  if (dados.atrasados.length > 0) {
    secoes.push({
      titulo: "⚠ PEDIDOS ATRASADOS",
      cor: vermelho,
      thead: (
        <tr style={{ backgroundColor: vermelhoClaro }}>
          <th style={th}>Número</th>
          <th style={th}>Obra</th>
          <th style={th}>Fornecedor</th>
          <th style={th}>Prazo previsto</th>
          <th style={th}>Dias de atraso</th>
          <th style={{ ...th, textAlign: "right" }}>Valor</th>
        </tr>
      ),
      linhas: dados.atrasados.map((p) => (
        <tr key={p.id} style={trStyle}>
          <td style={td}>{p.numero}</td>
          <td style={td}>{p.obra}</td>
          <td style={td}>{p.fornecedor}</td>
          <td style={td}>{formatarDataCurta(p.prazoEntrega)}</td>
          <td style={{ ...td, color: vermelho, fontWeight: 700 }}>{p.diasAtraso}d</td>
          <td style={{ ...td, textAlign: "right" }}>{formatarMoeda(p.valor)}</td>
        </tr>
      )),
    });
  }

  if (dados.aguardandoRecebimento.length > 0) {
    secoes.push({
      titulo: "AGUARDANDO RECEBIMENTO",
      cor: ambar,
      thead: (
        <tr style={{ backgroundColor: ambarClaro }}>
          <th style={th}>Número</th>
          <th style={th}>Obra</th>
          <th style={th}>Fornecedor</th>
          <th style={th}>Prazo previsto</th>
          <th style={{ ...th, textAlign: "right" }}>Valor</th>
        </tr>
      ),
      linhas: dados.aguardandoRecebimento.map((p) => (
        <tr key={p.id} style={trStyle}>
          <td style={td}>{p.numero}</td>
          <td style={td}>{p.obra}</td>
          <td style={td}>{p.fornecedor}</td>
          <td style={td}>{formatarDataCurta(p.prazoEntrega)}</td>
          <td style={{ ...td, textAlign: "right" }}>{formatarMoeda(p.valor)}</td>
        </tr>
      )),
    });
  }

  const theadPedidos = (mostrarObra: boolean) => (
    <tr style={{ backgroundColor: "#f2f2f2" }}>
      <th style={th}>Número</th>
      {mostrarObra && <th style={th}>Obra</th>}
      <th style={th}>Fornecedor</th>
      <th style={th}>Status</th>
      <th style={th}>Prazo entrega</th>
      <th style={{ ...th, textAlign: "right" }}>Valor</th>
      <th style={th}>Criado em</th>
    </tr>
  );
  const linhaPedido = (p: (typeof dados.pedidos)[number], mostrarObra: boolean) => (
    <tr key={p.id} style={trStyle}>
      <td style={td}>{p.numero}</td>
      {mostrarObra && <td style={td}>{p.obra}</td>}
      <td style={td}>{p.fornecedor}</td>
      <td style={td}>{STATUS_PED_LABEL[p.status] ?? p.status}</td>
      <td style={td}>{formatarDataCurta(p.prazoEntrega)}</td>
      <td style={{ ...td, textAlign: "right" }}>{formatarMoeda(p.valor)}</td>
      <td style={td}>{formatarDataCurta(p.criadoEm)}</td>
    </tr>
  );

  if (multiObra) {
    for (const grupo of dados.pedidosPorObra) {
      secoes.push({
        titulo: grupo.obra.toUpperCase(),
        cor: azul,
        thead: theadPedidos(false),
        linhas: grupo.pedidos.map((p) => linhaPedido(p, false)),
        resumoSufixo: `${grupo.quantidade} pedido${grupo.quantidade !== 1 ? "s" : ""} — ${formatarMoeda(grupo.valor)}`,
      });
    }
  } else if (dados.pedidos.length > 0) {
    const mostrarObra = dados.porObra.length === 0;
    secoes.push({
      titulo: "PEDIDOS",
      cor: azul,
      thead: theadPedidos(mostrarObra),
      linhas: dados.pedidos.map((p) => linhaPedido(p, mostrarObra)),
    });
  }

  const paginasEmpacotadas = empacotarSecoes(secoes);

  const folhas: React.ReactNode[] = [
    <>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "20px 28px 14px",
          borderBottom: `3px solid ${azul}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {empresa.logo_url && (
            <img src={empresa.logo_url} alt="Logo" style={{ height: 88, maxWidth: 180, objectFit: "contain" }} />
          )}
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{empresa.nome_fantasia ?? empresa.nome ?? "EMPRESA"}</div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 3 }}>Relatório de Pedidos de Compra</div>
          </div>
        </div>
        <div style={{ textAlign: "right", paddingTop: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{titulo}</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{subtitulo}</div>
        </div>
      </div>

      <div style={{ padding: "18px 28px 6px" }}>
        {dados.narrativa.map((paragrafo, i) => (
          <p key={i} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>
            {paragrafo}
          </p>
        ))}
      </div>

      <div style={{ display: "flex", gap: 14, padding: "10px 28px 18px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140, backgroundColor: "#eaf0f8", borderRadius: 6, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>PEDIDOS NO PERÍODO</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{dados.totais.quantidade}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, backgroundColor: "#eaf0f8", borderRadius: 6, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>VALOR TOTAL</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{formatarMoeda(dados.totais.valorTotal)}</div>
        </div>
        {dados.atrasados.length > 0 && (
          <div style={{ flex: 1, minWidth: 140, backgroundColor: vermelhoClaro, borderRadius: 6, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: vermelho, fontWeight: 600 }}>ATRASADOS</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color: vermelho }}>{dados.atrasados.length}</div>
          </div>
        )}
        {dados.aguardandoRecebimento.length > 0 && (
          <div style={{ flex: 1, minWidth: 140, backgroundColor: ambarClaro, borderRadius: 6, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: ambar, fontWeight: 600 }}>AGUARDANDO RECEBIMENTO</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color: ambar }}>{dados.aguardandoRecebimento.length}</div>
          </div>
        )}
      </div>

      {dados.totais.quantidade > 0 && (
        <div style={{ padding: "0 28px 18px" }}>
          <RelatorioGraficos
            porObra={dados.porObra}
            porStatus={dados.porStatus.map((g) => ({ ...g, chave: STATUS_PED_LABEL[g.chave as StatusPedido] ?? g.chave }))}
          />
        </div>
      )}
    </>,
    ...paginasEmpacotadas.map((secoesDaFolha, i) => (
      <>
        {secoesDaFolha.map((secao, j) => (
          <BlocoSecao key={`${i}-${j}`} secao={secao} />
        ))}
      </>
    )),
  ];

  if (dados.totais.quantidade === 0) {
    folhas.push(
      <div style={{ padding: "20px 28px 0", textAlign: "center", color: "#777", fontSize: 11 }}>
        Nenhum pedido encontrado.
      </div>,
    );
  }

  const ultimoIndice = folhas.length - 1;
  folhas[ultimoIndice] = (
    <>
      {folhas[ultimoIndice]}
      <div style={{ padding: "14px 28px 0", fontSize: 9.5, color: "#888" }}>
        Gerado em {formatarDataHora(new Date())} por {autorNome}.
      </div>
    </>
  );

  const tituloRodape = `${empresa.nome_fantasia ?? empresa.nome ?? "Empresa"} — ${titulo}`;

  return (
    <div className="min-h-full bg-gray-100">
      <div className="print:hidden sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface px-3 py-3 shadow-sm sm:gap-3 sm:px-6">
        <Link
          href={voltarHref}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-text-2 transition-colors duration-[120ms] hover:bg-surface-2 hover:text-text"
          title="Voltar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="hidden sm:inline">Ajustar filtros</span>
        </Link>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{titulo}</span>
        <div className="flex shrink-0 items-center gap-2">
          <PrintButton />
          <SalvarPdfButton elementId="pdf-content" nomeArquivo={nomeArquivoPdf(titulo)} formato="a4-multipla" />
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          html, body { margin: 0; padding: 0; background: white; }
          body * { visibility: hidden; }
          #pdf-content, #pdf-content * { visibility: visible; }
          #pdf-content {
            position: absolute;
            top: 0; left: 0; right: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .folha-a4 { box-shadow: none !important; margin-bottom: 0 !important; }
          thead { display: table-header-group; }
        }
      `}</style>

      <div className="my-8 print:my-0">
        <PdfScaleWrapper>
          <div id="pdf-content">
            {folhas.map((conteudo, i) => (
              <FolhaA4
                key={i}
                pagina={i + 1}
                totalPaginas={folhas.length}
                ultima={i === ultimoIndice}
                tituloRodape={tituloRodape}
              >
                {conteudo}
              </FolhaA4>
            ))}
          </div>
        </PdfScaleWrapper>
      </div>
    </div>
  );
}

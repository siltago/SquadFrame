import Link from "next/link";
import { PrintButton, SalvarPdfButton } from "@/modules/squadframe/components/compras/print-button";
import { PdfScaleWrapper } from "@/modules/squadframe/components/compras/pdf-scale-wrapper";
import { FolhaA4 } from "@/modules/squadframe/components/documentos/folha-a4";
import { empacotarSecoes, type SecaoTabela } from "@/modules/squadframe/lib/paginacao";

const azul = "#1e3a5f";
const cinzaLinha = "#e0e0e0";

export interface ItemFolha {
  codigo: string;
  nome: string;
  unidade: string;
  fotoUrl: string | null;
  caminhoLocal: string;
  obraNome: string | null;
  corLabel: string | null;
  quantidadeEsperada: number;
}

const th: React.CSSProperties = { textAlign: "left", padding: "6px 8px", fontWeight: 700, borderBottom: `1px solid ${cinzaLinha}` };
const td: React.CSSProperties = { padding: "6px 8px", verticalAlign: "middle" };
const trStyle: React.CSSProperties = { breakInside: "avoid", pageBreakInside: "avoid", borderBottom: `1px solid ${cinzaLinha}` };

function nomeArquivoPdf(numero: string): string {
  return `${numero} - folha de contagem.pdf`;
}

// Folha impressa de contagem cíclica — contagem CEGA de propósito: não
// mostra o saldo esperado pelo sistema (só código/foto/nome/local), pra não
// enviesar quem confere. O saldo esperado só entra no diff em
// concluirContagem, depois que o número contado já foi digitado.
export function FolhaContagemDocumento({
  numero,
  localRaizNome,
  criadoEm,
  itens,
  voltarHref,
}: {
  numero: string;
  localRaizNome: string;
  criadoEm: string;
  itens: ItemFolha[];
  voltarHref: string;
}) {
  const thead = (
    <tr style={{ backgroundColor: "#f2f2f2" }}>
      <th style={{ ...th, width: 44 }}></th>
      <th style={th}>Código</th>
      <th style={th}>Item</th>
      <th style={th}>Local</th>
      <th style={{ ...th, width: 90, textAlign: "center" }}>Contagem</th>
    </tr>
  );

  const secoes: SecaoTabela[] = [
    {
      titulo: `FOLHA DE CONTAGEM — ${localRaizNome.toUpperCase()}`,
      cor: azul,
      thead,
      resumoSufixo: `${itens.length} ${itens.length === 1 ? "item" : "itens"}`,
      linhas: itens.map((item, i) => (
        <tr key={i} style={trStyle}>
          <td style={td}>
            {item.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.fotoUrl} alt="" style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 4 }} />
            ) : (
              <div style={{ width: 34, height: 34, borderRadius: 4, backgroundColor: "#eee" }} />
            )}
          </td>
          <td style={{ ...td, fontFamily: "monospace", fontSize: 10.5 }}>{item.codigo}</td>
          <td style={td}>
            <div style={{ fontWeight: 600 }}>{item.nome}</div>
            <div style={{ fontSize: 9.5, color: "#777" }}>
              {[item.obraNome, item.corLabel].filter(Boolean).join(" · ")}
            </div>
          </td>
          <td style={{ ...td, fontSize: 10.5, color: "#555" }}>{item.caminhoLocal}</td>
          <td style={{ ...td, textAlign: "center" }}>
            <div style={{ borderBottom: "1px solid #999", height: 18, width: 60, margin: "0 auto" }} />
            <div style={{ fontSize: 8.5, color: "#999", marginTop: 2 }}>{item.unidade}</div>
          </td>
        </tr>
      )),
    },
  ];

  const paginasEmpacotadas = empacotarSecoes(secoes, 26);

  const folhas: React.ReactNode[] = paginasEmpacotadas.map((secoesDaFolha, i) => (
    <div key={i}>
      {i === 0 && (
        <div style={{ padding: "20px 28px 4px", display: "flex", justifyContent: "space-between", borderBottom: `3px solid ${azul}` }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Folha de contagem de estoque</div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 3 }}>{numero}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#555" }}>Gerada em {new Date(criadoEm).toLocaleDateString("pt-BR")}</div>
            <div style={{ fontSize: 9.5, color: "#999", marginTop: 8 }}>Conferido por: _____________________</div>
          </div>
        </div>
      )}
      {secoesDaFolha.map((secao, j) => (
        <div key={j} style={{ padding: "16px 28px 0" }}>
          {!secao.continuacao && (
            <div style={{ backgroundColor: secao.cor, color: "white", padding: "5px 10px", fontWeight: 700, fontSize: 11, display: "flex", justifyContent: "space-between" }}>
              <span>{secao.titulo}</span>
              {secao.resumoSufixo && <span>{secao.resumoSufixo}</span>}
            </div>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
            <thead>{secao.thead}</thead>
            <tbody>{secao.linhas}</tbody>
          </table>
        </div>
      ))}
    </div>
  ));

  const ultimoIndice = folhas.length - 1;
  const tituloRodape = `SquadStock — ${numero}`;

  return (
    <div className="min-h-full bg-gray-100">
      <div className="print:hidden sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface px-3 py-3 shadow-sm sm:gap-3 sm:px-6">
        <Link
          href={voltarHref}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-text-2 transition-colors duration-[120ms] hover:bg-surface-2 hover:text-text"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="hidden sm:inline">Voltar</span>
        </Link>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{numero}</span>
        <div className="flex shrink-0 items-center gap-2">
          <PrintButton />
          <SalvarPdfButton elementId="pdf-content" nomeArquivo={nomeArquivoPdf(numero)} formato="a4-multipla" />
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          html, body { margin: 0; padding: 0; background: white; }
          body * { visibility: hidden; }
          #pdf-content, #pdf-content * { visibility: visible; }
          #pdf-content { position: absolute; top: 0; left: 0; right: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .folha-a4 { box-shadow: none !important; margin-bottom: 0 !important; }
          thead { display: table-header-group; }
        }
      `}</style>

      <div className="my-8 print:my-0">
        <PdfScaleWrapper>
          <div id="pdf-content">
            {folhas.map((conteudo, i) => (
              <FolhaA4 key={i} pagina={i + 1} totalPaginas={folhas.length} ultima={i === ultimoIndice} tituloRodape={tituloRodape}>
                {conteudo}
              </FolhaA4>
            ))}
          </div>
        </PdfScaleWrapper>
      </div>
    </div>
  );
}

const azul = "#1e3a5f";

interface FolhaA4Props {
  children: React.ReactNode;
  pagina: number;
  totalPaginas: number;
  ultima: boolean;
  tituloRodape: string;
}

// Uma "folha" = uma página A4 real, tanto na pré-visualização em tela quanto
// no PDF exportado. `breakAfter` força o corte exatamente aqui (tanto no
// print nativo do navegador quanto no html2pdf, que lê a mesma propriedade
// CSS via getComputedStyle) — sem isso, o conteúdo apenas estoura pra
// próxima página onde o navegador decidir, o que raramente bate com o que
// aparece na tela.
export function FolhaA4({ children, pagina, totalPaginas, ultima, tituloRodape }: FolhaA4Props) {
  return (
    <div
      className="folha-a4 mx-auto bg-white shadow-xl print:shadow-none"
      style={{
        width: 794,
        minHeight: 1123,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 12,
        color: "#1a1a1a",
        marginBottom: ultima ? 0 : 24,
        breakAfter: ultima ? "auto" : "page",
        pageBreakAfter: ultima ? "auto" : "always",
      }}
    >
      <div style={{ flex: 1 }}>{children}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px 28px",
          fontSize: 9,
          color: "#999",
          borderTop: `1px solid #eee`,
        }}
      >
        <span>{tituloRodape}</span>
        <span>
          Página {pagina} de {totalPaginas}
        </span>
      </div>
    </div>
  );
}

export const corAzulFolha = azul;

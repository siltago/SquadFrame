// Empacotamento de seções (tabelas com título) em folhas A4 — determinístico,
// calculado uma vez no servidor a partir de uma estimativa de "linhas por
// página" (não é medição real de DOM), então o resultado é idêntico entre a
// pré-visualização em tela e a exportação em PDF.
//
// Ao contrário de dar uma folha própria pra cada seção (o que gera páginas
// quase vazias quando há muitas seções curtas — ex: um relatório com 10
// obras gerava 10 folhas só de detalhamento), o empacotador GREEDY enche
// cada folha com quantas seções (ou pedaços de seção) couberem, só pulando
// pra próxima folha quando o espaço realmente acaba.
export const LINHAS_POR_PAGINA = 40;

// Espaço "gasto" por um título de seção + cabeçalho da tabela, na mesma
// unidade das linhas de dados — impede que um título fique sozinho no fim
// de uma folha sem nenhuma linha de dado abaixo dele.
const CUSTO_TITULO = 2;

export interface SecaoTabela {
  titulo: string;
  cor: string; // cor de fundo da barra de título
  thead: React.ReactNode; // conteúdo do <tr> do cabeçalho da tabela (repetido em toda continuação)
  linhas: React.ReactNode[]; // cada item = conteúdo de UM <tr> já pronto
  resumoSufixo?: string; // ex: "10 pedidos — R$ 129.865,84" — some nas continuações
  continuacao?: boolean; // true quando é a 2ª+ folha da mesma seção — pula a barra de título, só repete o thead
}

export function empacotarSecoes(secoes: SecaoTabela[], linhasPorPagina = LINHAS_POR_PAGINA): SecaoTabela[][] {
  const folhas: SecaoTabela[][] = [];
  let folhaAtual: SecaoTabela[] = [];
  let espacoRestante = linhasPorPagina;

  for (const secao of secoes) {
    let restantes = secao.linhas;
    let primeiraParte = true;

    while (restantes.length > 0) {
      if (espacoRestante <= CUSTO_TITULO) {
        folhas.push(folhaAtual);
        folhaAtual = [];
        espacoRestante = linhasPorPagina;
      }
      const disponivel = Math.max(1, espacoRestante - CUSTO_TITULO);
      const pegar = restantes.slice(0, disponivel);
      restantes = restantes.slice(pegar.length);

      folhaAtual.push({
        ...secao,
        linhas: pegar,
        resumoSufixo: primeiraParte ? secao.resumoSufixo : undefined,
        continuacao: !primeiraParte,
      });
      espacoRestante -= CUSTO_TITULO + pegar.length;
      primeiraParte = false;
    }
  }

  if (folhaAtual.length > 0) folhas.push(folhaAtual);
  return folhas;
}

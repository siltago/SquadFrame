// Extrai necessidades de material (ferragens/insumos + perfis de
// alumínio) do XML de pedido/tipologia exportado pelo ERP externo —
// mesmo arquivo usado em wise/works/lib/xml-tipologias.ts pra
// cadastrar a tipologia, mas aqui lendo COMPONENTES e PERFIS (que
// aquele parser ignora) pra levantar o que precisa ser comprado.
//
// COMPONENTES mistura material de verdade com apontamento de
// produção (setor de corte, usinagem, preparação, montagem) sem
// nenhum campo que os diferencie — só o CODIGO. A lista abaixo é a
// única forma confiável de separar: por design, um código nunca
// aparece nas duas categorias (ex: S-SILNEUTRO é material mesmo
// começando com "S-").
const CODIGOS_OPERACAO = new Set([
  "S-EMBRM", "S-CORTE90", "S-USICNC", "S-CORTERM", "S-CORTECM",
  "S-PREPSEPA", "S-PREPMONT", "S-CORTE45", "S-MONTF", "S-MONTCM",
]);

// cortesMm carrega os cortes individuais (não a soma) — é o que a
// otimização de corte (FFD, ver lib/otimizacao-corte.ts) precisa pra
// calcular quantas barras comprar. Só é relevante quando origem
// vira "perfil" (no confirmarImportacaoXml, no service); pra
// componentes vendidos em unidade/metro contínuo (parafuso, fita,
// silicone), o back-end usa `quantidade`/`unidade` direto.
export type NecessidadeParseada = {
  _key: number;
  origem: "componente" | "perfil";
  codigo: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  cortesMm: number[];
};

function num(s: string): number {
  return parseFloat(s.replace(",", ".")) || 0;
}

export function parseNecessidadesXml(text: string): NecessidadeParseada[] {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  const t = (node: Element, tag: string) => node.querySelector(tag)?.textContent?.trim() ?? "";

  type Grupo = { codigo: string; descricao: string; unidade: string; quantidade: number; comprimentoMm: number; cortesMm: number[] };
  const materiais = new Map<string, Grupo>();

  for (const c of Array.from(doc.querySelectorAll("COMPONENTE"))) {
    const codigo = t(c, "CODIGO");
    if (!codigo || CODIGOS_OPERACAO.has(codigo)) continue;

    const codigoCor = t(c, "CODIGOCOR") || codigo;
    const un = t(c, "UN");
    const key = `componente:${codigo}|${codigoCor}`;
    const g = materiais.get(key) ?? {
      codigo, descricao: t(c, "DESCRICAO") || codigo,
      unidade: un === "MM" ? "m" : "un",
      quantidade: 0, comprimentoMm: 0, cortesMm: [],
    };
    if (un === "MM") {
      const comprimento = num(t(c, "COMPRIMENTO"));
      g.comprimentoMm += comprimento;
      g.cortesMm.push(comprimento);
    } else {
      g.quantidade += num(t(c, "QUANTIDADE"));
    }
    materiais.set(key, g);
  }

  const perfis = new Map<string, Grupo>();
  for (const p of Array.from(doc.querySelectorAll("PERFIL"))) {
    const codigo = t(p, "CODIGO");
    if (!codigo) continue;
    const tratamento = t(p, "TRATAMENTO") || "sem tratamento";
    const key = `perfil:${codigo}|${tratamento}`;
    const g = perfis.get(key) ?? {
      codigo, descricao: `${t(p, "DESCRICAO") || codigo} (${tratamento})`,
      unidade: "m", quantidade: 0, comprimentoMm: 0, cortesMm: [],
    };
    const comprimento = num(t(p, "COMPRIMENTO"));
    g.comprimentoMm += comprimento;
    g.cortesMm.push(comprimento);
    perfis.set(key, g);
  }

  let key = 0;
  const resultado: NecessidadeParseada[] = [];
  for (const g of materiais.values()) {
    resultado.push({
      _key: key++, origem: "componente", codigo: g.codigo, descricao: g.descricao,
      quantidade: g.unidade === "m" ? Number((g.comprimentoMm / 1000).toFixed(3)) : g.quantidade,
      unidade: g.unidade,
      cortesMm: g.cortesMm,
    });
  }
  for (const g of perfis.values()) {
    resultado.push({
      _key: key++, origem: "perfil", codigo: g.codigo, descricao: g.descricao,
      quantidade: Number((g.comprimentoMm / 1000).toFixed(3)),
      unidade: "m",
      cortesMm: g.cortesMm,
    });
  }
  return resultado;
}

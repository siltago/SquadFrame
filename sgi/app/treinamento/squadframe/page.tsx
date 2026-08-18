import Link from "next/link";

export const dynamic = "force-dynamic";

const GUIAS = [
  {
    slug: "solicitacoes-aprovacoes",
    titulo: "Solicitações e Aprovações",
    descricao: "Criar, enviar, aprovar ou rejeitar solicitações e transformá-las em pedidos.",
  },
  {
    slug: "pedidos-etapas",
    titulo: "Pedidos e Etapas",
    descricao: "Criação, aprovação, emissão, recebimento, finalização, retorno e devolução de pedidos.",
  },
  {
    slug: "lotes-compras",
    titulo: "Lotes em Compras",
    descricao: "Preparar o contexto de Compras, vincular pedidos e acompanhar a cobertura do lote.",
  },
  {
    slug: "romaneios-entrega",
    titulo: "Romaneios de Entrega",
    descricao: "Cadastrar PDFs de romaneio, revisar a leitura e vincular os pedidos corretos.",
  },
  {
    slug: "beneficiamento",
    titulo: "Beneficiamento",
    descricao: "Enviar perfis naturais para pintura e acompanhar o processo de forma independente.",
  },
  {
    slug: "faturamento-direto-debitos",
    titulo: "Faturamento Direto e Débitos",
    descricao: "Selecionar faturamento direto, aprovar ou rejeitar débitos e resolver pendências.",
  },
  {
    slug: "usuario-compras-financeiro",
    titulo: "Primeiros Passos e Visão Geral",
    descricao: "Acesso, perfil, permissões, fornecedores e uma visão geral do fluxo antigo de Compras.",
  },
  {
    slug: "catalogo",
    titulo: "Catálogo",
    descricao: "Abas, linhas, categorias, produtos, cores RAL, aliases e arquivos técnicos.",
  },
  {
    slug: "carteiras-financeiro",
    titulo: "Carteiras no Financeiro",
    descricao: "Como criar carteiras por contrato e corrigir o saldo de um fornecedor com rastreabilidade.",
  },
];

export default function TreinamentoSquadFramePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/treinamento" className="mb-4 inline-block text-sm text-text-3 hover:text-text">← Guias</Link>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-3">Treinamento</p>
      <h1 className="text-2xl font-bold tracking-tight text-text">Guias do SquadFrame</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-2">
        Manuais de uso do módulo SquadFrame — telas, botões e o que cada status significa, sem jargão técnico.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {GUIAS.map((g) => (
          <Link
            key={g.slug}
            href={`/treinamento/squadframe/${g.slug}`}
            className="card block p-5 transition-colors hover:border-primary/40"
          >
            <h2 className="text-base font-semibold text-text">{g.titulo}</h2>
            <p className="mt-1.5 text-sm text-text-2">{g.descricao}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

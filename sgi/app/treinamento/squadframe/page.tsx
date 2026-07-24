import Link from "next/link";

export const dynamic = "force-dynamic";

const GUIAS = [
  {
    slug: "usuario-compras-financeiro",
    titulo: "Usuário, Compras e Financeiro",
    descricao: "Acesso, perfil, permissões, fornecedores, solicitações, pedidos, status e financeiro — do primeiro login ao pedido finalizado.",
  },
  {
    slug: "catalogo",
    titulo: "Catálogo",
    descricao: "Abas, linhas, categorias, produtos, cores RAL, aliases e arquivos técnicos.",
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

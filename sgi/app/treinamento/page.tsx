import Link from "next/link";

export const dynamic = "force-dynamic";

const MODULOS = [
  {
    slug: "squadframe",
    titulo: "SquadFrame",
    descricao: "Usuário, Compras e Financeiro — do primeiro login ao pedido finalizado.",
  },
];

export default function TreinamentoPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-3">Treinamento</p>
      <h1 className="text-2xl font-bold tracking-tight text-text">Módulos do sistema</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-2">
        Escolha o módulo pra ver os guias de uso — telas, botões e o que cada status significa, sem jargão técnico.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {MODULOS.map((m) => (
          <Link
            key={m.slug}
            href={`/treinamento/${m.slug}`}
            className="card block p-5 transition-colors hover:border-primary/40"
          >
            <h2 className="text-base font-semibold text-text">{m.titulo}</h2>
            <p className="mt-1.5 text-sm text-text-2">{m.descricao}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

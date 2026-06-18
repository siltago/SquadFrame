import Link from "next/link";
import { BackButton } from "@/components/back-button";

export default function ComprasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-56px)]">
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <BackButton href="/" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-ink-faint">Compras</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {[
            {
              href: "/compras",
              label: "Painel",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              ),
            },
            {
              href: "/compras/solicitacoes",
              label: "Solicitações",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
              ),
            },
            {
              href: "/compras/pedidos",
              label: "Pedidos",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              ),
            },
            {
              href: "/compras/fornecedores",
              label: "Fornecedores",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              ),
            },
            {
              href: "/compras/formas-pagamento",
              label: "Formas de Pgto.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              ),
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-soft hover:bg-canvas hover:text-ink"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line p-3 space-y-2">
          <Link href="/compras/solicitacoes/nova" className="btn-primary w-full text-center text-sm">
            Nova solicitação
          </Link>
          <Link href="/compras/pedidos/novo" className="btn-ghost w-full text-center text-sm">
            Novo pedido
          </Link>
        </div>
      </aside>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

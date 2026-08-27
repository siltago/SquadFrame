"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar, SidebarSection } from "@/ui/layout/AppSidebar";
import { Tooltip } from "@/ui/components/Tooltip";
import { cn } from "@/ui/lib/cn";
import {
  DashboardIcon, DocumentIcon, PackageIcon, BuildingIcon,
  BriefcaseIcon, CreditCardIcon, DollarSignIcon, LayersIcon, TruckIcon, PlusIcon,
} from "@/ui/icons";
import { usePode } from "@/modules/squadframe/components/user-provider";

export function ComprasSidebar() {
  const podeCriarPedido      = usePode("compras.pedido.criar");
  const podeCriarSolicitacao = usePode("compras.solicitacao.criar");
  const pathname = usePathname();
  const ocultarFabMobile = pathname?.endsWith("/visualizar") ?? false;

  const sections: SidebarSection[] = [
    {
      items: [
        { href: "/squadframe/compras",              label: "Painel",          icon: <DashboardIcon />,  exact: true },
        { href: "/squadframe/compras/solicitacoes", label: "Solicitações",    icon: <DocumentIcon />  },
        { href: "/squadframe/compras/pedidos",      label: "Pedidos",         icon: <PackageIcon />   },
        { href: "/squadframe/compras/lotes",        label: "Lotes",           icon: <LayersIcon />    },
        { href: "/squadframe/compras/entregas",     label: "Romaneios",       icon: <TruckIcon />     },
        { href: "/squadframe/compras/fornecedores", label: "Fornecedores",    icon: <BuildingIcon />  },
        { href: "/squadframe/compras/financeiro",   label: "Financeiro",      icon: <DollarSignIcon /> },
      ],
    },
    {
      title: "Configurações",
      items: [
        { href: "/squadframe/compras/empresa",          label: "Empresa",         icon: <BriefcaseIcon />  },
        { href: "/squadframe/compras/formas-pagamento", label: "Formas de Pgto.", icon: <CreditCardIcon /> },
      ],
    },
  ];

  const footer = (podeCriarSolicitacao || podeCriarPedido) ? (
    <>
      {podeCriarSolicitacao && (
        <Tooltip content="Nova solicitação" side="right" delay={150}>
          <Link
            href="/squadframe/compras/solicitacoes/nova"
            aria-label="Nova solicitação"
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full text-white",
              "bg-gradient-to-br from-accent to-accent-hover shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]",
              "transition-all duration-[var(--motion-hover)] ease-out hover:scale-110"
            )}
          >
            <PlusIcon size={19} />
          </Link>
        </Tooltip>
      )}
      {podeCriarPedido && (
        <Tooltip content="Novo pedido" side="right" delay={150}>
          <Link
            href="/squadframe/compras/pedidos/novo"
            aria-label="Novo pedido"
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full text-text-3",
              "transition-all duration-[var(--motion-hover)] ease-out hover:scale-110 hover:bg-surface-2 hover:text-text"
            )}
          >
            <PlusIcon size={19} />
          </Link>
        </Tooltip>
      )}
    </>
  ) : undefined;

  return (
    <AppSidebar
      sections={sections}
      footer={footer}
      hideMobileTrigger={ocultarFabMobile}
    />
  );
}

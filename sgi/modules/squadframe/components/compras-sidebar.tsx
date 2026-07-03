"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar, SidebarSection } from "@/ui/layout/AppSidebar";
import { Button } from "@/ui/components/Button";
import {
  DashboardIcon, DocumentIcon, PackageIcon, BuildingIcon,
  BriefcaseIcon, CreditCardIcon, DollarSignIcon,
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
    <div className="space-y-2">
      {podeCriarSolicitacao && (
        <Button as="a" href="/squadframe/compras/solicitacoes/nova" className="w-full justify-center">
          Nova solicitação
        </Button>
      )}
      {podeCriarPedido && (
        <Button as="a" href="/squadframe/compras/pedidos/novo" variant="ghost" className="w-full justify-center">
          Novo pedido
        </Button>
      )}
    </div>
  ) : undefined;

  return (
    <AppSidebar
      sections={sections}
      footer={footer}
      storageKey="squad-compras-sidebar"
      hideMobileTrigger={ocultarFabMobile}
    />
  );
}

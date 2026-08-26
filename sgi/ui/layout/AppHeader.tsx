"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { cn } from "@/ui/lib/cn";

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  exact?: boolean;
}

interface AppHeaderProps {
  logoSrc?: string;
  logoAlt?: string;
  appName?: string;
  homeHref?: string;
  navItems?: NavItem[];
  rightSlot?: ReactNode;
  mobileNavSlot?: ReactNode;
  height?: number;
  className?: string;
}

// Barra flutuante estilo vidro — painel translúcido com blur (não mais cor
// sólida opaca, que contrastava forte demais contra o fundo claro) sobre
// --color-header, cantos bem arredondados, afastado da borda da tela. O
// logo do módulo vive numa bolinha própria à parte. --color-header não
// muda de valor entre claro/escuro, e por ser translúcido o painel se
// adapta sozinho ao que está atrás dele nos dois temas.
export function AppHeader({
  logoSrc = "/favicon.png",
  logoAlt = "Logo",
  appName = "SquadFrame",
  homeHref = "/",
  navItems = [],
  rightSlot,
  mobileNavSlot,
  height = 56,
  className,
}: AppHeaderProps) {
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  // Vidro de verdade: fundo translúcido (não opaco) + blur do que está atrás,
  // realce de luz no topo e sombra suave — contraste bem mais baixo que uma
  // barra de cor sólida, mas ainda com profundidade (bisel + aresta clara).
  const glassStyle = (h: number): React.CSSProperties => ({
    backgroundColor: "rgb(var(--color-header) / 0.42)",
    backgroundImage: "linear-gradient(180deg, rgb(255 255 255 / 0.14), rgb(255 255 255 / 0) 55%)",
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    height: h,
    boxShadow: [
      "0 12px 28px -14px rgb(0 0 0 / 0.35)",
      "inset 0 1px 0 rgb(255 255 255 / 0.22)",
      "inset 0 -1px 6px rgb(0 0 0 / 0.12)",
    ].join(", "),
  });

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex items-center gap-1.5 px-3 sm:px-5"
      style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
    >
      {/* Mobile nav slot (hamburger button) — volta a ser o fallback pra
          telas médias também agora (lg:hidden, não só sm:hidden): abaixo de
          1024px é mais seguro cair pro menu hamburguer simples do que tentar
          espremer nav+busca+usuário numa faixa estreita demais. */}
      {mobileNavSlot && <div className="lg:hidden shrink-0">{mobileNavSlot}</div>}

      {/* Logo sem bolha/fundo — só o ícone, sem glass nenhum (o vazamento
          de cor entre a bolha e a pastilha, mesmo depois de várias
          tentativas de correção de blur/composição, não parou de forma
          confiável — tirar o fundo elimina o problema pela raiz). */}
      <Link
        href={homeHref}
        title={appName}
        aria-label={appName}
        className="group flex shrink-0 items-center justify-center"
        style={{ height, width: height }}
      >
        {logoSrc && (
          <Image
            src={logoSrc}
            alt={logoAlt}
            width={32}
            height={32}
            className="shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-transform duration-[var(--motion-hover)] ease-[var(--ease-spring)] group-hover:scale-110"
          />
        )}
      </Link>

      {/* Pastilha principal: nav + ações */}
      <header
        className={cn(
          "mx-auto flex w-full min-w-0 max-w-[1500px] items-center gap-2 rounded-full px-3 ring-1 ring-white/10 sm:gap-3 sm:px-4",
          className
        )}
        style={glassStyle(height)}
      >
        {/* Desktop nav — nunca deixa o conteúdo estourar a pastilha (era o
            bug: sem min-w-0, o nav não encolhia e empurrava a foto/nome do
            usuário pra fora). justify-between espalha os itens pra ocupar o
            espaço sobrando em vez de ficarem grudados à esquerda. */}
        {navItems.length > 0 && (
          <nav className="hidden lg:flex min-w-0 flex-1 items-center justify-between gap-1 self-start pt-1.5" aria-label="Navegação principal">
            {navItems.map(item => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap 2xl:px-3.5",
                    "transition-[color,background-color] duration-[var(--motion-hover)] ease-[var(--ease-spring)]",
                    active
                      ? "text-[rgb(var(--color-header))] dark:text-white/65"
                      : "text-white/65 hover:bg-white/12 hover:text-white"
                  )}
                >
                  {/* Aba de pasta — desenhada ANTES do ícone no DOM (sem
                      z-index negativo, que deixava o fundo do header pintar
                      por cima). O topo era uma linha reta entre os ombros
                      (pra ficar escondida atrás da pill) — exposta, lia como
                      corte. Cantos arredondados em separado geravam um
                      ângulo torto no encontro com a curva do ombro (lia como
                      um círculo grudado). Agora é um arco QUADRÁTICO ÚNICO
                      cobrindo o topo inteiro (sem trecho reto nenhum) que já
                      nasce com a mesma direção da curva do ombro. */}
                  {active && (
                    <svg
                      aria-hidden="true"
                      className="absolute pointer-events-none"
                      style={{
                        top: -6, height: 56,
                        left: "50%", width: "calc(100% + 32px)", transform: "translateX(-50%)",
                      }}
                      viewBox="0 0 200 38"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M40,8 Q100,7.5 160,8 C168,8 172.5,12.5 174,17 L178.2,23.9 C184.3,34 190.4,38 200,38 L0,38 C9.6,38 15.7,34 21.8,23.9 L26,17 C27.5,12.5 32,8 40,8 Z"
                        fill="rgb(var(--color-bg))"
                        style={{ filter: "drop-shadow(0 6px 16px rgb(0 0 0 / 0.18))" }}
                      />
                    </svg>
                  )}
                  {/* Ícone sempre visível; label só a partir de 2xl (1536px).
                      Nome de usuário e texto da busca escondem antes disso
                      (ver header-user.tsx/busca-global.tsx). */}
                  {item.icon && <span className="relative top-2 shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
                  <span className="relative top-2 hidden xl:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
        <span className="min-w-0 flex-1 truncate pl-1 text-base font-bold text-white lg:hidden">{appName}</span>

        {/* Right actions — shrink-0 garante que busca/sino/tema/avatar nunca
            saem da área visível, mesmo com a nav espremida. */}
        {rightSlot && (
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {rightSlot}
          </div>
        )}
      </header>
    </div>
  );
}

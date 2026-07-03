import type { Modulo } from "@/modules/home/types/module";

export const MODULOS: Modulo[] = [
  {
    slug: "squadframe",
    nome: "SquadFrame",
    descricao: "Compras, obras, catálogo, tarefas e financeiro operacional.",
    ativo: true,
    cor: "primary",
    logo: "/icon.png",
  },
  {
    slug: "squadboard",
    nome: "SquadBoard",
    descricao: "Quadros visuais, listas, cards e fluxos de tarefas.",
    ativo: true,
    cor: "accent",
    logo: "/logo-board.png",
    logoSize: 49,
  },
  {
    slug: "squadflow",
    nome: "SquadFlow",
    descricao: "Gerenciador de fábrica, produção e chão de fábrica.",
    ativo: false,
    cor: "warning",
  },
  {
    slug: "squadstock",
    nome: "SquadStock",
    descricao: "Gerenciador de estoque, materiais, ferramentas e ativos.",
    ativo: false,
    cor: "success",
  },
];

export type Modulo = {
  slug: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  cor: string; // token de cor SquadUI usado no acento do card (ex: "primary", "accent")
  logo?: string; // caminho da logo em public/; se ausente, usa a inicial do nome como fallback
  logoSize?: number; // tamanho em px do logo no card (default 44)
};

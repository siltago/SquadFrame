export type WiseAuditoria = {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  entidade: string;
  entidade_id: string;
  acao: string;
  dados_antes: Record<string, unknown> | null;
  dados_depois: Record<string, unknown> | null;
  origem: string;
  criado_em: string;
};

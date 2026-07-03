-- Evolui lotes_obra de "agrupador de importação de XML" para "Pacote de Trabalho".
-- Tabela e nome interno NÃO mudam (compatibilidade total com actions/queries
-- existentes) — só adiciona atributos de negócio opcionais.
--
-- Decisão: colunas aditivas direto em lotes_obra (não uma tabela 1:1
-- separada). lotes_obra é pequena, sem hot-path de leitura pesada, e todos
-- os campos novos são 1:1 inerentes ao pacote — uma tabela de metadata
-- só adicionaria join sem ganho de normalização. Ver relatório da fase
-- para a comparação completa entre as opções avaliadas.

ALTER TABLE public.lotes_obra
  ADD COLUMN IF NOT EXISTS descricao      text,
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prioridade     text CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
  ADD COLUMN IF NOT EXISTS prazo          date;

COMMENT ON COLUMN public.lotes_obra.descricao      IS 'Descrição livre do pacote de trabalho (ex: escopo da Fachada Norte).';
COMMENT ON COLUMN public.lotes_obra.responsavel_id IS 'Usuário responsável pela execução deste pacote de trabalho.';
COMMENT ON COLUMN public.lotes_obra.prioridade     IS 'Prioridade do pacote — mesmo domínio de valores usado em tarefas.prioridade.';
COMMENT ON COLUMN public.lotes_obra.prazo          IS 'Prazo alvo de conclusão do pacote de trabalho.';

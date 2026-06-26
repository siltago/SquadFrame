-- Habilita Supabase Realtime para as tabelas que precisam de reatividade na UI

ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE tarefas;
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos_compra;
ALTER PUBLICATION supabase_realtime ADD TABLE solicitacoes_compra;
ALTER PUBLICATION supabase_realtime ADD TABLE lotes_obra;
ALTER PUBLICATION supabase_realtime ADD TABLE tipologias_obra;

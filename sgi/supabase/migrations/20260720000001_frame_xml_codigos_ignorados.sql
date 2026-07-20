-- Import de necessidades via XML: memória de "código explicitamente
-- excluído" por fornecedor (ex: madeira que não compramos). Aliases
-- (produto_aliases) exigem produto_id NOT NULL, então não servem pra
-- lembrar uma exclusão — daí essa tabela dedicada e enxuta.
CREATE TABLE IF NOT EXISTS frame_xml_codigos_ignorados (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid        NOT NULL REFERENCES fornecedores(id),
  codigo        text        NOT NULL,
  criado_por    uuid        REFERENCES usuarios(id),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fornecedor_id, codigo)
);

-- Fornecedor "virtual" que representa a origem dos códigos do XML
-- (ERP externo "Preference") — usado como fornecedor_id em
-- produto_aliases e frame_xml_codigos_ignorados.
INSERT INTO fornecedores (nome, tipos)
VALUES ('Preference', '{}')
ON CONFLICT (nome) DO NOTHING;

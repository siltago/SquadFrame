-- SquadMeasure: fotos de campo e cotas vetoriais editáveis.
CREATE TABLE measure_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id uuid NOT NULL REFERENCES measure_visitas(id) ON DELETE CASCADE,
  ambiente_id uuid REFERENCES measure_ambientes(id) ON DELETE SET NULL,
  elemento_id uuid REFERENCES measure_elementos(id) ON DELETE SET NULL,
  caminho_storage text NOT NULL,
  nome_arquivo text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type LIKE 'image/%'),
  largura integer NOT NULL CHECK (largura > 0),
  altura integer NOT NULL CHECK (altura > 0),
  tamanho_bytes bigint CHECK (tamanho_bytes IS NULL OR tamanho_bytes >= 0),
  legenda text,
  capturada_em timestamptz NOT NULL DEFAULT now(),
  versao integer NOT NULL DEFAULT 1 CHECK (versao > 0),
  criado_por uuid NOT NULL REFERENCES usuarios(id),
  atualizado_por uuid REFERENCES usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  excluido_em timestamptz,
  CHECK (num_nonnulls(ambiente_id, elemento_id) <= 1)
);

CREATE TABLE measure_foto_cotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foto_id uuid NOT NULL REFERENCES measure_fotos(id) ON DELETE CASCADE,
  medida_id uuid REFERENCES measure_medidas(id) ON DELETE SET NULL,
  nome text NOT NULL CHECK (btrim(nome) <> ''),
  valor numeric NOT NULL,
  unidade text NOT NULL CHECK (unidade IN ('mm','cm','m','graus','unidade')),
  x1 numeric NOT NULL CHECK (x1 BETWEEN 0 AND 1),
  y1 numeric NOT NULL CHECK (y1 BETWEEN 0 AND 1),
  x2 numeric NOT NULL CHECK (x2 BETWEEN 0 AND 1),
  y2 numeric NOT NULL CHECK (y2 BETWEEN 0 AND 1),
  cor text NOT NULL DEFAULT '#00A6C0' CHECK (cor ~ '^#[0-9A-Fa-f]{6}$'),
  versao integer NOT NULL DEFAULT 1 CHECK (versao > 0),
  criado_por uuid NOT NULL REFERENCES usuarios(id),
  atualizado_por uuid REFERENCES usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  excluido_em timestamptz,
  CHECK (x1 <> x2 OR y1 <> y2)
);

CREATE INDEX idx_measure_fotos_visita ON measure_fotos(visita_id, capturada_em DESC) WHERE excluido_em IS NULL;
CREATE INDEX idx_measure_fotos_elemento ON measure_fotos(elemento_id) WHERE elemento_id IS NOT NULL AND excluido_em IS NULL;
CREATE INDEX idx_measure_foto_cotas_foto ON measure_foto_cotas(foto_id) WHERE excluido_em IS NULL;

ALTER TABLE measure_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE measure_foto_cotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY measure_fotos_select ON measure_fotos FOR SELECT TO authenticated USING (measure_fn_pode_ver_visita(visita_id));
CREATE POLICY measure_fotos_write ON measure_fotos FOR ALL TO authenticated
  USING (measure_fn_pode_editar_visita(visita_id, 'squadmeasure.executar_medicao'))
  WITH CHECK (measure_fn_pode_editar_visita(visita_id, 'squadmeasure.executar_medicao'));
CREATE POLICY measure_cotas_select ON measure_foto_cotas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM measure_fotos f WHERE f.id = foto_id AND measure_fn_pode_ver_visita(f.visita_id)));
CREATE POLICY measure_cotas_write ON measure_foto_cotas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM measure_fotos f WHERE f.id = foto_id AND measure_fn_pode_editar_visita(f.visita_id, 'squadmeasure.registrar_medidas')))
  WITH CHECK (EXISTS (SELECT 1 FROM measure_fotos f WHERE f.id = foto_id AND measure_fn_pode_editar_visita(f.visita_id, 'squadmeasure.registrar_medidas')));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('squadmeasure', 'squadmeasure', false, 20971520, ARRAY['image/jpeg','image/png','image/heic','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;

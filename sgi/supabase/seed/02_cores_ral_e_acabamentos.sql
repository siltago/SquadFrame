-- Seed: Cores RAL e acabamentos padrão

INSERT INTO cores_ral (codigo_ral, nome, hex) VALUES
  ('RAL9010', 'Branco puro',      '#F4F4F4'),
  ('RAL9016', 'Branco tráfego',   '#F6F6F6'),
  ('RAL9005', 'Preto intenso',    '#0A0A0A'),
  ('RAL7016', 'Cinza antracite',  '#293133'),
  ('RAL7021', 'Cinza preto',      '#23282B'),
  ('RAL7035', 'Cinza claro',      '#CBD0CC'),
  ('RAL6005', 'Verde musgo',      '#0F4336'),
  ('RAL5010', 'Azul genciana',    '#0E4C96'),
  ('RAL3009', 'Vermelho óxido',   '#6C3B2A'),
  ('RAL1015', 'Marfim claro',     '#E6D2B5'),
  ('RAL8017', 'Marrom chocolate', '#44221A'),
  ('RAL6003', 'Verde oliva',      '#424632'),
  ('RAL1013', 'Branco ostra',     '#EAE6CA'),
  ('RAL9006', 'Alumínio branco',  '#A5A5A5'),
  ('RAL9007', 'Alumínio cinza',   '#8F8F8F')
ON CONFLICT (codigo_ral) DO NOTHING;

INSERT INTO acabamentos (nome) VALUES
  ('Anodizado natural'), ('Anodizado bronze'),
  ('Pintado eletrostático'), ('Termolacado'), ('Inox')
ON CONFLICT DO NOTHING;

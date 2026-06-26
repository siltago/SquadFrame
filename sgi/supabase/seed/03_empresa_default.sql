-- Seed: Registro padrão da empresa
INSERT INTO empresa (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

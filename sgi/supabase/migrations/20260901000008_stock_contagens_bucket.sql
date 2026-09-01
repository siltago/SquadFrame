-- Bucket pra comprovante de contagem (foto/scan do papel conferido no modo
-- PAPEL). Privado, mesmo padrão de squadmeasure — acesso via URL assinada
-- gerada pela action, não link público direto.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('stock-contagens', 'stock-contagens', false, 20971520, ARRAY['image/jpeg','image/png','image/heic','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;

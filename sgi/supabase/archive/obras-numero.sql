-- Sequência de numeração para obras (0001, 0002, ...)
CREATE SEQUENCE IF NOT EXISTS obras_numero_seq START 1;
ALTER TABLE obras ADD COLUMN IF NOT EXISTS numero int DEFAULT nextval('obras_numero_seq');
-- Atribui numero às obras existentes que ainda não têm
UPDATE obras SET numero = nextval('obras_numero_seq') WHERE numero IS NULL;

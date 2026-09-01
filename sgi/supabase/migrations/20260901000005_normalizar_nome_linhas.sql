-- Normaliza linhas.nome pra Title Case (primeira letra de cada palavra
-- maiúscula, resto minúsculo) — hoje misturado (ALGUMAS EM CAIXA ALTA,
-- Outras Já Certas, outras minúsculas). Siglas conhecidas (SMS, ISA, IZA,
-- ACM) voltam pra maiúscula depois do initcap, que senão as abaixaria
-- pra "Sms"/"Isa"/"Iza"/"Acm".
update public.linhas
set nome = initcap(nome)
where nome <> initcap(nome);

update public.linhas
set nome = regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(nome, '\ySms\y', 'SMS', 'g'),
        '\yIsa\y', 'ISA', 'g'),
      '\yIza\y', 'IZA', 'g'),
    '\yAcm\y', 'ACM', 'g')
where nome ~ '\y(Sms|Isa|Iza|Acm)\y';

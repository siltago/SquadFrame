# Resumo executivo — auditoria técnica e comercial

**Data-base:** 2 de agosto de 2026  
**Escopo:** estado local do repositório e todo o histórico Git disponível (`--all`)  
**Classificação das afirmações:** fato = evidência direta; inferência = leitura técnica; estimativa = faixa preliminar.

## Síntese

O SquadSystem é uma plataforma web modular especializada na operação de empresas de esquadrias. O código comprova cobertura funcional relevante em obras, compras, fornecedores, solicitações, pedidos, recebimentos, estoque, catálogo, tarefas, Kanban, documentos e financeiro. Há também uma base de governança (`SquadWise`) e arquiteturas iniciadas ou planejadas para produção, medição e hardware.

O ativo tem **64.361 linhas úteis estimadas**, 82 páginas, 205 componentes, 73 migrations oficiais e 189 commits no histórico disponível. O domínio mais desenvolvido é o `SquadFrame` (150 arquivos TS/TSX), seguido por `SquadBoard` (79), `Wise` (47) e `SquadStock` (35). O hub declara Frame, Board e Stock como ativos; Wise e Flow aparecem inativos em `sgi/modules/home/data/modules.ts`.

## Leitura para proposta comercial

| Dimensão | Avaliação | Confiança |
|---|---|---|
| Especialização setorial | Alta: tipologias, lotes, obras, beneficiamento, perfis, cores, pacotes e compras de esquadrias | Alta |
| Cobertura operacional | Ampla em compras/obras; parcial em produção e governança | Alta |
| Maturidade geral | MVP funcional avançado, ainda não comprovado como pronto para produção | Média-alta |
| Complexidade | Alta, com banco e regras de negócio muito altos | Alta |
| Potencial comercial | Alto para implantação assistida; SaaS exige robustecimento | Média |
| Risco dominante | Ausência de testes automatizados e de schema totalmente reproduzível | Alta |

## Investimento técnico estimado

A reconstrução de sessões gerou **60,4 h / 95,4 h / 130,2 h de horas rastreáveis pelo histórico Git**. Git não captura descoberta, prompts, testes manuais, reuniões ou trabalho sem commit. Incorporando essas lacunas, esta auditoria adota **90 h / 180 h / 320 h de horas estimadas de dedicação total** (mínimo/provável/ampliado). São aproximações conservadoras, especialmente porque a produção de 64 mil linhas úteis sugere uso intensivo de automação e assistência por IA.

Na taxa de R$ 100/h, o custo de construção estimado fica entre **R$ 9 mil e R$ 32 mil**, com ponto provável de **R$ 18 mil**. Isso não equivale ao valor comercial: conhecimento de negócio, integração de módulos e redução de retrabalho podem justificar valor superior.

## Condição recomendada para oferta

Recomenda-se apresentar o produto como **solução vertical em evolução, disponível para piloto controlado e implantação assistida**, não como SaaS maduro. Antes de uma homologação formal: testes automatizados dos fluxos críticos, reconciliação do schema, revisão de autorização/service role, backup/restore testado, observabilidade e plano LGPD.

## Evidências principais

- Produto e módulos: `README.md`, `sgi/modules/home/data/modules.ts`.
- Rotas e telas: `sgi/app/**/page.tsx` e `route.ts`.
- Domínios: `sgi/modules/squadframe`, `squadboard`, `squadstock`, `wise`.
- Banco: `sgi/supabase/migrations/*.sql`.
- Segurança: `sgi/middleware.ts`, `sgi/shared/auth/auth.ts`, migrations RLS/RPC.
- Integrações: `sgi/shared/providers`, `sgi/modules/squadboard/providers/trello`.
- Limitações reconhecidas: `sgi/docs/producao/auditoria-pacotes-compras-producao.md`.


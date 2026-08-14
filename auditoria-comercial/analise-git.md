# Análise do histórico Git

## Escopo

Análise de `git log --all`, portanto inclui todas as referências locais/remotas disponíveis. Commits são eventos de versionamento e **não equivalem a horas**. Script: `scripts/analisar-git.ps1`.

## Indicadores

| Métrica | Resultado |
|---|---:|
| Primeiro commit | 16/06/2026 18:42 (-03) |
| Último commit analisado | 02/08/2026 16:10 (-03) |
| Período calendário | 47 dias |
| Commits | 189 |
| Dias ativos | 34 |
| Semanas ativas | 7 |
| Meses com atividade | 3 |
| Média por dia ativo | 5,56 |
| Média por semana ativa | 27,0 |
| Maior sequência de dias ativos | 6 |
| Maior intervalo sem atividade | 3 dias |
| Commits noturnos (22h–5h59) | 21 |
| Finais de semana | 13 |
| Com coautoria declarada | 16 |

Autores: Thiago Silva (151), Thiago (37), Vercel (1). Os dois primeiros nomes provavelmente representam a mesma pessoa, mas isso é inferência e não foi consolidado automaticamente.

## Evolução temporal

| Mês | Commits |
|---|---:|
| Junho/2026 | 72 |
| Julho/2026 | 115 |
| Agosto/2026 (até dia 2) | 2 |

Pico semanal: semana 27, com 57 commits. Outros picos: semana 26 (35) e semana 29 (31). A atividade se concentra entre 12h–17h (83) e 6h–11h (67). Sexta-feira concentra 51 commits; quarta, 36.

## Temas por palavras-chave

As categorias se sobrepõem e não somam 189: correções 94; compras 76; integrações 45; UI 35; Kanban 21; permissões 19; produção 16; banco 9; documentação 8; arquitetura 7; backend/segurança/estoque 6 cada; autenticação 5; deploy 3.

### Fases aparentes

1. **Fundação (16–25/06):** aplicação, banco, obras, autenticação e estrutura inicial.
2. **Expansão operacional (26/06–09/07):** compras, fornecedores, Kanban, realtime e catálogo.
3. **Automação e governança (13–24/07):** notificações, WhatsApp, relatórios, permissões e Wise.
4. **Estoque/financeiro/beneficiamento (28–31/07):** Stock, contratos, carteiras, recebimentos.
5. **Consolidação (01–02/08):** pendências e documentação pública.

## Limitações

- Trabalho anterior ao primeiro commit ou feito fora do repositório não aparece.
- Squash, amend e commits grandes distorcem sessões.
- Datas representam commit, não início/fim do trabalho.
- `--all` pode incluir commit acessível apenas por branch remota.
- A taxonomia por assunto é heurística; inspeção manual sustenta as fases, mas não mede esforço.


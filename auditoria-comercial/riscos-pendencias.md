# Riscos e pendências

## Matriz priorizada

| Risco | Categoria | Severidade / probabilidade | Evidência | Impacto | Mitigação | Prioridade |
|---|---|---|---|---|---|---|
| Zero testes automatizados | Qualidade | Crítica / alta | inventário: 0 testes; fluxos financeiros e estoque complexos | regressões e cálculo incorreto | testes unitários, integração SQL e E2E críticos | P0 |
| Schema do Board não reproduzível | Banco/continuidade | Crítica / alta | `docs/producao/auditoria-pacotes-compras-producao.md`; SQL fora de migrations | deploy/restore inconsistente | consolidar migration baseline e reconciliar produção | P0 |
| Uso amplo de service role | Segurança | Crítica / média | `shared/database/supabase-admin.ts` e múltiplos repositories/actions | falha de action pode ignorar RLS | least privilege, RPCs, revisão por permissão e testes negativos | P0 |
| Ausência de CI | Continuidade | Alta / alta | nenhuma `.github/workflows`; deploy por push | código quebrado chega ao deploy | pipeline build/lint/test/migration check | P0 |
| Backup/restore não comprovado | Continuidade | Crítica / média | nenhuma rotina ou evidência de teste | perda de dados/indisponibilidade | política Supabase, export e teste periódico de restore | P0 |
| Sem monitoramento dedicado | Operação | Alta / alta | sem Sentry/APM/logger central | falhas silenciosas em cron/Actions | observabilidade, alertas, correlação e métricas | P1 |
| Legado + Wise coexistentes | Arquitetura | Alta / alta | docs Wise e dois modelos de permissão | fontes divergentes, acesso incorreto | plano de migração/paridade e data de corte | P1 |
| Arquivos/componentes gigantes | Manutenibilidade | Alta / alta | 6 arquivos entre 794–1.463 linhas | revisão difícil e alto raio de regressão | decomposição orientada a domínio após testes | P1 |
| Realtime/RLS | Segurança | Alta / média | docs registram exposição histórica; migrations corretivas recentes | vazamento entre usuários | auditoria atual das publications/policies | P1 |
| Operações financeiras sem reconciliação automatizada | Negócio | Alta / média | carteiras/contratos recentes e sem testes | saldo incorreto | invariantes SQL, ledger/reconciliação e testes | P1 |
| LGPD não formalizada | Jurídico | Alta / média | usuários, e-mail, WhatsApp, fotos, auditoria; sem política no repo | sanções e confiança | inventário de dados, bases legais, retenção, DSR e DPA | P1 |
| PWA offline limitado | Produto | Média / média | `sw.js` cacheia/fallback; não há fila de mutação | expectativa comercial incorreta | comunicar limite ou implementar sync offline | P2 |
| Dependência de Supabase/Vercel/Twilio/Trello | Fornecedor | Média / alta | integrações comprovadas | custo, lock-in, indisponibilidade | adapters, limites, fallback e contratos | P2 |
| Multi-tenant removido | Comercial | Alta / alta para SaaS | `docs/squadwise/fase-1-arquitetura.md` | SaaS multiempresa não é imediato | redesenho de tenancy antes de vender SaaS |
| Licenciamento indefinido | Jurídico/comercial | Média / alta | README afirma ausência de condições públicas | negociação e propriedade intelectual | definir titularidade/licença/termos | P1 |

## Pontos únicos de falha

- Supabase concentra autenticação, banco, realtime e storage.
- Vercel concentra aplicação e crons.
- `service_role` concentra poder administrativo da aplicação.
- Conhecimento setorial parece concentrado no autor principal (188/189 commits humanos sob dois nomes).

## Dívida técnica observável

- 300 Server Actions estimadas e autorização distribuída.
- SQL do Board fora do caminho oficial do Supabase CLI.
- Documentos `sgi/README.md` e `DEPLOY.md` contêm partes antigas.
- Validação predominantemente manual; apenas dois arquivos identificados como schemas.
- Duplicação conceitual Frame/Wise e dois tipos de quadro no Board.
- `any` aparece em caminhos de auth e realtime, reduzindo garantias de tipos.

## Pendências de produto

1. Homologar ponta a ponta: solicitação → pedido → recebimento → estoque → financeiro.
2. Definir modelo canônico de obras, usuários e permissões.
3. Finalizar produção/ordens apenas depois de pacotes e estoque estáveis.
4. Definir política de anexos, retenção e limites.
5. Formalizar implantação, suporte, SLA, LGPD e recuperação de desastre.
6. Coletar baseline real de desempenho e volume.


# Inventário técnico

## Método e limitações

Coleta reproduzível em `scripts/coletar-metricas.ps1`. Foram excluídos `.git`, `node_modules`, `.next`, `dist`, `build`, `coverage`, `bin`, `obj`, binários, lockfiles e esta auditoria. A contagem de comentários é heurística por linha. Contagens SQL representam ocorrências `CREATE` no histórico de migrations, não necessariamente objetos únicos no schema final; migrations podem recriar/substituir objetos.

## Dimensão do repositório

| Métrica | Valor |
|---|---:|
| Arquivos analisáveis | 715 |
| Pastas | 263 |
| Linhas de produto | 77.255 |
| Linhas úteis estimadas | 64.361 |
| Comentários | 4.103 |
| Linhas em branco | 8.791 |
| Documentos Markdown | 11 |

### Por linguagem

| Linguagem | Arquivos | Linhas | Úteis | Comentários | Brancas |
|---|---:|---:|---:|---:|---:|
| TypeScript/TSX | 306 | 46.036 | 41.376 | 916 | 3.744 |
| TypeScript | 215 | 18.739 | 15.016 | 1.182 | 2.541 |
| SQL | 109 | 11.346 | 7.370 | 1.603 | 2.373 |
| CSS | 1 | 531 | 96 | 367 | 68 |
| JavaScript | 5 | 347 | 264 | 33 | 50 |
| JSON | 6 | 182 | 182 | 0 | 0 |
| PowerShell | 1 | 74 | 57 | 2 | 15 |

### Extensões mais frequentes

`.tsx` 306; `.ts` 215; `.sql` 109; `.png` 46; `.md` 11; JSON 6; JavaScript/MJS 5. Os demais tipos têm ocorrência pequena.

## Estrutura da aplicação

| Item | Valor | Método/limitação |
|---|---:|---|
| Componentes | 205 | `.tsx` sob diretórios `components`; não inclui componentes definidos fora deles |
| Páginas | 82 | arquivos `page.tsx` |
| APIs | 7 | arquivos `route.ts` |
| Layouts | 10 | arquivos `layout.tsx` |
| Hooks | 5 | diretório `hooks` e nomes `use-*`; hooks locais não contados |
| Serviços | 32 | diretório `services` ou sufixo `service.ts` |
| Utilitários | 28 | diretórios `utils` e `lib` |
| Server Actions exportadas | 300 | exports em arquivos com diretiva `use server`; aproximação sintática |
| Tipos/interfaces/enums TS | 555 | declarações textuais; pode contar tipos internos |
| Schemas de validação | 2 | arquivos/diretórios com `schema`; validação manual não contada |
| Testes automatizados | 0 | nenhum `*.test`, `*.spec`, `tests` ou `__tests__` fora de dependências |

## Banco de dados

| Item | Ocorrências encontradas | Observação |
|---|---:|---|
| Migrations oficiais | 73 | `sgi/supabase/migrations` |
| `CREATE TABLE` | 180 | inclui histórico/recriações; não é total único final |
| Views | 4 | `CREATE [OR REPLACE] VIEW` |
| Funções SQL | 89 | RPCs e helpers PostgreSQL |
| Triggers | 16 | ocorrências de criação |
| Índices | 182 | simples e únicos |
| Policies RLS | 132 | ocorrências no histórico |
| Enums SQL | 0 | estados parecem modelados sobretudo como texto/checks |

Há SQL adicional em `sgi/modules/squadboard/sql/`, fora das migrations oficiais. A própria auditoria existente registra tabelas consumidas pelo Board sem migration reproduzível (`sgi/docs/producao/auditoria-pacotes-compras-producao.md`).

## Stack comprovada

- Next.js 14.2, React 18.3, TypeScript 5, Tailwind CSS 3.
- Supabase JS/SSR: PostgreSQL, Auth, Storage e Realtime.
- Vercel: deploy, região `gru1`, funções e três crons (`sgi/vercel.json`).
- DnD Kit, TipTap, Recharts, Web Push, Sharp, DXF, PDF Parse e html2pdf.
- Twilio WhatsApp por REST (`sgi/shared/providers/whatsapp/twilio.ts`).
- Trello via provider próprio (`sgi/modules/squadboard/providers/trello`).

## Infraestrutura e qualidade

| Capacidade | Evidência | Estado observado |
|---|---|---|
| Auth | middleware + Supabase Auth | Implementado |
| RBAC | cargos/permissões + RPCs | Implementado, coexistindo legado e Wise |
| Realtime | canais `postgres_changes` | Implementado em Kanban/refresh |
| Cache | cache de Board + revalidatePath/tag | Parcial |
| Upload/Storage | ações de catálogo/documentos/perfil | Implementado |
| PWA/offline | manifest, `sw.js`, banners | Implementado; offline é cache, não operação completa |
| Jobs | três rotas cron Vercel | Implementado |
| Logs | `console` em scripts; sem logger central | Incipiente |
| Monitoramento | nenhuma integração dedicada detectada | Ausente |
| Backup | nenhuma automação/restore testado no repo | Não comprovado |
| CI/CD | deploy Vercel documentado; sem `.github/workflows` | Parcial |
| Testes | nenhum teste automatizado detectado | Ausente |

## Arquivos de maior complexidade aparente

`lote-detalhe.tsx` (1.463 linhas), `ui/icons/index.tsx` (1.144), `actions/tarefas/actions.ts` (1.083), `catalogo/actions.ts` (1.043), `novo-pedido-cliente.tsx` (838) e `expanded-card.tsx` (794). Tamanho não prova defeito, mas aumenta custo de revisão e risco de regressão.


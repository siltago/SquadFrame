# Estimativas de custos

Todos os valores são **estimativas técnicas preliminares**, sem impostos, licenças, equipamentos ou margem comercial. Custo de desenvolvimento não é valor comercial.

## Investimento já realizado

| Base de horas | R$ 60/h | R$ 80/h | R$ 100/h | R$ 120/h | R$ 150/h |
|---|---:|---:|---:|---:|---:|
| Git conservador — 60,4 h | 3.624 | 4.832 | 6.040 | 7.248 | 9.060 |
| Git provável — 95,4 h | 5.724 | 7.632 | 9.540 | 11.448 | 14.310 |
| Git ampliado — 130,2 h | 7.812 | 10.416 | 13.020 | 15.624 | 19.530 |
| Dedicação total mínima — 90 h | 5.400 | 7.200 | 9.000 | 10.800 | 13.500 |
| Dedicação total provável — 180 h | 10.800 | 14.400 | 18.000 | 21.600 | 27.000 |
| Dedicação total ampliada — 320 h | 19.200 | 25.600 | 32.000 | 38.400 | 48.000 |

Distribuição indicativa do cenário provável: desenvolvimento 35%, regras de negócio 20%, banco 14%, UI/UX 10%, arquitetura 7%, integrações 5%, segurança 4%, infraestrutura 2%, documentação 2%, testes 1%. O percentual de testes reflete ausência de suíte, não importância desejada.

## Custos operacionais identificados

| Serviço | Uso/evidência | Cobrança/variável | Avaliação |
|---|---|---|---|
| Supabase | DB, Auth, Storage, Realtime | plano, compute, storage, egress, usuários | pode iniciar em gratuito; preço deve ser validado comercialmente |
| Vercel | Next.js, funções e cron | plano, execução, banda, equipe | gratuito pode servir dev/piloto; validar produção |
| Twilio/WhatsApp | cobranças e relatório diário | por mensagem/conversa/template/país | custo cresce com volume; validar no momento da proposta |
| Trello | Board provider | plano do Trello/API/usuários | pode exigir licenças corporativas |
| Web Push | biblioteca e VAPID | infraestrutura própria/Vercel | sem tarifa do protocolo; execução/banda permanecem |
| Domínio/e-mail | URLs e comunicação | anual/mensal | não há fornecedor/valor no repo |
| GitHub | repositório e futuro CI | plano/minutos/armazenamento | preço precisa ser validado |
| Backup/monitoramento | não implementados | storage, retenção, eventos | custo futuro obrigatório para produção |

### Projeções qualitativas

| Cenário | Usuários | Perfil de custo |
|---|---:|---|
| Desenvolvimento | 1–10 | tiers gratuitos podem bastar; sem SLA |
| Piloto | 10 | baixo, mas WhatsApp/storage já variam com uso |
| Empresa pequena | 25 | planos pagos provavelmente recomendáveis |
| Empresa média | 50–100 | compute, banco, storage, backup e observabilidade dedicados |
| Escala SaaS | 500 | exige tenancy, capacity planning, suporte e contratos empresariais |

Não há volume no repo para converter esses perfis em preço exato. **Preço precisa ser validado comercialmente no momento da proposta.**

## Custo para conclusão

| Marco | Horas restantes | R$ 80/h | R$ 100/h | R$ 120/h | Entregas dominantes |
|---|---:|---:|---:|---:|---|
| MVP interno estável | 160–280 | 12,8–22,4 mil | 16–28 mil | 19,2–33,6 mil | testes críticos, schema, bugs P0 |
| Homologável | 400–700 | 32–56 mil | 40–70 mil | 48–84 mil | E2E, observabilidade, backup, UX |
| Pronto para produção | 800–1.400 | 64–112 mil | 80–140 mil | 96–168 mil | segurança, DR, performance, SLA |
| SaaS comercial | 1.600–2.800 | 128–224 mil | 160–280 mil | 192–336 mil | multi-tenancy, billing, onboarding, suporte |
| Todos módulos planejados | 3.500–6.000 | 280–480 mil | 350–600 mil | 420–720 mil | Flow, Measure, Hub, integrações e maturidade |

### Prazo equivalente, sem compromisso

Assumindo 120 h produtivas/mês por desenvolvedor e perdas de coordenação: MVP 1,3–2,3 meses com 1 dev; homologável 3,3–5,8; produção 6,7–11,7; SaaS 13–23. Duas pessoas não reduzem linearmente (aprox. 55–65% desses prazos); pequena equipe experiente pode chegar a 40–50%, condicionada a escopo e arquitetura.

## Observação de valor

O valor do ativo pode superar o custo de construção porque incorpora processos de esquadrias, integra vários departamentos e cria barreira de conhecimento. A precificação deve considerar resultado, risco assumido, implantação e suporte — não apenas horas.


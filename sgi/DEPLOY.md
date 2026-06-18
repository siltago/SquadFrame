# Deploy — SGI em Produção

Stack: **Next.js 14 + Supabase** hospedados no plano gratuito.  
URL final: `https://sgi-[seu-projeto].vercel.app`

---

## Pré-requisitos

- Conta em [vercel.com](https://vercel.com) (gratuita)
- Conta em [supabase.com](https://supabase.com) (gratuita)
- Repositório no GitHub com o projeto

---

## 1 — Supabase (banco + auth)

### 1.1 Criar projeto

1. Acesse [app.supabase.com](https://app.supabase.com) → **New project**
2. Anote a **senha do banco** em local seguro
3. Aguarde o projeto inicializar (~2 min)

### 1.2 Pegar as chaves

Vá em **Settings → API** e copie:

| Variável | Onde está |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "anon public" |
| `SUPABASE_SERVICE_ROLE_KEY` | "service_role secret" |

### 1.3 Rodar as migrations

No **SQL Editor** do Supabase, execute os arquivos em ordem:

```
supabase/
  1. (schema principal — se tiver um arquivo de criação inicial)
  2. obras-numero.sql
  3. tipos-linha-unidade.sql
  4. fornecedor-tipos.sql
  5. fornecedores-contato.sql
  6. perfil-specs.sql
  7. pedido-itens-dimensoes.sql
  8. vw-pedido-itens-chapa.sql
  9. cores-ral-tipos.sql         ← adiciona tipos[] e cor_id
  10. pedido-itens-cor.sql       ← adiciona cor_id em pedido_itens
  11. pedido-tipo-codigos-fornecedor.sql
  12. solicitacao-em-pedido.sql
  13. solicitacao-itens-externos.sql
  14. assinaturas.sql
  15. rls-policies.sql           ← ÚLTIMO — ativa RLS
```

### 1.4 Configurar Auth

Em **Authentication → Settings**:
- **Site URL**: `https://sgi-[seu-projeto].vercel.app`
- **Redirect URLs**: `https://sgi-[seu-projeto].vercel.app/**`

Em **Authentication → Email Templates**: personalize os e-mails de convite/reset se necessário.

---

## 2 — Vercel (frontend)

### 2.1 Importar o repositório

1. Acesse [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → selecione o repositório
3. Em **Root Directory**: coloque `sgi` (o projeto Next.js está nessa pasta)
4. Framework: Vercel detecta automaticamente como **Next.js**

### 2.2 Variáveis de ambiente

Em **Settings → Environment Variables**, adicione as três variáveis:

```
NEXT_PUBLIC_SUPABASE_URL       = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJ...
SUPABASE_SERVICE_ROLE_KEY      = eyJ...
```

Marque todas para os ambientes **Production**, **Preview** e **Development**.

### 2.3 Deploy

Clique em **Deploy**. O build leva ~2 min.  
Após o primeiro deploy, todo `git push` na branch `main` dispara um novo deploy automaticamente.

---

## 3 — Primeiro acesso

1. Acesse a URL gerada pela Vercel
2. Cadastre o primeiro usuário em **Authentication → Users** no Supabase Dashboard
3. No SQL Editor, promova-o a admin:

```sql
-- Substitua pelo email do usuário
UPDATE usuarios 
SET cargo_id = (SELECT id FROM cargos WHERE is_admin = true LIMIT 1)
WHERE email = 'seu@email.com';
```

---

## Checklist de deploy

### Antes do primeiro deploy

- [ ] Projeto criado no Supabase
- [ ] Todas as migrations rodadas no SQL Editor
- [ ] `rls-policies.sql` executado por último
- [ ] Site URL configurada no Supabase Auth
- [ ] Repositório no GitHub com a branch `main` atualizada
- [ ] `.env.local` **NÃO está** no repositório (verificar `git status`)
- [ ] Projeto importado na Vercel com Root Directory = `sgi`
- [ ] 3 variáveis de ambiente configuradas na Vercel
- [ ] Build passou sem erros

### Antes de cada novo deploy (checklist rápido)

- [ ] Novas migrations rodadas no Supabase se houver mudanças de schema
- [ ] Novas variáveis de ambiente adicionadas na Vercel se houver
- [ ] `npm run build` passou localmente (ou CI não reportou erro)

---

## Erros comuns

### Build falha: "Module not found"

Verifique se todos os imports usam o alias `@/` (configurado no `tsconfig.json`).  
Exemplo correto: `import { createAdminClient } from "@/lib/supabase-admin"`.

### Página em branco em produção

Geralmente variável de ambiente não configurada. Verifique:
```
NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Essas precisam estar disponíveis no **build time**, não só em runtime.

### "Invalid API key" / 401 do Supabase

`SUPABASE_SERVICE_ROLE_KEY` incorreta ou não configurada na Vercel.

### Redirect loop no login

Verifique se o **Site URL** no Supabase Auth aponta para a URL de produção (não localhost).

### Imagens não carregam

Se o projeto usar Supabase Storage, o domínio `*.supabase.co` já está autorizado no `next.config.js`.

### Timeout em server actions

O `vercel.json` já define `maxDuration: 30s`. O plano Hobby da Vercel suporta até 60s.

---

## Variáveis de ambiente locais (desenvolvimento)

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

O `.env.local` nunca é commitado (está no `.gitignore`).

---

## Atualizar produção

```bash
git add .
git commit -m "descrição da mudança"
git push origin main
# A Vercel faz o deploy automaticamente
```

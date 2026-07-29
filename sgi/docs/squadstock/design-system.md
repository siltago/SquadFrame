# SquadStock — guia de consulta rápida (código)

> Referência técnica para escrever/revisar código do SquadStock neste repo. O
> guia de marca completo (com exemplos visuais de todos os componentes,
> estados, ilustração, motion) é o artifact "SquadStock — Design System"
> publicado nesta conversa — este doc só traduz aquele artifact para os
> tokens, classes e arquivos reais do projeto, e registra onde a
> implementação diverge dele de propósito.

## Como o tema é aplicado

Segue exatamente o padrão de `.frame` / `.squadboard` / `.squadwise` já
existente em [`app/globals.css`](../../app/globals.css): uma classe
`.squadstock` escopada numa `<div>` wrapper (não em `<html>`), que
redefine as CSS custom properties consumidas por Tailwind via
`rgb(var(--color-x) / <alpha-value>)`. O wrapper vive em
[`app/squadstock/layout.tsx`](../../app/squadstock/layout.tsx):

```tsx
<div className="squadstock min-h-screen bg-bg text-text">
  <AppHeader ... />
  <main>{children}</main>
</div>
```

Bloco de tokens: `app/globals.css`, seção `SQUADSTOCK THEME` (logo antes de
`.squadwise`→`BASE`). Tem par claro (`.squadstock`) e escuro
(`.dark .squadstock`, seletor descendente — igual squadboard/squadwise,
**não** composto, porque o wrapper fica numa div aninhada, não na `<html>`).

## Tokens → classes Tailwind (usar estas, não hex cru)

| Papel (artifact)                    | Token CSS              | Classe Tailwind                      |
|--------------------------------------|-------------------------|----------------------------------------|
| Primária `#F39C12`                   | `--color-primary`       | `bg-primary` / `text-primary` / `border-primary` |
| Hover `#BB731A`                      | `--color-primary-hover` | `bg-primary-hover` / `text-primary-hover` |
| Escuro `#5A3A00`                     | `--color-primary-active`| `bg-primary-active` / `text-primary-active` |
| Claro `#FFE9D3`                      | `--color-primary-soft`  | `bg-primary-soft` |
| Background `#FFF5ED`                 | `--color-bg`             | `bg-bg` |
| Disponível (verde `#2E7D46`)         | `--color-success`        | `bg-success` / `text-success`, soft: `bg-success-soft` |
| Baixo estoque (laranja-queimado `#C2410C`) | `--color-warning`  | `bg-warning` / `text-warning`, soft: `bg-warning-soft` |
| Sem estoque (vermelho `#B91C1C`)     | `--color-danger`         | `bg-danger` / `text-danger`, soft: `bg-danger-soft` |
| Reservado (azul `#3452C4`)           | `--color-info`           | `bg-info` / `text-info`, soft: `bg-info-soft` |
| Texto principal                      | `--color-text`           | `text-text` |
| Texto secundário / terciário         | `--color-text-2/3`       | `text-text-2` / `text-text-3` |
| Borda / divisor                      | `--color-border`/`--color-divider` | `border-border` / `border-divider` |

**Não usar hex/rgb inline** (`style={{ color: "#F39C12" }}`) — sempre a
classe Tailwind acima, para herdar automaticamente o par claro/escuro e
continuar funcionando se a paleta for recalibrada.

O gradiente oficial (`135deg, #BB731A 0%, #F39C12 55%, #FFD77A 100%`) **não**
tem token — é reservado para momentos de marca (capa, hero, splash), não
para UI recorrente. Se precisar, usar inline
`bg-[linear-gradient(135deg,theme(colors.primary.hover)_0%,theme(colors.primary.DEFAULT)_55%,#FFD77A_100%)]`
ou uma classe utilitária pontual — não adicionar como token global.

## Divergências conhecidas do artifact (e por quê)

1. **Raio 4px só vale para `.field`/`.card`, não para `Button`.**
   `tailwind.config.ts` define `borderRadius.md` como `10px` *estático*
   (não lê `var(--radius-md)`), então `rounded-md` do Tailwind (usado pelo
   `Button` compartilhado) não responde ao override de `--radius-md`/`--radius-lg`
   feito em `.squadstock`. Só `.field` e `.card` (que usam
   `border-radius: var(--radius-md/lg)` diretamente no CSS, não a classe
   Tailwind) ficam com o raio flat de 4px. Botões do SquadStock usam o
   mesmo `rounded-md` (10px) do resto do sistema — decisão deliberada de
   manter o componente compartilhado intacto (ver princípio "compartilha
   componentes, muda só personalidade") em vez de forkar o `Button` por
   módulo. Se algum dia isso importar de verdade, a correção real é trocar
   `borderRadius.md/lg` no `tailwind.config.ts` para ler a CSS var — mas
   isso afetaria todos os módulos, não só o SquadStock.
2. **Cairo já é a fonte real do projeto inteiro** (via `@import` no topo de
   `app/globals.css`, aplicada em `body` + `tailwind.config.ts`
   `fontFamily.sans/display`) — não é preciso (nem deve-se) adicionar
   nenhum `@font-face`/`next/font` específico do SquadStock. O disclaimer de
   "fonte de sistema substituta" que aparece no artifact HTML só existe
   porque o ambiente do artifact bloqueia CDN de fonte — no código real do
   SquadStock a Cairo já está correta e não precisa de nenhuma ressalva.
3. **Header do SquadHeader compartilhado (`ui/layout/AppHeader.tsx`) sempre
   renderiza texto branco** (`text-white`/`white/15`/`white/10` fixos, não
   tokens) — funciona porque `--color-header` do SquadStock (`#5A3A00`,
   marrom-âmbar escuro) é escuro o bastante para contraste. Não trocar
   `--color-header` para um tom claro sem também revisar `AppHeader`.
4. **Sem logo própria ainda.** `app/squadstock/layout.tsx` não passa
   `logoSrc` para `AppHeader` (cai no `/favicon.png` padrão) porque não
   existe arquivo de logo do SquadStock em `public/` — só texto "SquadStock".
   Quando a logo oficial for adicionada em `public/`, passar
   `logoSrc="/squadstock-logo.png"` (ou nome equivalente) no `layout.tsx`.
5. **Os 9 estados do artifact (Disponível/Reservado/Baixo estoque/Sem
   estoque/Em inventário/Movimentando/Em manutenção/Danificado/Obsoleto)
   não existem todos na v1.** O schema atual (`stock_saldos`,
   `stock_movimentacoes`) só modela quantidade e os tipos de movimento
   `ENTRADA`/`SAIDA`/`AJUSTE` — não há campo de "estado do item" (reserva,
   manutenção, inventário aberto etc.), isso é escopo futuro (ver seção "O
   que fica fora da v1" do plano em
   `C:\Users\Usuário\.claude\plans\iridescent-launching-lovelace.md`). Os
   tokens `success`/`warning`/`danger`/`info` de `.squadstock` já estão
   calibrados para mapear 1:1 nos 4 primeiros estados
   (Disponível/Baixo estoque/Sem estoque/Reservado) quando esse campo for
   modelado — não são de uso genérico "positivo/negativo" como no resto do
   sistema.

## Ícones

Convenção: `ui/icons/index.tsx`, wrapper `<S {...p}>` (outline, 2px stroke,
24×24, `currentColor`). Ícones já usados no SquadStock:

- `StockIcon` — header da página de Saldos (`app/squadstock/page.tsx`).
- `RefreshIcon` — header da página de Movimentações (não existe
  `MovementIcon`; `RefreshIcon` foi escolhido como metáfora de
  entrada/saída/ciclo — revisar se um ícone mais específico for adicionado
  ao set depois).
- Disponíveis mas ainda não usados: `PackageIcon` (caixa 3D — pode servir
  para "Nova movimentação"/entrada), `WarehouseIcon` (galpão — pode servir
  para uma futura tela de "Localizações").

Padrão de uso (chip de ícone acima do `<h1>`):
```tsx
<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-soft text-primary-active">
  <StockIcon size={20} />
</div>
```

## Arquivos tocados nesta refatoração

- `app/globals.css` — bloco de tema `.squadstock` / `.dark .squadstock`.
- `app/squadstock/layout.tsx` — wrapper `<div className="squadstock ...">`.
- `app/squadstock/page.tsx` — ícone de header, `.card` no wrapper da
  tabela, `.label` nos rótulos, `tabular-nums` na coluna de quantidade.
- `app/squadstock/movimentacoes/page.tsx` — ícone de header, `.card`,
  badges coloridos por tipo (`TIPO_BADGE`), `tabular-nums`.
- `modules/squadstock/components/nova-movimentacao-form.tsx` — segmented
  control com raio flat (`rounded` em vez de `rounded-lg`).

## O que **não** foi feito de propósito

- Nenhuma imagem/logo foi gerada ou referenciada — segue a instrução
  explícita do briefing original ("não gere logotipos nem imagens").
- Nenhum novo campo de "estado do item" foi adicionado ao schema — ver
  divergência 5 acima.
- `saldos-tabela.tsx`/`movimentacoes-lista.tsx` não foram extraídos como
  componentes separados — as tabelas continuam inline nos `page.tsx`
  (só restilizadas), para não introduzir abstração que o escopo pedido
  (refatoração visual) não exigia.

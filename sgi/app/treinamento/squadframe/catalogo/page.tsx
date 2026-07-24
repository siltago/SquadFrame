import { GuiaLayout, Callout, Shot, Steps, SubSection } from "@/modules/squadframe/components/treinamento/ui";

export const dynamic = "force-dynamic";

const IMG = "/treinamento/catalogo";

export default function GuiaCatalogoPage() {
  return (
    <GuiaLayout
      backHref="/treinamento/squadframe"
      backLabel="← Guias SquadFrame"
      kicker="Manual de treinamento · SquadFrame"
      titulo="Catálogo"
      descricao="Como organizar produtos, linhas, categorias, cores RAL, aliases e arquivos técnicos. As telas abaixo são prints reais do sistema."
      toc={[
        { href: "#navegacao", label: "Navegação" },
        { href: "#lista", label: "Lista de produtos" },
        { href: "#abas-linhas", label: "Abas e linhas" },
        { href: "#categorias", label: "Categorias" },
        { href: "#novo-produto", label: "Criar um produto" },
        { href: "#detalhe-produto", label: "Detalhe do produto" },
        { href: "#cores-ral", label: "Cores RAL" },
        { href: "#permissoes", label: "Permissões" },
      ]}
    >
      {/* ================= NAVEGAÇÃO ================= */}
      <section id="navegacao" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">1. Navegação</h2>
        <p className="mt-1 mb-5 text-text-2">
          Dentro de Catálogo a navegação é uma barra lateral, não abas no topo. Ela lista, em ordem: uma entrada por <strong className="text-text">tipo de linha</strong> (as "abas" do catálogo, ex: Componentes, Conexões, Perfis, ACM, Vidros), com as <strong className="text-text">linhas</strong> daquele tipo listadas por baixo; depois <strong className="text-text">"Cores RAL"</strong>; e no rodapé o link <strong className="text-text">"Nova aba"</strong>.
        </p>
        <Shot src={`${IMG}/01-catalogo-lista.png`} alt="Painel do Catálogo com a barra lateral" />
        <Callout>
          <p>Não existe um item de menu separado pra "Fornecedores" ou "Categorias" — eles são acessados <strong>de dentro de um tipo</strong>, clicando nos cartões de contagem no topo da lista (próxima seção).</p>
        </Callout>
      </section>

      {/* ================= LISTA ================= */}
      <section id="lista" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">2. Lista de produtos</h2>
        <p className="mt-1 mb-5 text-text-2">A tela mostrada ao clicar num tipo de linha (aba) na barra lateral.</p>

        <SubSection title="Os 4 cartões no topo">
          <Steps
            items={[
              <>O cartão <strong className="text-text">"produtos"</strong> é o que está selecionado por padrão — mostra a lista normal de produtos.</>,
              <>Clicar em <strong className="text-text">"fornecedores"</strong>, <strong className="text-text">"linhas"</strong> ou <strong className="text-text">"categorias"</strong> troca a tela pra uma visão de gerenciamento daquele cadastro, sem sair da aba atual.</>,
            ]}
          />
        </SubSection>

        <SubSection title="Filtrar e buscar">
          <Steps
            items={[
              <>Digite no campo <strong className="text-text">"Buscar por código, nome ou alias…"</strong> — a busca olha código mestre, nome e qualquer alias cadastrado.</>,
              <>Use os seletores <strong className="text-text">Fornecedor</strong>, <strong className="text-text">Linha</strong>, <strong className="text-text">Categoria</strong>, <strong className="text-text">Status</strong> (Somente ativos / Todos / Somente inativos) e <strong className="text-text">Ordenar por</strong> pra refinar.</>,
              <>Filtros ativos aparecem como chips removíveis; <strong className="text-text">"Limpar"</strong> some com todos de uma vez.</>,
              <>Clicar no nome do Fornecedor, Linha ou Categoria dentro de uma linha da tabela já aplica esse valor como filtro.</>,
            ]}
          />
          <Shot src={`${IMG}/01-catalogo-lista.png`} alt="Lista de produtos do Catálogo" caption="Cartões de contagem, filtros e tabela." />
          <p className="mt-3 text-sm text-text-3">Não existe seleção múltipla/ação em massa aqui na lista — edição em massa é feita de dentro de uma linha específica (próxima seção).</p>
        </SubSection>
      </section>

      {/* ================= ABAS E LINHAS ================= */}
      <section id="abas-linhas" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">3. Abas e linhas</h2>
        <p className="mt-1 mb-5 text-text-2">
          São dois níveis diferentes: a <strong className="text-text">aba</strong> (tipo de linha, ex: "Perfis") é o agrupamento maior; a <strong className="text-text">linha</strong> (ex: "Linha Gold") é uma série/fabricante específico dentro dela.
        </p>

        <SubSection title="Criar uma aba nova">
          <Steps
            items={[
              <>No rodapé da barra lateral, clique em <strong className="text-text">"Nova aba"</strong>.</>,
              <>Preencha o <strong className="text-text">Nome da aba</strong> (ex: "Perfil, Vidro…") e escolha a <strong className="text-text">Unidade padrão</strong> (Barra/Perfil, Chapa/Vidro, Metro linear, Metro quadrado, Unidade, Quilograma ou Caixa).</>,
              <>Clique em <strong className="text-text">"Criar"</strong>.</>,
            ]}
          />
          <p className="mt-3 text-sm text-text-3">Pra editar ou apagar uma aba existente, use os ícones de lápis/lixeira ao lado do título dela — apagar só funciona se a aba não tiver nenhuma linha dentro.</p>
        </SubSection>

        <SubSection title="Criar uma linha nova">
          <Steps
            items={[
              <>Clique em <strong className="text-text">"Nova linha"</strong> (topo da lista de produtos de uma aba).</>,
              <>Escolha a <strong className="text-text">Aba</strong>, preencha o <strong className="text-text">Fabricante</strong> (opcional) e o <strong className="text-text">Nome da linha</strong> (obrigatório), e uma Descrição se quiser.</>,
              <>Clique em <strong className="text-text">"Criar linha"</strong>.</>,
            ]}
          />
          <Shot src={`${IMG}/06-catalogo-nova-linha.png`} alt="Formulário de nova linha" />
        </SubSection>

        <SubSection title="Dentro de uma linha">
          <p className="mb-3 text-text-2">Clicando numa linha na barra lateral, a lista de produtos filtra por ela. Com o filtro de linha ativo, aparece um botão <strong className="text-text">"Gerenciar linha"</strong> — ele leva pra uma página dedicada, com os produtos organizados por categoria e estas ações no topo:</p>
          <ul className="list-disc space-y-2 pl-5 text-text-2">
            <li><strong className="text-text">Apagar linha</strong> — só funciona se não houver produtos nela.</li>
            <li><strong className="text-text">Edição em massa</strong> — abre um diálogo com duas abas: "Unidade" (troca a unidade de "De" para "Para" em todos os produtos da linha de uma vez) e "Comprimento" (define um comprimento em mm pra todo produto da linha que ainda não tiver um).</li>
            <li><strong className="text-text">Importar XML</strong> — escolhe um arquivo XML de perfil; o sistema mostra uma prévia com um toggle "Importar novos" (cria produtos com códigos que ainda não existem) / "Atualizar pesos" (só atualiza o peso dos que já existem, casando pelo código).</li>
            <li><strong className="text-text">Novo produto</strong> — abre o formulário de criação (próxima seção).</li>
          </ul>
          <Shot src={`${IMG}/07-catalogo-linha.png`} alt="Página de uma linha, com categorias e produtos" />
          <p className="mt-3 text-sm text-text-3">No fim da página, <strong className="text-text">"Nova categoria"</strong> cria uma categoria direto dentro dessa linha (Tipo + Nome).</p>
        </SubSection>

        <SubSection title="Gerenciar linhas em lote">
          <p className="mb-3 text-text-2">Pelo cartão "linhas" na lista de produtos: cada linha aparece com nome, fabricante, descrição e quantidade de produtos, com pencil/lixeira pra editar ou apagar (apagar bloqueado se a linha ainda tiver produtos).</p>
          <Shot src={`${IMG}/10-catalogo-gerenciar-linhas.png`} alt="Tela de gerenciar linhas" />
        </SubSection>
      </section>

      {/* ================= CATEGORIAS ================= */}
      <section id="categorias" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">4. Categorias</h2>
        <p className="mt-1 mb-5 text-text-2">Uma categoria pertence a uma linha específica e serve pra sub-agrupar os produtos dela (ex: dentro da "Linha Gold", a categoria "GIRO").</p>
        <Steps
          items={[
            <>Pelo cartão <strong className="text-text">"categorias"</strong> na lista de produtos, ou pelo link <strong className="text-text">"Nova categoria"</strong> dentro da página de uma linha.</>,
            <>Preencha <strong className="text-text">Nome</strong> e escolha um <strong className="text-text">Tipo</strong> (uma classificação própria da categoria, diferente do tipo de linha/aba).</>,
            <>Salve — a categoria passa a aparecer no seletor de Categoria do formulário de produto, filtrada pela linha escolhida.</>,
          ]}
        />
        <p className="mt-3 text-sm text-text-3">Na visão de gerenciamento, cada linha aparece com suas categorias listadas, cada uma com pencil/lixeira pra editar ou apagar.</p>
      </section>

      {/* ================= NOVO PRODUTO ================= */}
      <section id="novo-produto" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">5. Criar um produto</h2>
        <Steps
          items={[
            <>De dentro de uma linha, clique em <strong className="text-text">"Novo produto"</strong>.</>,
            <>Preencha o <strong className="text-text">Código mestre</strong> (obrigatório, precisa ser único em todo o catálogo) e a <strong className="text-text">Unidade</strong> (já vem preenchida com o padrão da aba).</>,
            <>Preencha o <strong className="text-text">Nome técnico</strong> (obrigatório) e, se quiser, a <strong className="text-text">Categoria</strong>.</>,
            <>Se a unidade tiver medidas associadas (barra, chapa etc.), preencha as <strong className="text-text">Especificações</strong> — os rótulos mudam conforme o tipo (ex: "Comprimento da barra (mm)" e "Peso (kg/m)" pra barras; "Espessura (mm)" e "Peso (kg/m²)" pra chapas).</>,
            <>Descrição e Observações são opcionais.</>,
            <>Clique em <strong className="text-text">"Criar produto"</strong>.</>,
          ]}
        />
        <Shot src={`${IMG}/08-catalogo-novo-produto.png`} alt="Formulário de novo produto" />
        <Callout tone="warn">
          <p>Se o código mestre digitado já existir em qualquer lugar do catálogo, o sistema não cria um duplicado — ele simplesmente abre o produto já existente com aquele código.</p>
        </Callout>
      </section>

      {/* ================= DETALHE DO PRODUTO ================= */}
      <section id="detalhe-produto" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">6. Detalhe do produto</h2>
        <p className="mt-1 mb-5 text-text-2">A página de um produto tem 4 abas: <strong className="text-text">Geral</strong>, <strong className="text-text">Cores</strong>, <strong className="text-text">Aliases</strong> e <strong className="text-text">Arquivos</strong>.</p>

        <SubSection title="Aba Geral">
          <p className="mb-3 text-text-2">Mostra os dados cadastrais: Código mestre, Unidade, Linha, Fabricante, Categoria, Status, o fornecedor associado ao código mestre, e as especificações (tamanho/peso/preço).</p>
          <Shot src={`${IMG}/02-catalogo-produto-geral.png`} alt="Aba Geral do produto" />
          <Steps
            title="Editar"
            items={[
              <>Clique em <strong className="text-text">"Editar"</strong> no canto do card.</>,
              <>Ajuste qualquer campo, incluindo o <strong className="text-text">Fornecedor principal (quem usa o código mestre)</strong>, a Linha (trocar a linha reseta a Categoria) e o toggle de <strong className="text-text">Status</strong> (Ativo/Inativo).</>,
              <>Clique em <strong className="text-text">"Salvar"</strong>.</>,
            ]}
          />
          <p className="mt-3 text-sm text-text-3"><strong className="text-text">Excluir produto</strong> fica como link discreto embaixo do card, com confirmação antes de apagar.</p>
        </SubSection>

        <SubSection title="Aba Cores">
          <p className="mb-3 text-text-2">Lista as cores RAL já vinculadas a esse produto (swatch, código, nome, acabamento).</p>
          <Shot src={`${IMG}/03-catalogo-produto-cores.png`} alt="Aba Cores do produto" />
          <Steps
            items={[
              <><strong className="text-text">"Vincular todas"</strong> — vincula de uma vez toda cor RAL que já se aplica ao tipo desse produto e ainda não está vinculada.</>,
              <><strong className="text-text">"Vincular cor"</strong> — escolha uma cor RAL específica (só aparecem as que ainda não estão vinculadas) e, se quiser, um Acabamento.</>,
            ]}
          />
          <p className="mt-3 text-sm text-text-3">Hoje não existe botão pra remover uma cor já vinculada por essa aba.</p>
        </SubSection>

        <SubSection title="Aba Aliases">
          <p className="mb-3 text-text-2">Aliases são códigos alternativos pra esse mesmo produto — o mais comum é um alias por fornecedor, e um alias por cor quando o código do fornecedor muda conforme a cor.</p>
          <Shot src={`${IMG}/04-catalogo-produto-aliases.png`} alt="Aba Aliases do produto, com um exemplo real de alias por cor" caption="Exemplo real: FEC325PTR (preto) e FEC325BRC (branco) — mesmo produto, código muda por cor." />
          <Steps
            title="Adicionar um alias"
            items={[
              <>Clique em <strong className="text-text">"Adicionar alias"</strong>.</>,
              <>Preencha o <strong className="text-text">Código</strong> alternativo.</>,
              <>Escolha o <strong className="text-text">Fornecedor</strong> (opcional, já vem sugerido o fornecedor principal) e a <strong className="text-text">Cor</strong> — deixar a cor em branco significa "vale pra qualquer cor".</>,
              <>Preencha comprimento/peso/preço se forem diferentes do produto mestre (o que não for preenchido é herdado automaticamente).</>,
              <>Clique em <strong className="text-text">"Adicionar alias"</strong>.</>,
            ]}
          />
          <p className="mt-3 text-sm text-text-3">Cada alias tem ícones de editar e excluir na própria linha da tabela.</p>
        </SubSection>

        <SubSection title="Aba Arquivos">
          <p className="mb-3 text-text-2">Anexos técnicos do produto: desenhos DXF, imagens ou PDFs.</p>
          <Shot src={`${IMG}/05-catalogo-produto-arquivos.png`} alt="Aba Arquivos do produto" />
          <Steps
            items={[
              <>Clique em <strong className="text-text">"Escolher arquivo"</strong> (aceita DXF, PNG, JPG, WEBP, PDF).</>,
              <>Clique em <strong className="text-text">"Enviar"</strong>.</>,
              <>O arquivo aparece como um card com miniatura, nome e data — clicar no card abre o arquivo original em outra aba; o ícone de lixeira (aparece ao passar o mouse) remove o anexo.</>,
            ]}
          />
          <Callout>
            <p>Se o arquivo enviado for um <strong>.dxf</strong>, o sistema gera sozinho uma miniatura em PNG do desenho (usada como imagem do produto na lista e nos cards) — não existe botão de "gerar preview", é automático a cada envio.</p>
          </Callout>
        </SubSection>
      </section>

      {/* ================= CORES RAL ================= */}
      <section id="cores-ral" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">7. Cores RAL</h2>
        <p className="mt-1 mb-5 text-text-2">Cadastro central de cores, reaproveitado por todos os produtos — acessado pelo item "Cores RAL" na barra lateral.</p>
        <Steps
          items={[
            <>Clique em <strong className="text-text">"Nova cor"</strong>.</>,
            <>Preencha o <strong className="text-text">Código RAL</strong> (obrigatório, ex: "RAL9010"), Nome (opcional) e o <strong className="text-text">Hex</strong> (opcional — o campo de texto e o seletor de cor ficam sincronizados).</>,
            <>Marque em <strong className="text-text">"Aplica-se a"</strong> um ou mais tipos de linha (Perfis, Vidros, etc.) — uma cor pode valer pra vários tipos ao mesmo tempo.</>,
            <>Salve.</>,
          ]}
        />
        <Shot src={`${IMG}/09-catalogo-cores-ral.png`} alt="Tela de Cores RAL" />
        <Callout>
          <p>Se você cadastrar um código RAL que já existe, o sistema não cria uma cor duplicada — ele soma os novos tipos marcados aos que a cor já tinha.</p>
        </Callout>
        <p className="mt-3 text-sm text-text-3">Excluir uma cor remove ela de todos os pedidos que a usam — o sistema avisa isso na confirmação.</p>
      </section>

      {/* ================= PERMISSOES ================= */}
      <section id="permissoes" className="mb-6 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">8. Permissões do Catálogo</h2>
        <p className="mt-1 mb-5 text-text-2">Já cobertas no mapa geral de permissões do guia "Usuário, Compras e Financeiro", reforçando aqui o que cada uma libera dentro do Catálogo:</p>
        <div className="card p-4">
          <ul className="space-y-1.5 text-sm text-text-2">
            <li><strong className="text-text">Criar / Editar / Alterar status / Apagar no catálogo</strong> — produto, aba, linha, categoria, cor RAL, arquivos e aliases (as ações de criar/editar/apagar de cada uma dessas telas usam esse mesmo grupo de permissão)</li>
            <li><strong className="text-text">Cadastrar / Editar / Excluir fornecedores</strong> — a partir do Catálogo</li>
            <li><strong className="text-text">Criar e editar linhas</strong></li>
            <li><strong className="text-text">Criar e editar categorias</strong></li>
          </ul>
        </div>
        <p className="mt-3 text-sm text-text-3">Sem a permissão de criar/editar, os botões de ação (Nova linha, Novo produto, Editar, Vincular cor, Adicionar alias, Importar XML, etc.) simplesmente não aparecem na tela.</p>
      </section>
    </GuiaLayout>
  );
}

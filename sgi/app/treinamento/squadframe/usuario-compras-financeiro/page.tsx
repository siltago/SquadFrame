import { GuiaLayout, Pill, Callout, Shot, Steps, SubSection } from "@/modules/squadframe/components/treinamento/ui";

export const dynamic = "force-dynamic";

const IMG = "/treinamento/compras";

export default function GuiaUsuarioComprasFinanceiroPage() {
  return (
    <GuiaLayout
      backHref="/treinamento/squadframe"
      backLabel="← Guias SquadFrame"
      kicker="Manual de treinamento · SquadFrame"
      titulo="Usuário, Compras e Financeiro"
      descricao="Passo a passo de como usar o SquadFrame: criar acesso, configurar seu perfil, cadastrar fornecedor, pedir, aprovar, comprar, receber, devolver material e acompanhar o financeiro. As telas abaixo são prints reais do sistema, usando uma obra de exemplo (fictícia)."
      toc={[
        { href: "#acesso", label: "Acesso ao sistema" },
        { href: "#perfis", label: "Perfis e permissões" },
        { href: "#cadastros", label: "Cadastros de apoio" },
        { href: "#navegacao", label: "Navegação" },
        { href: "#solicitacao", label: "Solicitação de Compra" },
        { href: "#pedido", label: "Pedido de Compra" },
        { href: "#financeiro", label: "Financeiro" },
      ]}
    >
        {/* ================= ACESSO ================= */}
        <section id="acesso" className="mb-16 scroll-mt-24">
          <h2 className="text-xl font-bold text-text">1. Acesso ao sistema</h2>
          <p className="mt-1 mb-5 text-text-2">Antes de qualquer coisa em Compras, a pessoa precisa de uma conta — e a conta sozinha não dá acesso a nada.</p>

          <SubSection title="Criar uma conta nova">
            <Steps
              items={[
                <>Acesse a tela de cadastro (link "Criar conta" na tela de login).</>,
                <>Preencha <strong className="text-text">Nome completo</strong>, <strong className="text-text">E-mail</strong>, <strong className="text-text">Senha</strong> (mínimo 6 caracteres) e <strong className="text-text">Confirmar senha</strong> (precisa ser idêntica à senha).</>,
                <>Clique em <strong className="text-text">"Criar conta"</strong>.</>,
                <>Pronto — a conta já é criada e ativada na hora, e você entra logado automaticamente, sem precisar confirmar e-mail nem esperar aprovação de ninguém.</>,
              ]}
            />
            <Shot src={`${IMG}/00-cadastro.png`} alt="Tela de criar conta" />
          </SubSection>

          <SubSection title="Entrar com uma conta existente">
            <Steps
              items={[
                <>Na tela de login, informe e-mail e senha.</>,
                <>Clique em <strong className="text-text">"Entrar"</strong>.</>,
                <>Esqueceu a senha? Use o link <strong className="text-text">"Esqueci minha senha"</strong> logo abaixo do campo de senha.</>,
              ]}
            />
            <Shot src={`${IMG}/00-login.png`} alt="Tela de login" />
          </SubSection>

          <SubSection title="Configurar seu perfil">
            <Steps
              items={[
                <>Clique no seu nome/avatar no canto superior direito do sistema e escolha <strong className="text-text">"Meu perfil"</strong>.</>,
                <>Em <strong className="text-text">"Informações pessoais"</strong>, clique em <strong className="text-text">"Alterar foto"</strong> pra enviar uma foto sua (JPG, PNG ou WebP, até 2 MB) — ela passa a aparecer como seu avatar em todo o sistema.</>,
                <>Ajuste <strong className="text-text">Nome completo</strong> e <strong className="text-text">Empresa</strong> se precisar, e clique em <strong className="text-text">"Salvar alterações"</strong>. (O e-mail não pode ser trocado por aqui — só pelo administrador.)</>,
                <>Em <strong className="text-text">"Assinatura eletrônica"</strong>, escreva o texto que quer que apareça como carimbo (normalmente nome + cargo) e clique em <strong className="text-text">"Salvar assinatura"</strong>.</>,
                <>Esse texto é o que aparece toda vez que você confirma uma ação no modal <strong className="text-text">"Assinar e confirmar"</strong> — criar, aprovar, rejeitar, cancelar — em qualquer parte do sistema.</>,
                <>Pra trocar a senha já estando logado, use o card <strong className="text-text">"Alterar senha"</strong> no fim da página (diferente do fluxo "Esqueci minha senha", que é usado quando você não consegue entrar).</>,
              ]}
            />
            <Shot src={`${IMG}/00b-perfil.png`} alt="Tela de Meu Perfil" />
            <Callout>
              <p>Sem uma assinatura cadastrada, o modal de confirmação avisa <strong>"Nenhuma assinatura cadastrada"</strong> com um atalho direto pra essa tela — vale configurar isso antes de criar sua primeira solicitação ou pedido.</p>
            </Callout>
          </SubSection>

          <SubSection title="Esqueci minha senha">
            <Steps
              items={[
                <>Na tela de login, clique em <strong className="text-text">"Esqueci minha senha"</strong>.</>,
                <>Informe o <strong className="text-text">E-mail</strong> da conta, a <strong className="text-text">Nova senha</strong> (mínimo 6 caracteres) e <strong className="text-text">Confirmar nova senha</strong>.</>,
                <>Clique em <strong className="text-text">"Redefinir senha"</strong> — a senha já é trocada na hora, sem precisar clicar em nenhum link recebido por e-mail.</>,
                <>Clique em <strong className="text-text">"Ir para o login"</strong> e entre normalmente com a senha nova.</>,
              ]}
            />
          </SubSection>

          <Callout tone="warn">
            <p><strong>Depois de criar a conta, ela ainda não serve pra nada no sistema.</strong> Uma conta nova aparece na tela de Usuários marcada como "Sem cargo" e não mostra nenhum menu do sistema além da home. Alguém com permissão de editar usuários precisa entrar em Usuários e atribuir um cargo — é isso que libera as telas de Compras (próxima seção).</p>
          </Callout>
        </section>

        {/* ================= PERFIS ================= */}
        <section id="perfis" className="mb-16 scroll-mt-24">
          <h2 className="text-xl font-bold text-text">2. Perfis, cargos e permissões</h2>
          <p className="mt-1 mb-5 text-text-2">Quem decide o que cada pessoa pode fazer em Compras é o <strong className="text-text">cargo</strong> atribuído a ela — não a conta em si. Duas pessoas com conta podem enxergar telas completamente diferentes dependendo do cargo.</p>

          <SubSection title="Criar um setor e um cargo (feito por um administrador)">
            <Steps
              items={[
                <>Acesse <strong className="text-text">Usuários → Cargos e Setores</strong>.</>,
                <>Se o setor ainda não existir (ex: "Compras"), clique em <strong className="text-text">"Novo setor"</strong>, preencha o nome e escolha uma cor, e salve.</>,
                <>Dentro do setor, clique em <strong className="text-text">"Novo cargo"</strong> (ex: "Comprador" ou "Gestor de Compras"), preencha nome e cor.</>,
                <>Clique no cargo recém-criado pra abrir a edição — é lá que as permissões são marcadas.</>,
                <>Se o cargo deve ter acesso total ao sistema, ative o toggle <strong className="text-text">"Administrador (acesso total)"</strong> — isso libera todas as permissões de uma vez e trava a tabela abaixo (não dá pra desmarcar nada manualmente).</>,
                <>Caso contrário, desça até os blocos <strong className="text-text">Compras</strong> e <strong className="text-text">Financeiro</strong> e marque os checkboxes um por um, conforme o que essa pessoa precisa fazer (veja a tabela de permissões logo abaixo).</>,
                <>Clique em <strong className="text-text">"Salvar"</strong>.</>,
              ]}
            />
            <Shot src={`${IMG}/02-cargos-lista.png`} alt="Tela de Cargos e Setores" />
          </SubSection>

          <SubSection title="Atribuir o cargo a um usuário">
            <Steps
              items={[
                <>Acesse <strong className="text-text">Usuários</strong>.</>,
                <>Encontre a pessoa na lista (dá pra buscar por nome ou e-mail) e clique na linha dela pra expandir.</>,
                <>No seletor <strong className="text-text">Cargo</strong>, escolha o cargo criado no passo anterior.</>,
                <>O <strong className="text-text">Setor</strong> é preenchido sozinho, herdado do cargo escolhido — não precisa configurar separado.</>,
                <>A partir de agora, essa pessoa já enxerga os menus e botões liberados por esse cargo na próxima vez que abrir o sistema.</>,
              ]}
            />
            <Shot src={`${IMG}/01-usuarios.png`} alt="Tela de Usuários" caption="Nomes e e-mails desta captura foram ocultados — dado real de colegas." />
          </SubSection>

          <SubSection title="Mapa de permissões do SquadSystem">
            <p className="mb-4 text-text-2">
              Se o botão que você espera ver não aparece na tela, é quase sempre porque falta uma dessas permissões no cargo da pessoa — os botões somem por completo, não ficam só desabilitados. Esse mapa cobre <strong className="text-text">todas</strong> as permissões do sistema, não só as de Compras, porque é isso que aparece na tela de edição de cargo.
            </p>

            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Módulos gerais (grade Criar / Editar / Alterar status / Apagar)</h4>
            <p className="mb-3 text-sm text-text-3">No topo da edição de cargo, uma tabela única cobre esses módulos, cada um com as mesmas 4 ações.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                    <th className="py-2 pr-4 font-medium">Módulo</th>
                    <th className="py-2 font-medium">O que Criar / Editar / Alterar status / Apagar liberam</th>
                  </tr>
                </thead>
                <tbody className="text-text-2">
                  <tr className="border-b border-divider"><td className="py-2 pr-4 font-medium text-text">Obras</td><td className="py-2">Cadastrar, editar, mudar status e apagar obras.</td></tr>
                  <tr className="border-b border-divider"><td className="py-2 pr-4 font-medium text-text">Produção</td><td className="py-2">Reservado pra quando o módulo de produção ganhar tela própria — a permissão já existe, a funcionalidade ainda não.</td></tr>
                  <tr className="border-b border-divider"><td className="py-2 pr-4 font-medium text-text">Qualidade</td><td className="py-2">Idem — reservado pra um futuro módulo de Qualidade.</td></tr>
                  <tr className="border-b border-divider"><td className="py-2 pr-4 font-medium text-text">Expedição</td><td className="py-2">Idem — reservado pra um futuro módulo de Expedição.</td></tr>
                  <tr className="border-b border-divider"><td className="py-2 pr-4 font-medium text-text">Tarefas</td><td className="py-2">Criar, editar, mudar status e apagar tarefas/cards.</td></tr>
                  <tr className="border-b border-divider"><td className="py-2 pr-4 font-medium text-text">Usuários</td><td className="py-2">Criar contas, editar dados/cargo, ativar/desativar e apagar usuários.</td></tr>
                  <tr><td className="py-2 pr-4 font-medium text-text">Cargos</td><td className="py-2">Criar, editar, ativar/desativar e apagar cargos e setores.</td></tr>
                </tbody>
              </table>
            </div>

            <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-primary">Catálogo</h4>
            <div className="card p-4">
              <ul className="space-y-1.5 text-sm text-text-2">
                <li><strong className="text-text">Criar / Editar / Alterar status / Apagar no catálogo</strong> — produtos, arquivos, cores, aliases e especificações</li>
                <li><strong className="text-text">Cadastrar / Editar / Excluir fornecedores</strong> — a partir do Catálogo</li>
                <li><strong className="text-text">Criar e editar linhas</strong></li>
                <li><strong className="text-text">Criar e editar categorias</strong></li>
              </ul>
            </div>

            <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-primary">Compras</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card p-4">
                <h5 className="mb-2 text-xs font-semibold text-text">Solicitações</h5>
                <ul className="space-y-1.5 text-sm text-text-2">
                  <li><strong className="text-text">Criar solicitações de compra</strong> — inclui enviar e cancelar, e o botão "Nova solicitação"</li>
                  <li><strong className="text-text">Aprovar solicitações de compra</strong></li>
                  <li><strong className="text-text">Rejeitar solicitações de compra</strong></li>
                </ul>
              </div>
              <div className="card p-4">
                <h5 className="mb-2 text-xs font-semibold text-text">Pedidos</h5>
                <ul className="space-y-1.5 text-sm text-text-2">
                  <li><strong className="text-text">Criar pedidos de compra</strong> — inclui o botão "Novo pedido"</li>
                  <li><strong className="text-text">Aprovar pedidos de compra</strong></li>
                  <li><strong className="text-text">Cancelar pedidos de compra</strong></li>
                  <li><strong className="text-text">Excluir pedidos de compra</strong></li>
                  <li><strong className="text-text">Abrir retorno de pedido de compra</strong> / <strong className="text-text">Aprovar ou rejeitar retorno de pedido</strong></li>
                  <li><strong className="text-text">Criar devolução de pedido de compra</strong> / <strong className="text-text">Aprovar ou rejeitar devolução de pedido</strong></li>
                </ul>
              </div>
              <div className="card p-4">
                <h5 className="mb-2 text-xs font-semibold text-text">Recebimentos, documentos, anotações</h5>
                <ul className="space-y-1.5 text-sm text-text-2">
                  <li><strong className="text-text">Registrar recebimentos de pedidos</strong></li>
                  <li><strong className="text-text">Fazer upload de documentos em pedidos</strong> / <strong className="text-text">Excluir documentos de pedidos</strong></li>
                  <li><strong className="text-text">Adicionar anotações em pedidos</strong></li>
                </ul>
              </div>
              <div className="card p-4">
                <h5 className="mb-2 text-xs font-semibold text-text">Fornecedores, pagamento, notificações</h5>
                <ul className="space-y-1.5 text-sm text-text-2">
                  <li><strong className="text-text">Criar / Editar / Excluir fornecedores</strong> (chave legada de Compras — mesmo efeito da versão do Catálogo)</li>
                  <li><strong className="text-text">Gerenciar formas de pagamento</strong></li>
                  <li><strong className="text-text">Receber relatório diário de Compras (WhatsApp)</strong></li>
                </ul>
              </div>
            </div>

            <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-primary">Pacotes de Trabalho (Compras)</h4>
            <div className="card p-4">
              <ul className="space-y-1.5 text-sm text-text-2">
                <li><strong className="text-text">Visualizar contexto de Compras do pacote</strong></li>
                <li><strong className="text-text">Gerenciar necessidades e bloqueio de Compras do pacote</strong></li>
              </ul>
            </div>

            <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-primary">Financeiro</h4>
            <div className="card p-4">
              <ul className="space-y-1.5 text-sm text-text-2">
                <li><strong className="text-text">Visualizar carteiras e saldos</strong></li>
                <li><strong className="text-text">Registrar depósitos em carteiras</strong></li>
                <li><strong className="text-text">Criar pedido com faturamento da carteira</strong> — libera escolher "Faturamento Direto" ao criar um pedido</li>
                <li><strong className="text-text">Confirmar débito da carteira ao emitir</strong></li>
                <li><strong className="text-text">Acessar dashboard financeiro</strong></li>
              </ul>
            </div>
          </SubSection>
        </section>

        {/* ================= CADASTROS ================= */}
        <section id="cadastros" className="mb-16 scroll-mt-24">
          <h2 className="text-xl font-bold text-text">3. Cadastros de apoio</h2>
          <p className="mt-1 mb-5 text-text-2">Antes do primeiro pedido, vale ter pelo menos um fornecedor e uma forma de pagamento cadastrados.</p>

          <SubSection title="Cadastrar um fornecedor">
            <Steps
              items={[
                <>Acesse <strong className="text-text">Compras → Fornecedores</strong>.</>,
                <>No formulário à esquerda, preencha pelo menos o <strong className="text-text">Nome Fantasia</strong> (único campo obrigatório).</>,
                <>Complete o que tiver disponível: Razão Social, CNPJ, Telefone, E-mail, Contato, Endereço, Número, CEP, Cidade, Estado.</>,
                <>Na seção <strong className="text-text">"Fornece para"</strong>, marque os tipos de produto que esse fornecedor vende (ex: Componentes, Perfis, Vidros).</>,
                <>Clique em <strong className="text-text">"Cadastrar fornecedor"</strong>.</>,
              ]}
            />
            <Shot src={`${IMG}/03-fornecedores.png`} alt="Tela de Fornecedores" caption="CNPJ e telefone ocultados." />
            <Callout>
              <p>É esse campo <strong>"Fornece para"</strong> que decide quais fornecedores vão aparecer depois na hora de montar um pedido — o formulário de novo pedido filtra a lista de fornecedores estritamente pelo tipo de produto que você escolher primeiro. Um fornecedor sem nenhum tipo marcado nunca vai aparecer pra seleção.</p>
            </Callout>
            <p className="mt-3 text-sm text-text-3">Pra editar, clique no ícone de lápis ao lado do fornecedor na lista. Pra excluir vários de uma vez, clique em "Excluir" no topo da lista, marque os que quer remover e confirme — mas a exclusão falha se o fornecedor já tiver pedidos vinculados.</p>
          </SubSection>

          <SubSection title="Cadastrar uma forma de pagamento">
            <Steps
              items={[
                <>Acesse <strong className="text-text">Compras → Formas de Pgto.</strong></>,
                <>Preencha o <strong className="text-text">Nome</strong> (ex: "PIX", "Boleto 30 dias", "Faturamento Direto").</>,
                <>Se quiser, adicione uma Descrição.</>,
                <>Se essa forma deve descontar automaticamente da carteira da obra em vez de gerar cobrança externa, ative o toggle <strong className="text-text">"Faturamento Direto"</strong>.</>,
                <>Clique em <strong className="text-text">"Adicionar"</strong>.</>,
              ]}
            />
            <Shot src={`${IMG}/04-formas-pagamento.png`} alt="Tela de Formas de Pagamento" />
            <Callout tone="warn">
              <p>Quando uma forma marcada como <strong>Faturamento Direto</strong> é escolhida num pedido, o valor não gera uma cobrança externa — ele é debitado direto do saldo da <strong>carteira</strong> daquela combinação obra + fornecedor (mesma carteira que aparece em Financeiro → Carteiras). Sem saldo suficiente, o débito fica pendente até alguém depositar e confirmar.</p>
            </Callout>
          </SubSection>
        </section>

        {/* ================= NAVEGACAO ================= */}
        <section id="navegacao" className="mb-16 scroll-mt-24">
          <h2 className="text-xl font-bold text-text">4. Navegação da área de Compras</h2>
          <p className="mt-1 mb-5 text-text-2">Menu lateral fixo, sempre visível enquanto você estiver dentro de Compras.</p>
          <Shot src={`${IMG}/05-painel-compras.png`} alt="Painel de Compras com menu lateral" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                  <th className="py-2 pr-4 font-medium">Item do menu</th>
                  <th className="py-2 font-medium">Pra que serve</th>
                </tr>
              </thead>
              <tbody className="text-text-2">
                {[
                  ["Painel", "Visão geral de Compras"],
                  ["Solicitações", "Lista de solicitações de compra"],
                  ["Pedidos", "Lista de pedidos de compra"],
                  ["Lotes", "Pedidos agrupados por lote de produção"],
                  ["Fornecedores", "Cadastro de fornecedores"],
                  ["Financeiro", "Redireciona ao painel financeiro"],
                  ["Empresa (Configurações)", "Dados da empresa, usados no PDF dos pedidos"],
                  ["Formas de Pgto. (Configurações)", "Cadastro de formas de pagamento"],
                ].map(([a, b]) => (
                  <tr key={a} className="border-b border-divider last:border-0">
                    <td className="py-2 pr-4 font-medium text-text">{a}</td>
                    <td className="py-2">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-text-3">No rodapé da barra lateral ficam os atalhos <strong className="text-text">"Nova solicitação"</strong> e <strong className="text-text">"Novo pedido"</strong> — só aparecem pra quem tem a permissão correspondente.</p>
        </section>

        {/* ================= SOLICITACAO ================= */}
        <section id="solicitacao" className="mb-16 scroll-mt-24">
          <h2 className="text-xl font-bold text-text">5. Solicitação de Compra</h2>
          <p className="mt-1 mb-5 text-text-2">Passo opcional que separa "preciso disso" (qualquer pessoa da obra) de "vou comprar isso" (comprador). Nem todo pedido nasce de uma solicitação, mas toda solicitação aprovada pode virar um.</p>

          <SubSection title="Como criar uma solicitação">
            <Steps
              items={[
                <>Clique em <strong className="text-text">"Nova solicitação"</strong> (rodapé da barra lateral ou botão no topo da lista de solicitações).</>,
                <>Escolha a <strong className="text-text">Obra</strong> (opcional), a <strong className="text-text">Origem</strong> (Obra, Administrativo ou Manutenção) e a <strong className="text-text">Prioridade</strong> (Baixa, Normal, Alta ou Urgente — padrão é Normal).</>,
                <>Preencha a <strong className="text-text">Justificativa</strong> e as <strong className="text-text">Observações</strong>, se quiser.</>,
                <>Adicione itens de duas formas: na aba <strong className="text-text">"Do catálogo"</strong>, digite 2 ou mais letras do código/nome no campo de busca e clique no resultado desejado; ou na aba <strong className="text-text">"Item externo"</strong>, preencha descrição, unidade e quantidade pra um item que não está no catálogo.</>,
                <>Se o mesmo produto já estiver na lista e você buscar de novo, a linha fica com fundo amarelo e mostra "Já na lista" — digite a quantidade a somar e o sistema já mostra o resultado (ex: 1 + 2 = 3) antes de confirmar. Clique <strong className="text-text">"Confirmar"</strong> pra somar essa quantidade ao item existente, ou <strong className="text-text">"Adicionar novamente"</strong> pra criar uma segunda linha separada em vez de somar (útil quando a mesma peça precisa ficar em outra cor).</>,
                <>Ajuste quantidade, unidade, cor e observação direto na tabela de itens, se precisar.</>,
                <>Clique em <strong className="text-text">"Criar solicitação"</strong> (é obrigatório ter ao menos 1 item).</>,
                <>Confirme no modal <strong className="text-text">"Assinar e confirmar"</strong> — esse modal aparece em toda ação importante do sistema, mostrando sua assinatura eletrônica e a data/hora.</>,
              ]}
            />
            <Shot src={`${IMG}/10-nova-solicitacao.png`} alt="Formulário de nova solicitação de compra" />
          </SubSection>

          <SubSection title="Ciclo de status">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Significado</th>
                    <th className="py-2 font-medium">Próxima ação</th>
                  </tr>
                </thead>
                <tbody className="align-top text-text-2">
                  <tr className="border-b border-divider"><td className="py-2.5 pr-3"><Pill tone="blue">Aberta</Pill></td><td className="py-2.5 pr-3">Criada, ainda não enviada pra ninguém decidir.</td><td className="py-2.5">Enviar para aprovação · Cancelar</td></tr>
                  <tr className="border-b border-divider"><td className="py-2.5 pr-3"><Pill tone="amber">Aguard. Aprovação</Pill></td><td className="py-2.5 pr-3">Esperando aprovador decidir.</td><td className="py-2.5">Aprovar · Rejeitar</td></tr>
                  <tr className="border-b border-divider"><td className="py-2.5 pr-3"><Pill tone="green">Aprovada</Pill></td><td className="py-2.5 pr-3">Liberada pra virar pedido.</td><td className="py-2.5">Criar pedido</td></tr>
                  <tr className="border-b border-divider"><td className="py-2.5 pr-3"><Pill tone="red">Rejeitada</Pill></td><td className="py-2.5 pr-3">Recusada pelo aprovador.</td><td className="py-2.5">Reabrir (volta pra Aberta)</td></tr>
                  <tr className="border-b border-divider"><td className="py-2.5 pr-3"><Pill tone="gray">Cancelada</Pill></td><td className="py-2.5 pr-3">Estado final — sem volta.</td><td className="py-2.5">—</td></tr>
                  <tr><td className="py-2.5 pr-3"><Pill tone="purple">Em Pedido</Pill></td><td className="py-2.5 pr-3">Já existe um pedido aprovado usando os itens dela.</td><td className="py-2.5">— (automático)</td></tr>
                </tbody>
              </table>
            </div>
          </SubSection>

          <SubSection title="Enviar, aprovar e rejeitar">
            <Steps
              items={[
                <>Com a solicitação em <strong className="text-text">Aberta</strong>, abra o detalhe dela e clique em <strong className="text-text">"Enviar para aprovação"</strong>, depois confirme no modal de assinatura.</>,
                <>Quem tem permissão de aprovar vê dois botões no topo do detalhe: <strong className="text-text">"Aprovar"</strong> e <strong className="text-text">"Rejeitar"</strong>.</>,
                <>Clicar em <strong className="text-text">"Rejeitar"</strong> (ou em "Cancelar") abre antes uma caixinha de <strong className="text-text">Observação (opcional)</strong> — dá pra registrar o motivo, mas não é obrigatório preencher.</>,
                <>Depois de "Continuar", confirme no modal de assinatura pra efetivar a aprovação/rejeição.</>,
                <>Uma solicitação <strong className="text-text">Rejeitada</strong> não está de fato encerrada: o botão <strong className="text-text">"Reabrir"</strong> volta ela pra Aberta, pronta pra ser corrigida e reenviada.</>,
              ]}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Shot src={`${IMG}/12-solicitacao-aguardando-aprovacao.png`} alt="Solicitação aguardando aprovação" caption="Aguard. Aprovação — botões Aprovar/Rejeitar." />
              <Shot src={`${IMG}/13-solicitacao-aprovada.png`} alt="Solicitação aprovada" caption="Aprovada — botão Criar pedido." />
            </div>
          </SubSection>

          <SubSection title="Transformar em pedido">
            <p className="mb-3 text-text-2">Existem dois caminhos, e os dois levam ao mesmo lugar:</p>
            <Steps
              items={[
                <>Na própria solicitação <strong className="text-text">Aprovada</strong>, clique no botão <strong className="text-text">"Criar pedido"</strong> — abre o formulário de novo pedido já com os itens dela.</>,
                <>Ou: comece um pedido do zero e, no formulário de novo pedido, clique em <strong className="text-text">"Importar de outra solicitação"</strong> — escolha entre as solicitações aprovadas disponíveis e clique em <strong className="text-text">"Importar"</strong> ao lado dela.</>,
              ]}
            />
            <Callout>
              <p>Criar o pedido não muda o status da solicitação na hora — ela continua <strong>Aprovada</strong>. Só quando esse pedido for de fato <strong>aprovado</strong> é que o sistema move a solicitação sozinha pra <strong>Em Pedido</strong>. Se esse pedido for excluído depois (e não houver outro pedido ativo usando os mesmos itens), ela volta sozinha pra Aprovada, disponível de novo pra importar.</p>
            </Callout>
          </SubSection>
        </section>

        {/* ================= PEDIDO ================= */}
        <section id="pedido" className="mb-16 scroll-mt-24">
          <h2 className="text-xl font-bold text-text">6. Pedido de Compra</h2>
          <p className="mt-1 mb-5 text-text-2">Da criação até o material guardado no estoque — com dois desvios possíveis pelo caminho: corrigir antes de chegar (retorno) ou devolver depois de já ter chegado (devolução).</p>

          <SubSection title="Como criar um pedido">
            <Steps
              items={[
                <>Clique em <strong className="text-text">"Novo pedido"</strong>.</>,
                <>Escolha o <strong className="text-text">Tipo de produto</strong> primeiro — isso filtra tanto os fornecedores quanto a busca de produtos daqui pra frente.</>,
                <>Escolha o <strong className="text-text">Fornecedor</strong> (só aparecem os que atendem esse tipo) e a <strong className="text-text">Obra</strong>.</>,
                <>Adicione os itens buscando por código ou nome, do mesmo jeito que na solicitação. Se um produto tiver um código específico daquele fornecedor (diferente do código mestre), o sistema pergunta em um modal qual código usar antes de adicionar o item.</>,
                <>Se quiser, escolha uma <strong className="text-text">Forma de pagamento</strong> e vincule o pedido a um <strong className="text-text">Lote</strong> de produção.</>,
                <>Clique em <strong className="text-text">"Criar Pedido"</strong> e confirme no modal de assinatura.</>,
              ]}
            />
          </SubSection>

          <SubSection title="Ciclo de status">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Significado</th>
                    <th className="py-2 font-medium">Próxima ação</th>
                  </tr>
                </thead>
                <tbody className="align-top text-text-2">
                  <tr className="border-b border-divider"><td className="py-2.5 pr-3"><Pill tone="gray">Rascunho</Pill></td><td className="py-2.5 pr-3">Editável livremente, ninguém mais viu ainda.</td><td className="py-2.5">Enviar aprovação · Cancelar</td></tr>
                  <tr className="border-b border-divider"><td className="py-2.5 pr-3"><Pill tone="amber">Aguard. Aprovação</Pill></td><td className="py-2.5 pr-3">Esperando decisão do aprovador.</td><td className="py-2.5">Aprovar · Rejeitar</td></tr>
                  <tr className="border-b border-divider"><td className="py-2.5 pr-3"><Pill tone="green">Aprovado</Pill></td><td className="py-2.5 pr-3">Liberado — falta só emitir.</td><td className="py-2.5">Emitir pedido · Cancelar</td></tr>
                  <tr className="border-b border-divider"><td className="py-2.5 pr-3"><Pill tone="red">Rejeitado</Pill></td><td className="py-2.5 pr-3">Aprovador recusou.</td><td className="py-2.5">Devolver para edição · Cancelar</td></tr>
                  <tr className="border-b border-divider"><td className="py-2.5 pr-3"><Pill tone="purple">Aguard. Recebimento</Pill></td><td className="py-2.5 pr-3">Enviado ao fornecedor, esperando a mercadoria.</td><td className="py-2.5">Registrar recebimento</td></tr>
                  <tr className="border-b border-divider"><td className="py-2.5 pr-3"><Pill tone="amber">Recebido Parcial</Pill></td><td className="py-2.5 pr-3">Só parte da mercadoria chegou.</td><td className="py-2.5">Registrar o saldo restante</td></tr>
                  <tr className="border-b border-divider"><td className="py-2.5 pr-3"><Pill tone="green">Recebido</Pill></td><td className="py-2.5 pr-3">Tudo chegou.</td><td className="py-2.5">Finalizar</td></tr>
                  <tr><td className="py-2.5 pr-3"><Pill tone="gray">Finalizado / Cancelado</Pill></td><td className="py-2.5 pr-3">Estados finais — não mudam mais.</td><td className="py-2.5">—</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-text-3">Editar (mudar fornecedor, itens, valores) só é possível em Rascunho, Aguard. Aprovação ou Rejeitado — nos demais status o botão de editar some. Um pedido Rejeitado não pode ser "reaprovado" direto: só volta pra Rascunho pelo botão "Devolver para edição", pra depois ser reenviado.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Shot src={`${IMG}/20-pedido-rascunho.png`} alt="Pedido em rascunho" caption="Rascunho — editável." />
              <Shot src={`${IMG}/21-pedido-aguardando-aprovacao.png`} alt="Pedido aguardando aprovação" caption="Aguard. Aprovação." />
            </div>
          </SubSection>

          <SubSection title="Emissão e PDF">
            <Steps
              items={[
                <>Com o pedido <strong className="text-text">Aprovado</strong>, clique em <strong className="text-text">"Emitir pedido"</strong>.</>,
                <>Se o <strong className="text-text">prazo de entrega</strong> ainda não estiver preenchido, o sistema abre um painel pedindo essa data antes de continuar — é obrigatório informar pra seguir.</>,
                <>Confirme no modal de assinatura — o pedido pula direto pra <strong className="text-text">Aguard. Recebimento</strong>.</>,
                <>Pra gerar o documento pra mandar ao fornecedor, clique em <strong className="text-text">"Visualizar PDF"</strong> (disponível a partir de Aprovado).</>,
                <>Na tela de visualização, use <strong className="text-text">"Imprimir"</strong> ou <strong className="text-text">"Salvar PDF"</strong> — o arquivo sai nomeado com o número do pedido, a obra e a data.</>,
              ]}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Shot src={`${IMG}/22-pedido-aprovado.png`} alt="Pedido aprovado" caption="Aprovado — pronto pra emitir." />
              <Shot src={`${IMG}/25-pedido-aguardando-recebimento.png`} alt="Painel de prazo de entrega ao emitir" caption="Emitir pede o prazo de entrega antes de continuar." />
            </div>
            <Shot src={`${IMG}/23-pedido-pdf.png`} alt="Visualização do PDF do pedido" caption="Dados da empresa ocultados nesta captura." />
          </SubSection>

          <SubSection title="Registrar recebimento">
            <Steps
              items={[
                <>Com o pedido em <strong className="text-text">Aguard. Recebimento</strong> (ou Recebido Parcial), clique em <strong className="text-text">"Registrar recebimento"</strong>.</>,
                <>Confira a <strong className="text-text">Data de recebimento</strong> (já vem preenchida com hoje) e adicione observações, se quiser (ex: número da nota fiscal).</>,
                <>Na tabela <strong className="text-text">"Quantidades recebidas"</strong>, cada item mostra o quanto já foi recebido e o saldo pendente — o campo <strong className="text-text">"Receber agora"</strong> já vem preenchido com o saldo total, mas você pode reduzir esse número pra registrar um recebimento parcial.</>,
                <>Clique em <strong className="text-text">"Confirmar recebimento"</strong> e assine.</>,
                <>O sistema decide sozinho o novo status: se sobrou saldo em algum item, o pedido vira <strong className="text-text">Recebido Parcial</strong>; se todos os itens zeraram o saldo, vira <strong className="text-text">Recebido</strong>.</>,
              ]}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Shot src={`${IMG}/26-pedido-registrar-recebimento.png`} alt="Tela de registrar recebimento" />
              <Shot src={`${IMG}/27-pedido-recebido.png`} alt="Pedido totalmente recebido" caption="100% recebido." />
            </div>
          </SubSection>

          <SubSection title="Corrigindo um pedido: retorno × devolução">
            <p className="mb-3 text-text-2">São dois fluxos pra dois momentos diferentes — o que muda é se já chegou alguma mercadoria ou não.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="align-top text-text-2">
                  <tr className="border-b border-divider"><td className="w-40 py-2.5 pr-3 font-semibold text-text">Quando usar</td><td className="w-1/2 py-2.5 pr-3">Antes de qualquer recebimento — corrigir fornecedor, itens, preço, prazo.</td><td className="py-2.5">Depois de já ter recebido algo — devolver fisicamente ao fornecedor.</td></tr>
                  <tr className="border-b border-divider"><td className="py-2.5 pr-3 font-semibold text-text">Pré-requisito</td><td className="py-2.5 pr-3">Nenhum recebimento registrado ainda.</td><td className="py-2.5">Pelo menos um recebimento já registrado.</td></tr>
                  <tr><td className="py-2.5 pr-3 font-semibold text-text">O que muda</td><td className="py-2.5 pr-3">Fornecedor, itens, prazo, tudo — igual editar o pedido.</td><td className="py-2.5">Só a quantidade e o valor dos itens já recebidos que voltam ao fornecedor.</td></tr>
                </tbody>
              </table>
            </div>

            <p className="mb-2 mt-6 font-semibold text-text">Retorno de pedido</p>
            <Steps
              items={[
                <>No pedido (já Aprovado, Emitido ou Aguard. Recebimento, sem nenhum recebimento ainda), clique em <strong className="text-text">"Retornar pedido"</strong>.</>,
                <>Preencha o <strong className="text-text">Motivo do retorno</strong> (obrigatório).</>,
                <>Edite o que for preciso — fornecedor, obra, forma de pagamento, cor, prazo, observações e a lista de itens inteira.</>,
                <>Clique em <strong className="text-text">"Enviar para aprovação"</strong> e assine.</>,
                <>O pedido fica com um banner "Retorno de pedido aguardando aprovação" até alguém com permissão clicar em <strong className="text-text">"Aprovar retorno"</strong> — quando aprovado, as mudanças entram em vigor e o pedido volta sozinho ao status em que estava antes.</>,
              ]}
            />
            <Shot src={`${IMG}/24-pedido-retornar.png`} alt="Tela de retorno de pedido" caption="Retorno de Pedido — antes de qualquer recebimento." />

            <p className="mb-2 mt-6 font-semibold text-text">Devolução de pedido</p>
            <Steps
              items={[
                <>No pedido (Recebido Parcial, Recebido ou Finalizado, com pelo menos um recebimento já registrado), clique em <strong className="text-text">"Criar devolução"</strong>.</>,
                <>Preencha o <strong className="text-text">Motivo da devolução</strong> (obrigatório).</>,
                <>Na tabela de <strong className="text-text">Itens recebidos</strong>, marque o checkbox de cada item que será devolvido e informe a quantidade a devolver.</>,
                <>Se o pedido usa Faturamento Direto, preencha o <strong className="text-text">Valor total da devolução</strong> — esse valor é creditado de volta na carteira quando a devolução for entregue.</>,
                <>Clique em <strong className="text-text">"Criar devolução"</strong>.</>,
                <>A devolução segue seu próprio ciclo, visível como um cartão no pedido: Rascunho → Aguard. Aprovação → Aprovado → Em Envio → Entregue (ou Cancelado a qualquer momento antes disso).</>,
              ]}
            />
            <Shot src={`${IMG}/28-pedido-devolver.png`} alt="Tela de devolução de pedido" caption="Devolução de Pedido — depois de algum recebimento." />
          </SubSection>

          <SubSection title="Valor final e finalização">
            <Steps
              items={[
                <>A partir de Aguard. Recebimento em diante, clique em <strong className="text-text">"Adicionar valor final"</strong>.</>,
                <>Informe o valor em R$ que o fornecedor confirmou de verdade pelo pedido inteiro (pode ser diferente da soma estimada dos itens na criação) e clique em <strong className="text-text">"Salvar"</strong>.</>,
                <>Se o pedido for de linha "Perfil", o sistema pergunta se deve <strong className="text-text">atualizar o preço médio por kg</strong> no catálogo com base nesse valor — responda conforme o caso.</>,
                <>Se o pedido usa Faturamento Direto, o valor final tenta debitar da carteira automaticamente; sem saldo, aparece um banner <strong className="text-text">"Débito pendente na carteira"</strong> com o botão <strong className="text-text">"Confirmar débito"</strong>, disponível assim que houver saldo.</>,
                <>Com o pedido <strong className="text-text">Recebido</strong>, clique em <strong className="text-text">"Finalizar"</strong> e assine — o pedido vira Finalizado, estado final.</>,
              ]}
            />
            <Shot src={`${IMG}/30-pedido-finalizado.png`} alt="Pedido finalizado com valor final" caption="Finalizado — valor final confirmado." />
          </SubSection>

          <SubSection title="Outras ações no pedido">
            <ul className="list-disc space-y-2 pl-5 text-text-2">
              <li><strong className="text-text">Anotações</strong>: aba dedicada a registrar observações livres sobre o andamento do pedido — não muda nenhum status, é só um mural de recados.</li>
              <li><strong className="text-text">Excluir pedidos</strong>: na lista de pedidos, clique em "Excluir", marque um ou mais pedidos com o checkbox e confirme na barra que aparece embaixo. Se o pedido excluído veio de uma solicitação, ela volta sozinha pra Aprovada.</li>
              <li><strong className="text-text">Lista de pedidos</strong>: busca por código de fornecedor ou descrição de item, e filtro por status em chips clicáveis (Todos, Rascunho, Aguard. Aprovação, etc.) — a lista se atualiza sozinha quando algum pedido muda.</li>
            </ul>
          </SubSection>
        </section>

        {/* ================= FINANCEIRO ================= */}
        <section id="financeiro" className="mb-6 scroll-mt-24">
          <h2 className="text-xl font-bold text-text">7. Financeiro</h2>
          <p className="mt-1 mb-5 text-text-2">Onde o valor de cada pedido aparece consolidado, e onde vive o saldo usado pelo Faturamento Direto.</p>

          <SubSection title="Consultar o dashboard">
            <Steps
              items={[
                <>Acesse <strong className="text-text">Financeiro → Dashboard</strong>.</>,
                <>Use os filtros de <strong className="text-text">Fornecedor</strong>, <strong className="text-text">Obra</strong>, <strong className="text-text">Status</strong> e período (De/Até) e clique em <strong className="text-text">"Filtrar"</strong>.</>,
                <>Os cartões no topo mostram o <strong className="text-text">Total Geral</strong>, separando o que é <strong className="text-text">Confirmado</strong> (pedidos com valor final já registrado) do que é só <strong className="text-text">Estimado</strong> (soma dos itens, ainda sem valor final).</>,
                <>Abaixo, os rankings <strong className="text-text">"Por fornecedor"</strong> e <strong className="text-text">"Por obra"</strong>, a evolução mensal e a tabela completa de pedidos do período filtrado.</>,
              ]}
            />
            <Shot src={`${IMG}/06-financeiro.png`} alt="Dashboard financeiro" caption="Filtrado pela obra de exemplo — números reais de clientes não aparecem aqui." />
          </SubSection>

          <SubSection title="Depositar numa carteira">
            <Steps
              items={[
                <>Acesse a aba <strong className="text-text">"Carteiras"</strong> dentro de Financeiro.</>,
                <>Cada carteira é uma combinação de obra + fornecedor, com seu próprio saldo.</>,
                <>Pra depositar, abra a carteira desejada (ou crie uma nova combinação obra/fornecedor) e registre o valor do depósito.</>,
                <>O extrato da carteira mostra todas as movimentações — depósitos e débitos de pedidos faturados direto.</>,
              ]}
            />
          </SubSection>
        </section>
    </GuiaLayout>
  );
}

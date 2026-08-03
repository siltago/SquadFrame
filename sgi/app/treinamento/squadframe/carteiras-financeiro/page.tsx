import { Callout, GuiaLayout, Shot, Steps, SubSection } from "@/modules/squadframe/components/treinamento/ui";

export const dynamic = "force-dynamic";

const IMG = "/treinamento/carteiras";

export default function GuiaCarteirasFinanceiroPage() {
  return (
    <GuiaLayout
      backHref="/treinamento/squadframe"
      backLabel="← Guias SquadFrame"
      kicker="Manual de treinamento · Financeiro"
      titulo="Criação e correção de carteiras"
      descricao="Passo a passo para financiar uma carteira por meio de contrato, conferir os saldos e corrigir divergências. As imagens são capturas reais do sistema."
      toc={[
        { href: "#conceito", label: "Como funciona" },
        { href: "#criar", label: "Criar carteira" },
        { href: "#conferir", label: "Conferir carteiras" },
        { href: "#corrigir", label: "Corrigir saldo" },
        { href: "#cuidados", label: "Cuidados" },
      ]}
    >
      <section id="conceito" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">1. Como a carteira funciona</h2>
        <p className="mt-2 text-text-2">
          A carteira não é cadastrada diretamente. Ela nasce quando um contrato recebe um destino e parte desse valor é alocada a um fornecedor. O sistema cria ou abastece a carteira da combinação obra + fornecedor.
        </p>
        <Callout>
          <p>O saldo usado em uma compra é compartilhado por fornecedor: pedidos de qualquer obra podem consumir o total disponível nesse fornecedor. A obra do contrato identifica a origem do recurso, mas não limita sozinha onde ele será consumido.</p>
        </Callout>
        <SubSection title="Permissões necessárias">
          <ul className="list-disc space-y-2 pl-5 text-[15px] text-text-2">
            <li><strong className="text-text">Gerenciar contratos financeiros</strong> para criar contrato, destino e alocação.</li>
            <li><strong className="text-text">Visualizar carteiras e saldos</strong> para consultar as carteiras.</li>
            <li><strong className="text-text">Ajustar saldo de carteiras</strong> para fazer correções.</li>
          </ul>
        </SubSection>
      </section>

      <section id="criar" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">2. Criar ou abastecer uma carteira</h2>
        <SubSection title="Abrir um novo contrato">
          <Steps items={[
            <>Acesse <strong className="text-text">Financeiro → Contratos</strong>.</>,
            <>Clique em <strong className="text-text">Novo contrato</strong>.</>,
            <>Selecione a <strong className="text-text">Obra</strong>, informe o <strong className="text-text">Número do contrato</strong> e o <strong className="text-text">Valor total</strong>.</>,
            <>Se for útil, acrescente uma descrição e clique em <strong className="text-text">Criar contrato</strong>.</>,
          ]} />
          <Shot src={`${IMG}/01-contratos.png`} alt="Lista real de contratos no Financeiro" />
          <Shot src={`${IMG}/02-novo-contrato.png`} alt="Formulário real de novo contrato" />
        </SubSection>

        <SubSection title="Definir destino e fornecedor">
          <Steps items={[
            <>No contrato aberto, em <strong className="text-text">Novo destino</strong>, escolha a aba do catálogo que receberá o recurso.</>,
            <>Informe o valor do destino, sem ultrapassar o saldo ainda não destinado do contrato, e clique em <strong className="text-text">Adicionar</strong>.</>,
            <>Dentro do destino criado, selecione o <strong className="text-text">Fornecedor</strong> e informe o valor que será alocado.</>,
            <>Clique em <strong className="text-text">Alocar</strong>. Essa alocação cria a carteira ou acrescenta saldo à carteira existente.</>,
            <>Confira os indicadores <strong className="text-text">Destinado</strong> e <strong className="text-text">alocado / valor do destino</strong> antes de sair.</>,
          ]} />
          <Shot src={`${IMG}/03-destinos-alocacoes.png`} alt="Contrato real com destinos e alocações por fornecedor" />
          <Callout tone="warn">
            <p>Destino e alocação têm limites independentes: a soma dos destinos não pode superar o valor total do contrato, e a soma das alocações não pode superar o valor do destino.</p>
          </Callout>
        </SubSection>
      </section>

      <section id="conferir" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">3. Conferir as carteiras</h2>
        <Steps items={[
          <>Acesse <strong className="text-text">Financeiro → Carteiras</strong>.</>,
          <>Use a visão por <strong className="text-text">Obra</strong> para localizar a origem do saldo ou por <strong className="text-text">Fornecedor</strong> para conferir o total compartilhado.</>,
          <>Abra uma carteira para consultar saldo, depósitos, débitos e o histórico de movimentações.</>,
        ]} />
        <Shot src={`${IMG}/04-carteiras.png`} alt="Visão real das carteiras agrupadas por obra" caption="Visão por obra: mostra a origem dos recursos e o total de cada obra." />
        <Shot src={`${IMG}/04b-carteiras-por-fornecedor.png`} alt="Visão real das carteiras agrupadas por fornecedor" caption="Visão por fornecedor: mostra o saldo compartilhado e as obras que compõem o total de cada fornecedor." />
      </section>

      <section id="corrigir" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">4. Corrigir o saldo de um fornecedor</h2>
        <p className="mt-2 text-text-2">Use a correção somente quando uma conferência externa mostrar que o saldo total do fornecedor está diferente do sistema.</p>
        <Steps items={[
          <>Acesse <strong className="text-text">Financeiro → Faturamento Direto</strong> e desça até <strong className="text-text">Ajustar saldo (correção)</strong>.</>,
          <>Selecione o fornecedor. O seletor mostra o saldo atual somado entre todas as obras.</>,
          <>Em <strong className="text-text">Novo saldo (R$)</strong>, informe o saldo final correto — não informe apenas a diferença.</>,
          <>Escreva um motivo objetivo e verificável, de preferência citando a conferência, nota fiscal ou documento que justificou a mudança.</>,
          <>Revise fornecedor, saldo atual e novo saldo; depois clique em <strong className="text-text">Ajustar saldo</strong>.</>,
          <>Confira a confirmação e a linha criada em <strong className="text-text">Últimos ajustes</strong>.</>,
        ]} />
        <Shot src={`${IMG}/05-correcao-saldo.png`} alt="Tela real de faturamento direto com formulário de correção e histórico" />
        <Callout>
          <p>Se o novo saldo for maior, o sistema registra um depósito de ajuste. Se for menor, registra um débito de ajuste. O autor, a data, os valores anterior e novo e o motivo ficam guardados para auditoria.</p>
        </Callout>
      </section>

      <section id="cuidados" className="mb-8 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">5. Cuidados antes de confirmar</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] text-text-2">
          <li>Não use a correção para registrar um contrato novo: contratos devem entrar pelo fluxo de destino e alocação.</li>
          <li>Confirme se escolheu o fornecedor correto; a correção considera o saldo compartilhado dele entre todas as obras.</li>
          <li>Nunca use motivo genérico como “ajuste”. Registre a origem da divergência.</li>
          <li>Antes de reduzir um saldo, confira pedidos de faturamento direto ainda aguardando débito.</li>
          <li>Se um botão ou aba não aparecer, solicite ao administrador a permissão correspondente.</li>
        </ul>
      </section>
    </GuiaLayout>
  );
}

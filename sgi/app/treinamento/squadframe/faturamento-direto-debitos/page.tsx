import { Callout, GuiaLayout, Pill, Shot, Steps } from "@/modules/squadframe/components/treinamento/ui";

export const dynamic = "force-dynamic";
const IMG = "/treinamento/processos-compras";

export default function FaturamentoDiretoDebitosPage() {
  return (
    <GuiaLayout backHref="/treinamento/squadframe" backLabel="← Guias SquadFrame" kicker="Treinamento · Financeiro" titulo="Faturamento direto e débitos de pedidos" descricao="Como identificar pedidos que usam carteira, decidir o débito e resolver falta de saldo ou rejeições. Este processo é independente de beneficiamento." toc={[{ href: "#origem", label: "Quando usa carteira" }, { href: "#pendencia", label: "Pendências" }, { href: "#decidir", label: "Aprovar ou rejeitar" }, { href: "#problemas", label: "Problemas comuns" }]}>
      <section id="origem" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">1. Quando um pedido usa carteira</h2>
        <p className="mt-2 text-text-2">O pedido entra no fluxo de carteira quando sua forma de pagamento está cadastrada como <strong>Faturamento Direto</strong>. Não existe um botão separado para ligar a carteira: a forma de pagamento é a fonte dessa decisão.</p>
        <Callout><p>Antes de emitir, confira fornecedor, valor e pagamento. O saldo é compartilhado por fornecedor entre as carteiras das obras, conforme explicado no treinamento “Carteiras no Financeiro”.</p></Callout>
      </section>

      <section id="pendencia" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">2. Depois da emissão</h2>
        <p className="mt-2 text-text-2">Depois que o pedido de faturamento direto é emitido, o débito não é automático. Ele aparece como pendente até alguém com permissão financeira tomar uma decisão explícita.</p>
        <Shot src={`${IMG}/faturamento-01-pendencias.png`} alt="Tela real de faturamento direto com pedidos aguardando débito" />
        <Steps items={[
          <>Acesse <strong className="text-text">Financeiro → Faturamento Direto</strong>.</>,
          <>Revise pedido, fornecedor, obra, situação, valor e saldo disponível no fornecedor.</>,
          <>Clique no número do pedido para abrir o detalhe e conferir itens, recebimentos e documentos.</>,
        ]} />
      </section>

      <section id="decidir" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">3. Aprovar ou rejeitar o débito</h2>
        <Steps items={[
          <>Clique em <strong className="text-text">Aprovar débito</strong> quando pedido, fornecedor, valor e saldo estiverem corretos.</>,
          <>O sistema debita o valor da carteira e registra quem decidiu e quando.</>,
          <>Clique em <strong className="text-text">Rejeitar</strong> quando houver valor incorreto, falta de autorização, fornecedor divergente ou saldo que não deve ser utilizado.</>,
          <>Informe um motivo objetivo. A rejeição não altera o saldo e pode ser revertida aprovando o débito depois.</>,
        ]} />
        <Shot src={`${IMG}/faturamento-02-aprovar-debito.png`} alt="Pedido real com débito de faturamento direto pendente" />
        <Callout tone="warn"><p>Enquanto o débito estiver <Pill tone="red">Rejeitado</Pill>, o pedido não pode avançar de etapa, exceto para cancelamento. Resolva a causa e aprove o débito ou cancele o pedido.</p></Callout>
      </section>

      <section id="problemas" className="mb-8 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">4. Como resolver problemas comuns</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-text-2">
          <li><strong className="text-text">Saldo insuficiente:</strong> confira contratos e alocações do fornecedor; não faça uma correção de saldo apenas para contornar uma compra sem cobertura.</li>
          <li><strong className="text-text">Valor incorreto:</strong> corrija o pedido pelo fluxo de retorno quando ainda não houve recebimento.</li>
          <li><strong className="text-text">Pagamento incorreto:</strong> retorne o pedido e escolha a forma de pagamento correta.</li>
          <li><strong className="text-text">Débito duplicado:</strong> não tente aprovar novamente; o sistema registra quando o débito já foi efetuado.</li>
          <li><strong className="text-text">Material devolvido:</strong> use o fluxo de devolução para que a movimentação correspondente seja rastreada.</li>
        </ul>
      </section>
    </GuiaLayout>
  );
}

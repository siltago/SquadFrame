import { Callout, GuiaLayout, Pill, Shot, Steps, SubSection } from "@/modules/squadframe/components/treinamento/ui";

export const dynamic = "force-dynamic";
const IMG = "/treinamento/processos-compras";

export default function PedidosEtapasPage() {
  return (
    <GuiaLayout backHref="/treinamento/squadframe" backLabel="← Guias SquadFrame" kicker="Treinamento · Compras" titulo="Pedidos, etapas, retorno e devolução" descricao="Como criar um pedido, movimentá-lo no momento correto e corrigir situações antes ou depois do recebimento." toc={[{ href: "#criar", label: "Criar pedido" }, { href: "#etapas", label: "Etapas" }, { href: "#aprovar", label: "Aprovar e receber" }, { href: "#retorno", label: "Retorno" }, { href: "#devolucao", label: "Devolução" }]}>
      <section id="criar" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">1. Criar o pedido</h2>
        <Steps items={[
          <>Preferencialmente, abra uma solicitação <Pill tone="green">Aprovada</Pill> e clique em <strong className="text-text">Criar pedido</strong>. Assim os itens mantêm a origem.</>,
          <>Para uma compra sem solicitação, acesse <strong className="text-text">Compras → Pedidos → Novo pedido</strong>.</>,
          <>Selecione tipo de material, fornecedor, obra e forma de pagamento; informe preços, quantidades, códigos do fornecedor, cores e observações.</>,
          <>Quando os itens forem digitados manualmente, anexe um comprovante de origem — orçamento, e-mail, foto ou PDF — antes de enviar para aprovação.</>,
          <>Salve como rascunho e revise o total. Não use o pedido como simples anotação: ele gera compromissos financeiros, recebimento e histórico.</>,
        ]} />
        <Shot src={`${IMG}/pedidos-01-lista.png`} alt="Lista real de pedidos" />
        <Shot src={`${IMG}/pedidos-02-novo.png`} alt="Formulário real de novo pedido" />
      </section>

      <section id="etapas" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">2. Mudar a etapa: quando e por quê</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-text-3"><th className="py-2 pr-4">Etapa</th><th className="py-2 pr-4">Quando usar</th><th className="py-2">Por que é importante</th></tr></thead><tbody className="divide-y divide-border text-text-2">
          <tr><td className="py-3 pr-4"><Pill tone="gray">Rascunho</Pill></td><td>Enquanto dados e itens ainda estão sendo preparados.</td><td>Evita aprovação de conteúdo incompleto.</td></tr>
          <tr><td className="py-3 pr-4"><Pill tone="amber">Aguard. Aprovação</Pill></td><td>Quando fornecedor, valores, itens e comprovantes foram revisados.</td><td>Formaliza a decisão do gestor.</td></tr>
          <tr><td className="py-3 pr-4"><Pill tone="green">Aprovado</Pill></td><td>Após o gestor autorizar a compra.</td><td>Libera a emissão ao fornecedor.</td></tr>
          <tr><td className="py-3 pr-4"><Pill tone="blue">Aguard. Recebimento</Pill></td><td>Ao emitir o pedido e confirmar o prazo de entrega.</td><td>Inicia o acompanhamento do prazo e permite receber.</td></tr>
          <tr><td className="py-3 pr-4"><Pill tone="amber">Recebido Parcial</Pill></td><td>Quando apenas parte das quantidades chegou.</td><td>Mantém visível o saldo ainda pendente.</td></tr>
          <tr><td className="py-3 pr-4"><Pill tone="green">Recebido</Pill></td><td>Quando todas as quantidades foram conferidas.</td><td>Confirma a entrega física completa.</td></tr>
          <tr><td className="py-3 pr-4"><Pill tone="gray">Finalizado</Pill></td><td>Após registrar o valor final e resolver pendências.</td><td>Fecha corretamente compras e financeiro.</td></tr>
        </tbody></table></div>
        <Callout tone="warn"><p>Não avance etapas apenas para “limpar a tela”. Os dashboards, alertas, lotes, recebimentos e financeiro usam o status do pedido como fonte de verdade.</p></Callout>
        <Shot src={`${IMG}/pedidos-04-detalhe-etapas.png`} alt="Detalhe real de pedido com ações e etapas" />
      </section>

      <section id="aprovar" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">3. Aprovar, emitir, receber e finalizar</h2>
        <Steps items={[
          <>Em <Pill tone="gray">Rascunho</Pill>, clique em <strong className="text-text">Enviar aprovação</strong> e assine.</>,
          <>O aprovador confere origem, fornecedor, itens, preços, pagamento e obra; então aprova ou rejeita com motivo.</>,
          <>Em <Pill tone="green">Aprovado</Pill>, clique em <strong className="text-text">Emitir pedido</strong> e informe o prazo de entrega obrigatório.</>,
          <>Quando o material chegar, clique em <strong className="text-text">Registrar recebimento</strong> e informe somente o recebido naquele momento.</>,
          <>Registre o valor final pela devolutiva/PDF ou manualmente. Só finalize depois de confirmar o custo real.</>,
        ]} />
      </section>

      <section id="retorno" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">4. Retorno de pedido</h2>
        <p className="mt-2 text-text-2">Use o retorno quando o pedido precisa ser corrigido <strong>antes de qualquer recebimento</strong>. Ele é apropriado para trocar item, quantidade, preço, fornecedor, pagamento, prazo ou observação.</p>
        <Steps items={[
          <>No pedido aprovado, emitido ou aguardando recebimento, clique em <strong className="text-text">Retornar pedido</strong>.</>,
          <>Informe um motivo específico e faça as alterações necessárias.</>,
          <>Envie. O retorno fica pendente e o pedido volta para aprovação.</>,
          <>Quando aprovado, ele retorna automaticamente à etapa anterior; quando rejeitado, a alteração não prossegue.</>,
        ]} />
        <Shot src={`${IMG}/pedidos-05-retorno.png`} alt="Tela real de retorno de pedido" />
      </section>

      <section id="devolucao" className="mb-8 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">5. Devolução de pedido</h2>
        <p className="mt-2 text-text-2">Use a devolução quando já houve recebimento físico e o material precisa voltar ao fornecedor. Não use retorno neste caso.</p>
        <Steps items={[
          <>Clique em <strong className="text-text">Criar devolução</strong>, selecione itens e quantidades e informe o motivo.</>,
          <>Envie para aprovação. Depois de aprovada, marque o envio ao fornecedor.</>,
          <>Quando o fornecedor receber, confirme a entrega da devolução.</>,
          <>Se a compra usar carteira, confira o crédito correspondente no fluxo financeiro.</>,
        ]} />
        <Shot src={`${IMG}/pedidos-06-recebido-parcial.png`} alt="Pedido real com recebimento parcial" />
        <Shot src={`${IMG}/pedidos-07-devolucao.png`} alt="Formulário real de devolução" />
      </section>
    </GuiaLayout>
  );
}

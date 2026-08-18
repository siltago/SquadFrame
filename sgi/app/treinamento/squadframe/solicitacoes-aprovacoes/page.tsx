import { Callout, GuiaLayout, Pill, Shot, Steps, SubSection } from "@/modules/squadframe/components/treinamento/ui";

export const dynamic = "force-dynamic";
const IMG = "/treinamento/processos-compras";

export default function SolicitacoesAprovacoesPage() {
  return (
    <GuiaLayout backHref="/treinamento/squadframe" backLabel="← Guias SquadFrame" kicker="Treinamento · Compras" titulo="Solicitações e aprovações" descricao="Da identificação da necessidade até a autorização para o comprador gerar um pedido." toc={[{ href: "#objetivo", label: "Quando criar" }, { href: "#criar", label: "Criar e enviar" }, { href: "#aprovar", label: "Aprovar ou rejeitar" }, { href: "#status", label: "Etapas" }]}>
      <section id="objetivo" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">1. Quando criar uma solicitação</h2>
        <p className="mt-2 text-text-2">Crie uma solicitação quando alguém identifica uma necessidade, mas a compra ainda precisa ser analisada. Ela registra quem pediu, para qual obra, a prioridade, a justificativa e os materiais.</p>
        <Callout><p><strong>Por que isso importa:</strong> a solicitação cria rastreabilidade antes da cotação, evita compras sem autorização e permite que o pedido herde os itens aprovados sem redigitação.</p></Callout>
        <Shot src={`${IMG}/solicitacoes-01-lista.png`} alt="Lista real de solicitações de compra" />
      </section>

      <section id="criar" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">2. Criar e enviar</h2>
        <Steps items={[
          <>Acesse <strong className="text-text">Compras → Solicitações</strong> e clique em <strong className="text-text">Nova solicitação</strong>.</>,
          <>Escolha o tipo de material. Isso filtra o catálogo e reduz erros de produto.</>,
          <>Informe obra, origem, prioridade, justificativa e observações. Use <strong>Urgente</strong> apenas quando a data realmente exigir tratamento excepcional.</>,
          <>Adicione itens do catálogo. Use <strong>Item externo</strong> somente quando o produto ainda não existir no sistema.</>,
          <>Revise quantidades e unidades, salve e depois clique em <strong className="text-text">Enviar aprovação</strong>.</>,
          <>Assine a ação. A solicitação passa de <Pill tone="blue">Aberta</Pill> para <Pill tone="amber">Aguard. Aprovação</Pill>.</>,
        ]} />
        <Shot src={`${IMG}/solicitacoes-02-nova.png`} alt="Formulário real de nova solicitação" />
      </section>

      <section id="aprovar" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">3. Aprovar ou rejeitar</h2>
        <Steps items={[
          <>Abra a solicitação e confira obra, solicitante, prioridade, justificativa e cada item.</>,
          <>Clique em <strong className="text-text">Aprovar</strong> quando a necessidade, quantidade e destino estiverem corretos.</>,
          <>Clique em <strong className="text-text">Rejeitar</strong> quando a compra não deve prosseguir. Registre um motivo claro para orientar o solicitante.</>,
          <>Depois de aprovada, clique em <strong className="text-text">Criar pedido</strong>. O sistema leva os itens e a origem para o pedido.</>,
        ]} />
        <Callout tone="warn"><p>Aprovação não significa que a compra já foi feita. Ela apenas autoriza a criação do pedido; fornecedor, preço, pagamento e prazo ainda precisam ser definidos pelo comprador.</p></Callout>
      </section>

      <section id="status" className="mb-8 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">4. O que cada etapa significa</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><tbody className="divide-y divide-border text-text-2">
          <tr><td className="py-3 pr-4"><Pill tone="blue">Aberta</Pill></td><td>Pode ser revisada antes do envio.</td></tr>
          <tr><td className="py-3 pr-4"><Pill tone="amber">Aguard. Aprovação</Pill></td><td>Espera decisão de quem possui permissão para aprovar.</td></tr>
          <tr><td className="py-3 pr-4"><Pill tone="green">Aprovada</Pill></td><td>Está autorizada a ser transformada em pedido.</td></tr>
          <tr><td className="py-3 pr-4"><Pill tone="red">Rejeitada</Pill></td><td>Não deve seguir; consulte o motivo registrado.</td></tr>
          <tr><td className="py-3 pr-4"><Pill tone="purple">Em Pedido</Pill></td><td>Já originou um pedido e não deve ser comprada novamente.</td></tr>
        </tbody></table></div>
      </section>
    </GuiaLayout>
  );
}

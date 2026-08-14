import { Callout, GuiaLayout, Pill, Steps, SubSection } from "@/modules/squadframe/components/treinamento/ui";

export const dynamic = "force-dynamic";

const strong = "font-semibold text-text";

export default function GuiaBeneficiamentoPage() {
  return (
    <GuiaLayout
      backHref="/treinamento/squadframe"
      backLabel="← Guias SquadFrame"
      kicker="Manual de treinamento · Compras"
      titulo="Como fazer o beneficiamento de um pedido"
      descricao="Passo a passo para enviar perfis comprados na cor natural para pintura ou outro beneficiamento, mantendo pedidos e estoque corretos."
      toc={[
        { href: "#entenda", label: "Entenda o fluxo" },
        { href: "#preparar", label: "Antes de começar" },
        { href: "#criar", label: "Criar beneficiamento" },
        { href: "#rota", label: "Escolher a rota" },
        { href: "#acompanhar", label: "Enviar e acompanhar" },
        { href: "#status", label: "Status" },
        { href: "#erros", label: "Erros e cuidados" },
      ]}
    >
      <section id="entenda" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">1. Entenda o fluxo</h2>
        <p className="mt-2 text-text-2">
          Use o beneficiamento quando um pedido comprou um perfil na cor <strong className={strong}>Natural</strong> e esse material precisa ser transformado antes de seguir para a obra. Ao confirmar, o SquadFrame cria um número de beneficiamento e também um novo pedido de compra para o fornecedor que fará o serviço.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-3">1 · Origem</p><p className="mt-1 text-sm text-text-2">Pedido emitido com o produto cru, na cor Natural.</p></div>
          <div className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-3">2 · Serviço</p><p className="mt-1 text-sm text-text-2">Pedido gerado para quem fará a pintura ou outro processo.</p></div>
          <div className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-3">3 · Resultado</p><p className="mt-1 text-sm text-text-2">Recebimento do produto beneficiado, com seu próprio código no catálogo.</p></div>
        </div>

        <Callout>
          <p><strong className={strong}>Produto cru e produto beneficiado são produtos diferentes.</strong> Cada um precisa ter seu próprio cadastro. Essa separação é o que mantém o saldo do estoque correto.</p>
        </Callout>
      </section>

      <section id="preparar" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">2. Antes de começar</h2>
        <SubSection title="Confira estes requisitos">
          <ul className="list-disc space-y-2 pl-5 text-[15px] text-text-2">
            <li>O pedido de origem deve estar <strong className={strong}>Emitido</strong>, <strong className={strong}>Aguardando recebimento</strong>, <strong className={strong}>Recebido parcial</strong> ou <strong className={strong}>Recebido</strong>.</li>
            <li>O pedido precisa ter ao menos um item de perfil cuja cor no catálogo seja <strong className={strong}>Natural</strong>.</li>
            <li>O prestador deve estar cadastrado em Compras → Fornecedores com a opção <strong className={strong}>Faz beneficiamento</strong> marcada.</li>
            <li>Você precisa da permissão <strong className={strong}>Criar beneficiamento de pedido</strong>. Para enviar ou cancelar, também precisa de <strong className={strong}>Avançar/cancelar beneficiamento</strong>.</li>
          </ul>
        </SubSection>
        <Callout tone="warn">
          <p>O botão não aparece antes da emissão porque o pedido ainda pode ser alterado ou rejeitado durante a aprovação.</p>
        </Callout>
      </section>

      <section id="criar" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">3. Criar o beneficiamento</h2>
        <Steps items={[
          <>Abra <strong className={strong}>Compras → Pedidos</strong> e entre no pedido que contém o perfil Natural.</>,
          <>Clique em <strong className={strong}>Gerar beneficiamento</strong>. Você também pode abrir <strong className={strong}>Compras → Beneficiamento → Novo beneficiamento</strong> e selecionar o pedido de origem.</>,
          <>Marque somente os itens que serão beneficiados e ajuste a quantidade de cada um, se necessário.</>,
          <>Para cada item cru, pesquise e selecione o <strong className={strong}>produto beneficiado</strong>. Se ele ainda não existir, use <strong className={strong}>Cadastrar produto pintado</strong>.</>,
          <>Selecione o fornecedor que fará o serviço e a forma de pagamento. Quando existir, <strong className={strong}>Faturamento direto</strong> vem pré-selecionado.</>,
          <>Escolha a rota correta, registre observações úteis e clique em <strong className={strong}>Criar beneficiamento</strong>.</>,
        ]} />
        <Callout>
          <p>A confirmação cria tudo de uma vez: o pedido do serviço, o beneficiamento e o vínculo entre cada produto cru e seu produto beneficiado.</p>
        </Callout>
      </section>

      <section id="rota" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">4. Escolher a rota correta</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <Pill tone="purple">Via fábrica</Pill>
            <p className="mt-3 text-sm text-text-2">Use quando o material cru será recebido na fábrica e depois enviado ao beneficiador.</p>
            <p className="mt-3 text-sm text-text-2"><strong className={strong}>Efeito:</strong> ao marcar como enviado, o sistema retira do estoque a quantidade do produto cru.</p>
          </div>
          <div className="card p-5">
            <Pill tone="blue">Direto do fornecedor</Pill>
            <p className="mt-3 text-sm text-text-2">Use quando o fornecedor do material cru entrega diretamente ao beneficiador, sem passar pela fábrica.</p>
            <p className="mt-3 text-sm text-text-2"><strong className={strong}>Efeito:</strong> não há baixa do produto cru no estoque da fábrica, pois ele nunca entrou ali.</p>
          </div>
        </div>
        <Callout tone="warn">
          <p>Na rota Via fábrica, só é possível marcar o envio depois que o pedido de origem estiver Recebido ou Recebido parcial e houver saldo cru suficiente no estoque.</p>
        </Callout>
      </section>

      <section id="acompanhar" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">5. Enviar e acompanhar</h2>
        <Steps items={[
          <>Acesse <strong className={strong}>Compras → Beneficiamento</strong> e abra o registro pelo número BNF.</>,
          <>Confira a rota, a obra, o pedido de origem, o pedido de beneficiamento e a relação entre produtos crus e beneficiados.</>,
          <>Quando o material sair fisicamente para o prestador, clique em <strong className={strong}>Marcar como enviado</strong>.</>,
          <>Abra o pedido de beneficiamento vinculado e conduza o fluxo normal de compras: aprovação, emissão, valor final e recebimento, conforme as regras da empresa.</>,
          <>Registre o recebimento do pedido de beneficiamento. Quando ele ficar <strong className={strong}>Recebido</strong>, o beneficiamento muda automaticamente para <strong className={strong}>Concluído</strong> e o produto beneficiado entra no estoque pelo recebimento normal.</>,
        ]} />
        <Callout>
          <p>Não existe botão separado para concluir. A conclusão acontece automaticamente quando o pedido do serviço é totalmente recebido.</p>
        </Callout>
      </section>

      <section id="status" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">6. O que cada status significa</h2>
        <div className="mt-4 space-y-3">
          <div className="card flex gap-4 p-4"><div className="w-40 shrink-0"><Pill tone="amber">Aguardando envio</Pill></div><p className="text-sm text-text-2">Criado, mas o material ainda não foi entregue ao beneficiador. É o único momento em que pode ser cancelado.</p></div>
          <div className="card flex gap-4 p-4"><div className="w-40 shrink-0"><Pill tone="blue">Enviado</Pill></div><p className="text-sm text-text-2">O material está com o prestador. Acompanhe o pedido de beneficiamento até o recebimento.</p></div>
          <div className="card flex gap-4 p-4"><div className="w-40 shrink-0"><Pill tone="green">Concluído</Pill></div><p className="text-sm text-text-2">O pedido de beneficiamento foi totalmente recebido e o produto final entrou no estoque.</p></div>
          <div className="card flex gap-4 p-4"><div className="w-40 shrink-0"><Pill tone="red">Cancelado</Pill></div><p className="text-sm text-text-2">O processo e o pedido vinculado foram cancelados antes do envio, com motivo registrado.</p></div>
        </div>
      </section>

      <section id="erros" className="mb-8 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">7. Erros comuns e como resolver</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-text"><tr><th className="px-4 py-3 font-semibold">Situação</th><th className="px-4 py-3 font-semibold">Como resolver</th></tr></thead>
            <tbody className="divide-y divide-border text-text-2">
              <tr><td className="px-4 py-3">Pedido não aparece na seleção</td><td className="px-4 py-3">Confirme se foi emitido e se possui perfil cadastrado com cor Natural.</td></tr>
              <tr><td className="px-4 py-3">Fornecedor não aparece</td><td className="px-4 py-3">Edite o fornecedor e marque “Faz beneficiamento”.</td></tr>
              <tr><td className="px-4 py-3">Item sem produto pintado</td><td className="px-4 py-3">Selecione um produto final existente ou cadastre um novo SKU beneficiado.</td></tr>
              <tr><td className="px-4 py-3">Saldo insuficiente ao enviar</td><td className="px-4 py-3">Na rota Via fábrica, confira o recebimento e o saldo do produto cru antes da saída.</td></tr>
              <tr><td className="px-4 py-3">Não consigo cancelar</td><td className="px-4 py-3">O cancelamento exige motivo, permissão de gerenciamento e status Aguardando envio.</td></tr>
              <tr><td className="px-4 py-3">Não concluiu</td><td className="px-4 py-3">Confira se o pedido de beneficiamento vinculado foi totalmente recebido, não apenas parcialmente.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </GuiaLayout>
  );
}

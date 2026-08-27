import { Callout, GuiaLayout, Shot, Steps, SubSection } from "@/modules/squadframe/components/treinamento/ui";

export const dynamic = "force-dynamic";
const IMG = "/treinamento/processos-compras";

export default function LotesComprasPage() {
  return (
    <GuiaLayout backHref="/treinamento/squadframe" backLabel="← Guias SquadFrame" kicker="Treinamento · Compras" titulo="Lotes em Compras" descricao="Como relacionar pedidos a um lote e acompanhar a cobertura das necessidades de material. Este é um processo independente de romaneios." toc={[{ href: "#conceito", label: "Para que serve" }, { href: "#origem", label: "Pré-requisitos" }, { href: "#vincular", label: "Vincular pedido" }, { href: "#gerar", label: "Gerar pedido" }]}>
      <section id="conceito" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">1. Para que serve</h2>
        <p className="mt-2 text-text-2">O lote organiza as necessidades de material de uma parte planejada da obra. A vinculação permite comparar quantidade necessária, solicitada, pedida e recebida.</p>
        <Callout><p><strong>Importância:</strong> sem o vínculo, o pedido continua existindo, mas não cobre o levantamento daquele lote. Isso pode fazer a equipe acreditar que falta comprar material que já foi pedido — ou comprar em duplicidade.</p></Callout>
        <Shot src={`${IMG}/lotes-01-lista.png`} alt="Tela real da lista de lotes" caption="No momento da captura não havia lotes cadastrados no ambiente; a tela mostra o estado real atual." />
      </section>

      <section id="origem" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">2. Antes de vincular</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-text-2">
          <li>O lote precisa existir na obra; ele não é criado pela tela de Compras.</li>
          <li>O pedido e o lote precisam pertencer à mesma obra.</li>
          <li>Um pedido só aparece em “Vincular pedido existente” quando ainda não possui lote.</li>
          <li>Para acompanhar cobertura, o lote precisa ter contexto de Compras e necessidades de material.</li>
        </ul>
      </section>

      <section id="vincular" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">3. Vincular um pedido existente</h2>
        <Steps items={[
          <>Acesse <strong className="text-text">Compras → Lotes</strong> e abra o lote correto.</>,
          <>Se aparecer a mensagem de que ainda não existe contexto, clique em <strong className="text-text">Preparar contexto de Compras</strong>.</>,
          <>Desça até <strong className="text-text">Vincular pedido existente (sem lote, mesma obra)</strong>.</>,
          <>Confirme número, fornecedor e status; clique em <strong className="text-text">Vincular a este lote</strong>.</>,
          <>Confira se o pedido passou para “Pedidos vinculados” e se a cobertura das necessidades foi recalculada.</>,
        ]} />
      </section>

      <section id="gerar" className="mb-8 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">4. Gerar pedido pelo levantamento</h2>
        <Steps items={[
          <>No lote, revise as necessidades ativas e a criticidade.</>,
          <>Clique em <strong className="text-text">Gerar pedido a partir do levantamento</strong>.</>,
          <>Escolha somente as necessidades que serão compradas naquele fornecedor.</>,
          <>Complete os dados comerciais e salve. O novo pedido já nasce relacionado ao lote.</>,
        ]} />
        <Callout tone="warn"><p>Não vincule um pedido apenas porque os produtos parecem semelhantes. Confirme obra, lote e levantamento: a vinculação altera os indicadores de cobertura e planejamento.</p></Callout>
      </section>
    </GuiaLayout>
  );
}

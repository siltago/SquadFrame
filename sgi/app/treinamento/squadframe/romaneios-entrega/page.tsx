import { Callout, GuiaLayout, Shot, Steps } from "@/modules/squadframe/components/treinamento/ui";

export const dynamic = "force-dynamic";
const IMG = "/treinamento/processos-compras";

export default function RomaneiosEntregaPage() {
  return (
    <GuiaLayout backHref="/treinamento/squadframe" backLabel="← Guias SquadFrame" kicker="Treinamento · Compras" titulo="Romaneios de entrega" descricao="Como cadastrar o documento de entrega, revisar a leitura automática e relacionar os pedidos corretos. Romaneio é independente de lotes." toc={[{ href: "#objetivo", label: "O que registra" }, { href: "#cadastrar", label: "Cadastrar" }, { href: "#efeitos", label: "Efeitos" }, { href: "#consultar", label: "Consultar" }]}>
      <section id="objetivo" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">1. O que o romaneio registra</h2>
        <p className="mt-2 text-text-2">O romaneio guarda o PDF recebido, número do documento, fornecedor, data de entrega e os pedidos citados nele.</p>
        <Callout><p><strong>Importância:</strong> centraliza a evidência da entrega, facilita localizar quais pedidos vieram juntos e atualiza o prazo de entrega dos pedidos vinculados.</p></Callout>
        <Shot src={`${IMG}/romaneios-01-lista.png`} alt="Lista real de romaneios" />
      </section>

      <section id="cadastrar" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">2. Cadastrar um romaneio</h2>
        <Steps items={[
          <>Acesse <strong className="text-text">Compras → Romaneios</strong> e clique em <strong className="text-text">Novo romaneio</strong>.</>,
          <>Selecione o PDF e clique em <strong className="text-text">Ler romaneio</strong>.</>,
          <>Revise o número e a data identificados. Corrija-os quando a leitura estiver incompleta.</>,
          <>Confira o fornecedor. Se não for reconhecido, selecione-o manualmente.</>,
          <>Revise cada pedido marcado. Desmarque qualquer coincidência numérica que não pertença ao documento.</>,
          <>Confirme somente depois de existir ao menos um pedido correto selecionado.</>,
        ]} />
        <Shot src={`${IMG}/romaneios-02-novo.png`} alt="Tela real para enviar PDF de romaneio" />
      </section>

      <section id="efeitos" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">3. O que acontece ao confirmar</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-text-2">
          <li>O PDF fica armazenado junto ao registro do romaneio.</li>
          <li>Os pedidos selecionados ficam vinculados ao documento.</li>
          <li>A data de entrega informada atualiza o prazo de entrega dos pedidos vinculados.</li>
          <li>O romaneio não substitui o registro das quantidades recebidas.</li>
          <li>O romaneio não altera sozinho o pedido para Recebido ou Finalizado.</li>
        </ul>
        <Callout tone="warn"><p>Vincular o pedido errado também pode alterar o prazo errado. Sempre confira fornecedor, número do pedido e obra antes de confirmar.</p></Callout>
      </section>

      <section id="consultar" className="mb-8 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">4. Consultar depois</h2>
        <p className="mt-2 text-text-2">Abra o número na lista de romaneios para consultar o arquivo, fornecedor, data e todos os pedidos vinculados.</p>
        <Shot src={`${IMG}/romaneios-03-detalhe.png`} alt="Detalhe real de um romaneio e seus pedidos" />
      </section>
    </GuiaLayout>
  );
}

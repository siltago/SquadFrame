import { Callout, GuiaLayout, Pill, Shot, Steps } from "@/modules/squadframe/components/treinamento/ui";

export const dynamic = "force-dynamic";
const IMG = "/treinamento/processos-compras";

export default function BeneficiamentoPage() {
  return (
    <GuiaLayout backHref="/treinamento/squadframe" backLabel="← Guias SquadFrame" kicker="Treinamento · Compras" titulo="Beneficiamento" descricao="Como enviar perfis comprados na cor natural para pintura e acompanhar esse processo. Beneficiamento não é uma etapa do faturamento direto." toc={[{ href: "#quando", label: "Quando usar" }, { href: "#preparar", label: "Pré-requisitos" }, { href: "#criar", label: "Criar" }, { href: "#acompanhar", label: "Etapas" }]}>
      <section id="quando" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">1. Quando usar</h2>
        <p className="mt-2 text-text-2">Use quando um pedido já emitido contém perfil na cor <strong>NATURAL</strong> e parte ou todo esse material será enviado a um fornecedor que realiza beneficiamento.</p>
        <Callout><p><strong>Importância:</strong> o processo liga o perfil cru ao produto pintado, cria o pedido de pintura e registra se o material passou pela fábrica ou foi direto ao beneficiador.</p></Callout>
        <Shot src={`${IMG}/beneficiamento-01-lista.png`} alt="Lista real de beneficiamentos" />
      </section>

      <section id="preparar" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">2. Pré-requisitos</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-text-2">
          <li>O pedido de origem deve estar emitido ou em uma etapa posterior aceita pelo sistema.</li>
          <li>Ele precisa conter pelo menos um perfil com cor RAL cadastrada como NATURAL.</li>
          <li>O fornecedor de pintura deve estar ativo e marcado como “faz beneficiamento”.</li>
          <li>Cada item natural precisa ser relacionado a um produto pintado existente ou cadastrado durante o processo.</li>
        </ul>
      </section>

      <section id="criar" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">3. Criar</h2>
        <Steps items={[
          <>No pedido de origem, clique em <strong className="text-text">Criar beneficiamento</strong>, ou acesse <strong className="text-text">Beneficiamento → Novo</strong>.</>,
          <>Selecione o pedido de origem. O sistema mostra apenas os itens naturais elegíveis.</>,
          <>Marque os itens, ajuste as quantidades e escolha o produto pintado correspondente.</>,
          <>Selecione o fornecedor de beneficiamento e a forma de pagamento do pedido de pintura.</>,
          <>Escolha a rota: <strong className="text-text">Via fábrica</strong> quando o material chega antes ao estoque; <strong className="text-text">Direto do fornecedor</strong> quando segue diretamente para pintura.</>,
          <>Revise e clique em <strong className="text-text">Criar beneficiamento</strong>.</>,
        ]} />
        <Shot src={`${IMG}/beneficiamento-02-novo.png`} alt="Tela real de novo beneficiamento" caption="Na captura atual não havia pedido elegível; a própria tela mostra os requisitos necessários." />
      </section>

      <section id="acompanhar" className="mb-8 scroll-mt-24">
        <h2 className="text-xl font-bold text-text">4. Acompanhar etapas</h2>
        <div className="mt-4 space-y-3 text-text-2">
          <p><Pill tone="amber">Aguard. Envio</Pill> — criado, mas o material ainda não saiu para o beneficiador.</p>
          <p><Pill tone="blue">Enviado</Pill> — material despachado; registre esta etapa no momento da saída real.</p>
          <p><Pill tone="green">Concluído</Pill> — pintura concluída e processo encerrado.</p>
          <p><Pill tone="gray">Cancelado</Pill> — processo interrompido e que não deve prosseguir.</p>
        </div>
        <Callout tone="warn"><p>A forma de pagamento do pedido de pintura pode até ser faturamento direto, mas isso não transforma beneficiamento em parte do processo financeiro. São registros independentes, com objetivos e permissões diferentes.</p></Callout>
      </section>
    </GuiaLayout>
  );
}

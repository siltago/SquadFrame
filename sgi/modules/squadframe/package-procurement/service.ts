import "server-only";

import * as repo from "./repository";
import { calcularBarras } from "./lib/otimizacao-corte";
import type {
  WisePacoteCompras, WiseNecessidade, StatusSuprimentosCalculado, ResultadoServico,
  CoberturaNecessidade, PedidoItemDisponivel, SolicitacaoItemDisponivel, RecebimentoItemDisponivel,
  ItemXmlParaResolver, ResolucaoImportacaoXml, DecisaoItemXml,
} from "./types";

const KERF_MM = 5;
const COMPRIMENTO_BARRA_PADRAO_MM = 6000;

export async function obterContexto(pacoteId: string): Promise<WisePacoteCompras | null> {
  return repo.buscarContexto(pacoteId);
}

export async function listarNecessidades(pacoteId: string): Promise<WiseNecessidade[]> {
  return repo.listarNecessidades(pacoteId);
}

// Cobertura por necessidade — solicitado/pedido/recebido nunca somados
// entre si (seção 16.1 do documento mestre: são níveis diferentes do
// mesmo funil, não quantidades adicionais).
export async function obterCobertura(necessidades: WiseNecessidade[]): Promise<CoberturaNecessidade[]> {
  const ativas = necessidades.filter((n) => n.estado_administrativo === "ATIVA");
  const ids = ativas.map((n) => n.id);
  if (!ids.length) return [];

  const [alocSol, alocPed] = await Promise.all([
    repo.listarAlocacoesSolicitacao(ids),
    repo.listarAlocacoesPedido(ids),
  ]);
  const alocRec = await repo.listarAlocacoesRecebimento(alocPed.map((a) => a.id));

  const solicitadoPorNecessidade = new Map<string, number>();
  for (const a of alocSol) {
    solicitadoPorNecessidade.set(a.necessidade_id, (solicitadoPorNecessidade.get(a.necessidade_id) ?? 0) + a.quantidade_alocada);
  }

  const pedidoPorNecessidade = new Map<string, number>();
  const necessidadePorAlocacaoPedido = new Map<string, string>();
  for (const a of alocPed) {
    pedidoPorNecessidade.set(a.necessidade_id, (pedidoPorNecessidade.get(a.necessidade_id) ?? 0) + a.quantidade_alocada);
    necessidadePorAlocacaoPedido.set(a.id, a.necessidade_id);
  }

  const recebidoPorNecessidade = new Map<string, number>();
  for (const a of alocRec) {
    const necessidadeId = necessidadePorAlocacaoPedido.get(a.pedido_item_alocacao_id);
    if (!necessidadeId) continue;
    recebidoPorNecessidade.set(necessidadeId, (recebidoPorNecessidade.get(necessidadeId) ?? 0) + a.quantidade_alocada);
  }

  return ativas.map((n) => ({
    necessidade_id: n.id,
    quantidade_necessaria: n.quantidade_necessaria,
    solicitado: solicitadoPorNecessidade.get(n.id) ?? 0,
    pedido: pedidoPorNecessidade.get(n.id) ?? 0,
    recebido: recebidoPorNecessidade.get(n.id) ?? 0,
  }));
}

// Status calculado do contexto — nunca persistido, sempre derivado
// (seção 13.4/16.17 do documento mestre). Precedência: recebido >
// pedido > sem necessidade — não reusa status de necessidade
// individual, é uma leitura agregada do pacote inteiro.
export function calcularStatusSuprimentos(
  necessidades: WiseNecessidade[],
  cobertura: CoberturaNecessidade[],
): StatusSuprimentosCalculado {
  const ativas = necessidades.filter((n) => n.estado_administrativo === "ATIVA");
  if (ativas.length === 0) return "SEM_NECESSIDADES";

  const porNecessidade = new Map(cobertura.map((c) => [c.necessidade_id, c]));
  const todasRecebidas = ativas.every((n) => (porNecessidade.get(n.id)?.recebido ?? 0) >= n.quantidade_necessaria);
  if (todasRecebidas) return "MATERIAL_RECEBIDO";

  const algumaRecebida = ativas.some((n) => (porNecessidade.get(n.id)?.recebido ?? 0) > 0);
  if (algumaRecebida) return "RECEBIMENTO_PARCIAL";

  const todasPedidas = ativas.every((n) => (porNecessidade.get(n.id)?.pedido ?? 0) >= n.quantidade_necessaria);
  if (todasPedidas) return "PEDIDOS_EMITIDOS";

  const algumaPedida = ativas.some((n) => (porNecessidade.get(n.id)?.pedido ?? 0) > 0);
  if (algumaPedida) return "COMPRA_PARCIAL";

  return "PENDENTE_DE_COMPRA";
}

export async function ensureContexto(pacoteId: string, usuarioId: string): Promise<ResultadoServico<string>> {
  try {
    const contextoId = await repo.ensureContexto(pacoteId, usuarioId);
    return { ok: true, dados: contextoId };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível preparar o contexto de Compras" };
  }
}

export async function adicionarNecessidade(dados: {
  pacote_id: string;
  usuario_id: string;
  produto_id?: string | null;
  descricao_livre?: string | null;
  quantidade: number;
  unidade: string;
  criticidade?: string;
  etapa_necessaria?: string | null;
}): Promise<ResultadoServico<string>> {
  if (!dados.produto_id && !dados.descricao_livre?.trim()) {
    return { ok: false, erro: "Informe um produto do catálogo ou uma descrição" };
  }
  if (!dados.quantidade || dados.quantidade <= 0) {
    return { ok: false, erro: "Quantidade necessária deve ser maior que zero" };
  }
  if (!dados.unidade?.trim()) {
    return { ok: false, erro: "Unidade é obrigatória" };
  }

  try {
    const id = await repo.adicionarNecessidade({
      pacote_id: dados.pacote_id,
      usuario_id: dados.usuario_id,
      produto_id: dados.produto_id ?? null,
      descricao_livre: dados.descricao_livre?.trim() || null,
      quantidade: dados.quantidade,
      unidade: dados.unidade.trim(),
      criticidade: dados.criticidade ?? "NORMAL",
      etapa_necessaria: dados.etapa_necessaria ?? null,
    });
    return { ok: true, dados: id };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível criar a necessidade" };
  }
}

// Import de necessidades a partir do XML (COMPONENTES + PERFIS já
// filtrados e agregados pelo parser — ver lib/xml-necessidades.ts).
// Cada código é resolvido contra o catálogo mestre (produtos.codigo_mestre
// direto, depois produto_aliases) antes de virar necessidade — só o que
// não bate com nada vai pra revisão manual do usuário.
export async function resolverCodigosImportados(itens: ItemXmlParaResolver[]): Promise<ResolucaoImportacaoXml> {
  const fornecedorId = await repo.buscarFornecedorPreferenceId();

  const resolvidos: ResolucaoImportacaoXml["resolvidos"] = [];
  const pendentes: ResolucaoImportacaoXml["pendentes"] = [];
  let ignorados = 0;

  for (const item of itens) {
    const porCodigoMestre = await repo.buscarProdutoPorCodigoMestre(item.codigo);
    const produto = porCodigoMestre ?? (await repo.buscarProdutoPorAlias(item.codigo));
    if (produto) {
      resolvidos.push({
        ...item, status: "resolvido",
        produto_id: produto.id, produto_codigo_mestre: produto.codigo_mestre,
        produto_nome: produto.nome, tamanho_mm: produto.tamanho_mm,
      });
      continue;
    }
    if (await repo.codigoEstaIgnorado(fornecedorId, item.codigo)) {
      ignorados++;
      continue;
    }
    pendentes.push({ ...item, status: "pendente" });
  }

  return { resolvidos, pendentes, ignorados };
}

export async function confirmarImportacaoXml(
  pacoteId: string,
  usuarioId: string,
  decisoes: DecisaoItemXml[],
): Promise<ResultadoServico<{ criadas: number; ignoradas: number }>> {
  if (!decisoes.length) return { ok: false, erro: "Nenhum item para confirmar." };
  const fornecedorId = await repo.buscarFornecedorPreferenceId();

  try {
    let criadas = 0;
    let ignoradasCount = 0;

    for (const item of decisoes) {
      if (!item.incluir) {
        await repo.marcarCodigoIgnorado(fornecedorId, item.codigo, usuarioId);
        ignoradasCount++;
        continue;
      }
      if (!item.produto_id) {
        throw new Error(`Item "${item.codigo}" está marcado pra incluir mas não tem produto resolvido.`);
      }
      if (item.precisa_criar_alias) {
        await repo.criarAliasParaCodigo(item.produto_id, item.codigo, fornecedorId);
      }

      const quantidade = item.origem === "perfil"
        ? calcularBarras(item.cortesMm, item.tamanho_mm ?? COMPRIMENTO_BARRA_PADRAO_MM, KERF_MM).barras
        : item.quantidade;
      const unidade = item.origem === "perfil" ? "barra" : item.unidade;

      await repo.adicionarNecessidade({
        pacote_id: pacoteId,
        usuario_id: usuarioId,
        produto_id: item.produto_id,
        descricao_livre: null,
        quantidade,
        unidade,
        criticidade: "NORMAL",
        etapa_necessaria: null,
      });
      criadas++;
    }

    return { ok: true, dados: { criadas, ignoradas: ignoradasCount } };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível importar as necessidades." };
  }
}

export async function listarLinhas(): Promise<{ id: string; nome: string; tipo: string }[]> {
  return repo.listarLinhas();
}

export async function criarProdutoRapido(dados: {
  linha_id: string;
  codigo_mestre: string;
  nome_tecnico: string;
  unidade?: string;
  tamanho_mm?: number | null;
}): Promise<{ id: string; codigo_mestre: string; nome: string; ja_existia: boolean }> {
  return repo.criarProdutoRapido(dados);
}

export async function criarLinhaRapida(dados: { nome: string; tipo: string }): Promise<{ id: string; nome: string; tipo: string; ja_existia: boolean }> {
  return repo.criarLinhaRapida(dados);
}

export async function listarTiposLinha(): Promise<{ nome: string; slug: string }[]> {
  return repo.listarTiposLinha();
}

export async function cancelarNecessidade(
  necessidadeId: string,
  usuarioId: string,
  motivo: string,
): Promise<ResultadoServico> {
  if (!motivo?.trim()) return { ok: false, erro: "Motivo do cancelamento é obrigatório" };
  try {
    await repo.cancelarNecessidade(necessidadeId, usuarioId, motivo.trim());
    return { ok: true, dados: undefined };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível cancelar a necessidade" };
  }
}

export async function bloquearContexto(
  pacoteId: string,
  usuarioId: string,
  motivo: string,
): Promise<ResultadoServico> {
  if (!motivo?.trim()) return { ok: false, erro: "Motivo do bloqueio é obrigatório" };
  try {
    await repo.bloquearContexto(pacoteId, usuarioId, motivo.trim());
    return { ok: true, dados: undefined };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível bloquear o contexto" };
  }
}

export async function desbloquearContexto(pacoteId: string, usuarioId: string): Promise<ResultadoServico> {
  try {
    await repo.desbloquearContexto(pacoteId, usuarioId);
    return { ok: true, dados: undefined };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível desbloquear o contexto" };
  }
}

// ── Alocações (Bloco B) ──────────────────────────────────────

export async function listarItensPedidoDoPacote(pacoteId: string): Promise<PedidoItemDisponivel[]> {
  return repo.listarItensPedidoDoPacote(pacoteId);
}

export async function alocarItemPedido(dados: {
  pedido_item_id: string;
  necessidade_id: string;
  quantidade: number;
  usuario_id: string;
  // Compra direta (sem solicitação vinculada) exige justificativa.
  // Origem SOLICITACAO exige o id da alocação de solicitação de origem.
  solicitacao_item_alocacao_id?: string | null;
  justificativa?: string | null;
}): Promise<ResultadoServico<string>> {
  if (!dados.quantidade || dados.quantidade <= 0) {
    return { ok: false, erro: "Quantidade deve ser maior que zero" };
  }
  const origem: "SOLICITACAO" | "COMPRA_DIRETA" = dados.solicitacao_item_alocacao_id ? "SOLICITACAO" : "COMPRA_DIRETA";
  if (origem === "COMPRA_DIRETA" && !dados.justificativa?.trim()) {
    return { ok: false, erro: "Justificativa é obrigatória (compra direta, sem solicitação vinculada)" };
  }
  try {
    const id = await repo.alocarItemPedido({
      pedido_item_id: dados.pedido_item_id,
      necessidade_id: dados.necessidade_id,
      quantidade: dados.quantidade,
      origem,
      solicitacao_item_alocacao_id: dados.solicitacao_item_alocacao_id ?? null,
      justificativa: origem === "COMPRA_DIRETA" ? (dados.justificativa?.trim() ?? null) : null,
      usuario_id: dados.usuario_id,
    });
    return { ok: true, dados: id };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível alocar o item do pedido" };
  }
}

export async function cancelarAlocacaoPedido(id: string, usuarioId: string, motivo: string): Promise<ResultadoServico> {
  if (!motivo?.trim()) return { ok: false, erro: "Motivo do cancelamento é obrigatório" };
  try {
    await repo.cancelarAlocacaoPedido(id, usuarioId, motivo.trim());
    return { ok: true, dados: undefined };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível cancelar a alocação" };
  }
}

export async function listarItensSolicitacaoDoPacote(pacoteId: string): Promise<SolicitacaoItemDisponivel[]> {
  return repo.listarItensSolicitacaoDoPacote(pacoteId);
}

export async function alocarItemSolicitacao(dados: {
  solicitacao_item_id: string;
  necessidade_id: string;
  quantidade: number;
  usuario_id: string;
}): Promise<ResultadoServico<string>> {
  if (!dados.quantidade || dados.quantidade <= 0) {
    return { ok: false, erro: "Quantidade deve ser maior que zero" };
  }
  try {
    const id = await repo.alocarItemSolicitacao(dados);
    return { ok: true, dados: id };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível alocar o item da solicitação" };
  }
}

export async function cancelarAlocacaoSolicitacao(id: string, usuarioId: string, motivo: string): Promise<ResultadoServico> {
  if (!motivo?.trim()) return { ok: false, erro: "Motivo do cancelamento é obrigatório" };
  try {
    await repo.cancelarAlocacaoSolicitacao(id, usuarioId, motivo.trim());
    return { ok: true, dados: undefined };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível cancelar a alocação" };
  }
}

export async function listarRecebimentosDaNecessidade(necessidadeId: string): Promise<RecebimentoItemDisponivel[]> {
  return repo.listarRecebimentosDaNecessidade(necessidadeId);
}

export async function alocarItemRecebimento(dados: {
  recebimento_item_id: string;
  pedido_item_alocacao_id: string;
  quantidade: number;
  usuario_id: string;
}): Promise<ResultadoServico<string>> {
  if (!dados.quantidade || dados.quantidade <= 0) {
    return { ok: false, erro: "Quantidade deve ser maior que zero" };
  }
  try {
    const id = await repo.alocarItemRecebimento(dados);
    return { ok: true, dados: id };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível alocar o recebimento" };
  }
}

export async function estornarAlocacaoRecebimento(id: string, usuarioId: string, motivo: string): Promise<ResultadoServico> {
  if (!motivo?.trim()) return { ok: false, erro: "Motivo do estorno é obrigatório" };
  try {
    await repo.estornarAlocacaoRecebimento(id, usuarioId, motivo.trim());
    return { ok: true, dados: undefined };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível estornar o recebimento" };
  }
}

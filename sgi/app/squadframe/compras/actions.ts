// Barrel de re-exports — mantém compatibilidade com todos os imports existentes.
// "use server" não pode estar aqui: barrel files não suportam re-exports com essa diretiva.
// Cada arquivo em ./actions/* já declara "use server" individualmente.

export {
  criarSolicitacao,
  alterarStatusSolicitacao,
  excluirSolicitacoes,
} from "@/modules/squadframe/actions/compras/solicitacoes";

export {
  criarPedido,
  alterarStatusPedido,
  editarPedido,
  adicionarAnotacao,
  excluirPedidos,
  registrarValorFinal,
  confirmarDebitoPedido,
  atualizarPrazoEntrega,
} from "@/modules/squadframe/actions/compras/pedidos";

export { registrarRecebimento } from "@/modules/squadframe/actions/compras/recebimentos";

export {
  obterUrlUploadDocumento,
  registrarDocumento,
  excluirDocumento,
  gerarUrlDownload,
} from "@/modules/squadframe/actions/compras/documentos";

export {
  criarFormaPagamento,
  alterarFormaPagamento,
  criarFornecedor,
  editarFornecedor,
  excluirFornecedores,
  excluirFormasPagamento,
} from "@/modules/squadframe/actions/compras/fornecedores";

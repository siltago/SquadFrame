// Barrel de re-exports — mantém compatibilidade com todos os imports existentes.
// "use server" não pode estar aqui: barrel files não suportam re-exports com essa diretiva.
// Cada arquivo em ./actions/* já declara "use server" individualmente.

export {
  criarSolicitacao,
  alterarStatusSolicitacao,
  excluirSolicitacoes,
} from "./actions/solicitacoes";

export {
  criarPedido,
  alterarStatusPedido,
  editarPedido,
  adicionarAnotacao,
  excluirPedidos,
} from "./actions/pedidos";

export { registrarRecebimento } from "./actions/recebimentos";

export {
  obterUrlUploadDocumento,
  registrarDocumento,
  excluirDocumento,
  gerarUrlDownload,
} from "./actions/documentos";

export {
  criarFormaPagamento,
  alterarFormaPagamento,
  criarFornecedor,
  editarFornecedor,
  excluirFornecedores,
  excluirFormasPagamento,
} from "./actions/fornecedores";

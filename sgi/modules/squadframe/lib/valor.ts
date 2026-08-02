// Aceita formato brasileiro (1.234,56): remove separador de milhar antes
// de trocar a vírgula decimal por ponto. Sem isso, "1.234,56" vira "1.234"
// (perde os centavos e trunca o valor) — bug real que existia na versão
// mais simples usada em devolucao-pedido-form.tsx.
export function parseValorBr(valor: string): number {
  return parseFloat(
    valor.replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".")
  );
}

// Primeira letra de cada palavra maiúscula, resto minúsculo — mesma regra
// aplicada na normalização em massa de linhas.nome (migration
// 20260901000005). Siglas conhecidas do catálogo (marcas/fornecedores
// abreviados) continuam em caixa alta em vez de virar "Sms"/"Isa" etc.
const SIGLAS = ["SMS", "ISA", "IZA", "ACM"];

export function tituloComSiglas(texto: string): string {
  return texto
    .split(/(\s+)/)
    .map((parte) => {
      if (/^\s+$/.test(parte) || parte === "") return parte;
      const sigla = SIGLAS.find((s) => s.toLowerCase() === parte.toLowerCase());
      if (sigla) return sigla;
      return parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase();
    })
    .join("");
}

// Otimização de corte 1D (cutting stock) por First Fit Decreasing —
// dado uma lista de cortes necessários e o comprimento da barra
// comercial, calcula quantas barras inteiras precisam ser compradas.
// Kerf (perda de serra) é descontado só ENTRE cortes na mesma barra,
// nunca antes do primeiro corte daquela barra.

export type ResultadoCorte = {
  barras: number;
  sobras: number[]; // sobra restante em cada barra usada, na ordem de abertura
};

export function calcularBarras(
  cortesMm: number[],
  comprimentoBarraMm: number,
  kerfMm: number,
): ResultadoCorte {
  if (!(comprimentoBarraMm > 0)) {
    throw new Error("Comprimento de barra inválido.");
  }

  const cortesValidos = cortesMm.filter((c) => c > 0);
  const corteInvalido = cortesValidos.find((c) => c > comprimentoBarraMm);
  if (corteInvalido !== undefined) {
    throw new Error(
      `Corte de ${corteInvalido}mm é maior que a barra de ${comprimentoBarraMm}mm.`
    );
  }
  if (cortesValidos.length === 0) {
    return { barras: 0, sobras: [] };
  }

  const ordenados = [...cortesValidos].sort((a, b) => b - a);
  const barras: { restante: number; temCorte: boolean }[] = [];

  for (const corte of ordenados) {
    let colocado = false;
    for (const barra of barras) {
      const necessario = corte + (barra.temCorte ? kerfMm : 0);
      if (barra.restante >= necessario) {
        barra.restante -= necessario;
        barra.temCorte = true;
        colocado = true;
        break;
      }
    }
    if (!colocado) {
      barras.push({ restante: comprimentoBarraMm - corte, temCorte: true });
    }
  }

  return { barras: barras.length, sobras: barras.map((b) => b.restante) };
}

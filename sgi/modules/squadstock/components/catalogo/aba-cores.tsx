type CorRal = { id: string; codigo_ral: string; nome: string | null; hex: string | null };
type Acabamento = { id: string; nome: string };
type ProdutoCor = {
  cor: CorRal | null;
  acabamento: Acabamento | null;
};

// Só leitura — o vínculo produto×cor é sempre automático pelo tipo da
// linha (ver vincularCorATodosProdutosDosTipos em actions.ts, disparado
// ao criar o produto e ao criar/editar uma cor RAL). Não existe mais
// vínculo manual por produto.
export function AbaCores({ cores }: { cores: ProdutoCor[] }) {
  return (
    <div className="mt-6 space-y-4">
      {cores.length > 0 ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                <th className="w-10 px-4 py-2.5" />
                <th className="px-4 py-2.5 font-medium">Cor RAL</th>
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Acabamento</th>
              </tr>
            </thead>
            <tbody>
              {cores.map((c) => (
                <tr key={c.cor?.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-2">
                    <span
                      className="inline-block h-6 w-6 rounded border border-border"
                      style={{ backgroundColor: c.cor?.hex ?? "#e5e7eb" }}
                    />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">{c.cor?.codigo_ral ?? "—"}</td>
                  <td className="px-4 py-2.5 text-text-2">{c.cor?.nome ?? "—"}</td>
                  <td className="px-4 py-2.5 text-text-2">{c.acabamento?.nome ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-sm text-text-3">
            Nenhuma cor RAL cadastrada ainda pro tipo deste produto.
          </p>
        </div>
      )}
    </div>
  );
}

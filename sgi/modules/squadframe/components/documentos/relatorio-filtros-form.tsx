import { STATUS_PED_LABEL, type StatusPedido } from "@/modules/squadframe/types/compras";
import { Button } from "@/ui/components/Button";

interface RelatorioFiltrosFormProps {
  action: (formData: FormData) => void;
  obras: { id: string; nome: string }[];
  fornecedores: { id: string; nome: string }[];
  valoresIniciais?: {
    nome?: string;
    dataInicio?: string;
    dataFim?: string;
    obraId?: string;
    fornecedorId?: string;
    status?: StatusPedido;
  };
  tituloSubmit: string;
}

function primeiroDiaDoMes(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RelatorioFiltrosForm({
  action,
  obras,
  fornecedores,
  valoresIniciais,
  tituloSubmit,
}: RelatorioFiltrosFormProps) {
  return (
    <form action={action} className="mt-6 space-y-5 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Nome do relatório</label>
        <input
          type="text"
          name="nome"
          required
          defaultValue={valoresIniciais?.nome ?? ""}
          placeholder="Ex.: Compras do 1º trimestre"
          className="field w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Data início</label>
          <input
            type="date"
            name="data_inicio"
            required
            defaultValue={valoresIniciais?.dataInicio ?? primeiroDiaDoMes()}
            className="field w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Data fim</label>
          <input
            type="date"
            name="data_fim"
            required
            defaultValue={valoresIniciais?.dataFim ?? hojeISO()}
            className="field w-full"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Obra (opcional)</label>
        <select name="obra_id" defaultValue={valoresIniciais?.obraId ?? ""} className="field w-full">
          <option value="">Todas as obras</option>
          {obras.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Fornecedor (opcional)</label>
        <select name="fornecedor_id" defaultValue={valoresIniciais?.fornecedorId ?? ""} className="field w-full">
          <option value="">Todos os fornecedores</option>
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">Status (opcional)</label>
        <select name="status" defaultValue={valoresIniciais?.status ?? ""} className="field w-full">
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_PED_LABEL) as StatusPedido[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_PED_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit">{tituloSubmit}</Button>
      </div>
    </form>
  );
}

import Link from "next/link";
import { Button } from "@/ui/components/Button";

type Obra = {
  cliente?: { nome: string | null } | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  data_prevista?: string | null;
  observacoes?: string | null;
};

function Campo({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-3">{rotulo}</dt>
      <dd className="mt-0.5 font-medium text-text">{valor || "—"}</dd>
    </div>
  );
}

export function ConfigTab({ obraId, obra, podeEditar }: { obraId: string; obra: Obra; podeEditar: boolean }) {
  return (
    <div className="mt-6">
      <div className="card max-w-2xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-2">
            Dados da obra
          </h2>
          {podeEditar && (
            <Button as="a" href={`/squadframe/obras/${obraId}/editar`} variant="ghost" className="text-sm">
              Editar
            </Button>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
          <Campo rotulo="Cliente"     valor={obra.cliente?.nome} />
          <Campo rotulo="Endereço"    valor={obra.endereco} />
          <Campo rotulo="Cidade / UF" valor={obra.cidade ? `${obra.cidade}/${obra.estado ?? ""}` : null} />
          <Campo rotulo="CEP"         valor={obra.cep} />
          <Campo
            rotulo="Entrega prevista"
            valor={obra.data_prevista ? new Date(obra.data_prevista).toLocaleDateString("pt-BR") : null}
          />
          <div className="col-span-2">
            <Campo rotulo="Observações" valor={obra.observacoes} />
          </div>
        </dl>
      </div>
    </div>
  );
}

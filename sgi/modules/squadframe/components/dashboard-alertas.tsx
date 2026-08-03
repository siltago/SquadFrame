import Link from "next/link";
import { Alert } from "@/ui/components/Alert";

const MAX_CARTEIRAS_LISTADAS = 3;

interface CarteiraAlerta {
  fornecedor: string;
  saldo: number;
  qtdObras: number;
}

interface DashboardAlertasProps {
  qtdAtrasados: number;
  qtdSemPrazo: number;
  qtdParadosAprovacao: number;
  carteirasAlerta: CarteiraAlerta[];
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Destaques do dashboard inicial, agrupados num único card — só aparecem
// quando há algo que realmente precisa de ação; nenhum deles é decorativo.
// Atualiza sozinho via RealtimeRefresher (ver app/squadframe/page.tsx).
export function DashboardAlertas({ qtdAtrasados, qtdSemPrazo, qtdParadosAprovacao, carteirasAlerta }: DashboardAlertasProps) {
  if (qtdAtrasados === 0 && qtdSemPrazo === 0 && qtdParadosAprovacao === 0 && carteirasAlerta.length === 0) return null;

  return (
    <section className="card p-4 mb-6">
      <h2 className="text-sm font-semibold text-text-2 mb-3">Destaques</h2>
      <div className="flex flex-col gap-3">
        {qtdAtrasados > 0 && (
          <Alert variant="danger" title={`${qtdAtrasados} pedido${qtdAtrasados !== 1 ? "s" : ""} com entrega atrasada`}>
            O prazo combinado já passou — vale cobrar o fornecedor.{" "}
            <Link href="/squadframe/compras/pedidos?status=AGUARDANDO_RECEBIMENTO&atraso=1" className="font-semibold underline">
              Ver pedidos
            </Link>
          </Alert>
        )}
        {qtdSemPrazo > 0 && (
          <Alert variant="warning" title={`${qtdSemPrazo} pedido${qtdSemPrazo !== 1 ? "s" : ""} aguardando recebimento sem data de entrega`}>
            Sem prazo cadastrado não dá pra saber se está atrasado — vale completar com o fornecedor.{" "}
            <Link href="/squadframe/compras/pedidos?status=AGUARDANDO_RECEBIMENTO" className="font-semibold underline">
              Ver pedidos
            </Link>
          </Alert>
        )}
        {qtdParadosAprovacao > 0 && (
          <Alert variant="warning" title={`${qtdParadosAprovacao} pedido${qtdParadosAprovacao !== 1 ? "s" : ""} aguardando aprovação há mais de 3 dias`}>
            Parados sem decisão — vale revisar antes que virem gargalo.{" "}
            <Link href="/squadframe/compras/pedidos?status=AGUARDANDO_APROVACAO" className="font-semibold underline">
              Ver pedidos
            </Link>
          </Alert>
        )}
        {carteirasAlerta.length > 0 && (
          <Alert
            variant="danger"
            title={`${carteirasAlerta.length} fornecedor${carteirasAlerta.length !== 1 ? "es" : ""} com saldo zerado ou abaixo de 25% do total depositado`}
          >
            {carteirasAlerta
              .slice(0, MAX_CARTEIRAS_LISTADAS)
              .map((c) => `${c.fornecedor}${c.qtdObras > 1 ? ` (${c.qtdObras} obras)` : ""} — ${fmt(c.saldo)}`)
              .join(", ")}
            {carteirasAlerta.length > MAX_CARTEIRAS_LISTADAS && ` e mais ${carteirasAlerta.length - MAX_CARTEIRAS_LISTADAS}`}
            {" — "}
            <Link href="/squadframe/financeiro?aba=carteiras" className="font-semibold underline">
              Ver carteiras
            </Link>
          </Alert>
        )}
      </div>
    </section>
  );
}

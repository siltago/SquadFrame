"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/ui/components/Button";
import { PrintIcon, UploadIcon, CheckIcon, AlertTriangleIcon } from "@/ui/icons";
import { RealtimeRefresher } from "@/modules/squadframe/components/realtime-refresher";
import { registrarContagemItem, concluirContagem, cancelarContagem, anexarComprovante } from "@/modules/squadstock/actions/contagens";

export interface ItemContagem {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
  fotoUrl: string | null;
  caminhoLocal: string;
  obraNome: string | null;
  corLabel: string | null;
  quantidadeEsperada: number;
  quantidadeContada: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  ABERTA: "Aberta",
  EM_CONTAGEM: "Em contagem",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function LinhaItem({ item, editavel }: { item: ItemContagem; editavel: boolean }) {
  const router = useRouter();
  const [valor, setValor] = useState(item.quantidadeContada != null ? String(item.quantidadeContada) : "");
  const [pending, startTransition] = useTransition();
  const focado = useRef(false);

  // O router.refresh() do RealtimeRefresher troca os `item` da árvore
  // inteira, mas esse componente não desmonta (mesma key={item.id}) — sem
  // isso, quem já digitou algo aqui nunca veria a contagem de outra pessoa
  // chegando ao vivo no mesmo item. Só não resincroniza enquanto o campo
  // está focado (não pisa no que a própria pessoa está digitando agora).
  useEffect(() => {
    if (focado.current) return;
    setValor(item.quantidadeContada != null ? String(item.quantidadeContada) : "");
  }, [item.quantidadeContada]);

  function salvar() {
    const n = Number(valor);
    if (valor === "" || Number.isNaN(n) || n < 0) return;
    startTransition(async () => {
      await registrarContagemItem(item.id, n);
      router.refresh();
    });
  }

  const contado = item.quantidadeContada != null;
  const diverge = contado && Number(item.quantidadeContada) !== item.quantidadeEsperada;

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2">
        {item.fotoUrl ? (
          <img src={item.fotoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-surface-3" />
        )}
      </td>
      <td className="px-3 py-2">
        <div className="font-medium text-text">{item.nome}</div>
        <div className="text-xs text-text-3">
          {item.codigo} · {item.caminhoLocal}
          {item.obraNome ? ` · ${item.obraNome}` : ""}
          {item.corLabel ? ` · ${item.corLabel}` : ""}
        </div>
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-text-2">
        {fmt(item.quantidadeEsperada)} {item.unidade}
      </td>
      <td className="px-3 py-2 text-right">
        {editavel ? (
          <input
            type="number"
            step="0.001"
            min="0"
            value={valor}
            onFocus={() => { focado.current = true; }}
            onChange={(e) => setValor(e.target.value)}
            onBlur={() => { focado.current = false; salvar(); }}
            disabled={pending}
            className="field h-8 w-24 text-right tabular-nums"
            placeholder="—"
          />
        ) : (
          <span className="tabular-nums">{contado ? fmt(Number(item.quantidadeContada)) : "—"}</span>
        )}
      </td>
      <td className="w-8 px-3 py-2 text-center">
        {diverge && <AlertTriangleIcon size={14} className="mx-auto text-amber-500" />}
        {contado && !diverge && <CheckIcon size={14} className="mx-auto text-emerald-500" />}
      </td>
    </tr>
  );
}

export function ContagemDetalhe({
  contagemId,
  numero,
  modo,
  status,
  localRaizNome,
  criadoEm,
  concluidoEm,
  comprovanteUrl,
  itens,
  podeGerenciar,
}: {
  contagemId: string;
  numero: string;
  modo: string;
  status: string;
  localRaizNome: string;
  criadoEm: string;
  concluidoEm: string | null;
  comprovanteUrl: string | null;
  itens: ItemContagem[];
  podeGerenciar: boolean;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const aberta = status === "ABERTA" || status === "EM_CONTAGEM";
  const totalContados = itens.filter((i) => i.quantidadeContada != null).length;
  const totalDivergentes = itens.filter((i) => i.quantidadeContada != null && Number(i.quantidadeContada) !== i.quantidadeEsperada).length;

  function concluir() {
    if (totalContados === 0) {
      setErro("Conte pelo menos um item antes de concluir.");
      return;
    }
    if (!confirm(`Concluir contagem? ${totalDivergentes} item(ns) divergente(s) vão gerar ajuste de saldo.`)) return;
    setErro(null);
    startTransition(async () => {
      try {
        await concluirContagem(contagemId);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao concluir contagem.");
      }
    });
  }

  function cancelar() {
    if (!confirm("Cancelar essa contagem? Nenhum ajuste será gerado.")) return;
    startTransition(async () => {
      await cancelarContagem(contagemId);
      router.refresh();
    });
  }

  function enviarComprovante(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("arquivo", file);
    setErro(null);
    startTransition(async () => {
      try {
        await anexarComprovante(contagemId, fd);
        router.refresh();
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Falha ao enviar comprovante.");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  return (
    <div className="mt-3">
      <RealtimeRefresher
        channelName={`contagem-${contagemId}`}
        subs={[{ table: "stock_contagem_itens", filter: `contagem_id=eq.${contagemId}` }, { table: "stock_contagens", filter: `id=eq.${contagemId}` }]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{numero}</h1>
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-2">
              {STATUS_LABEL[status] ?? status}
            </span>
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-3">
              {modo}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-3">
            {localRaizNome} · criada em {new Date(criadoEm).toLocaleDateString("pt-BR")}
            {concluidoEm && ` · concluída em ${new Date(concluidoEm).toLocaleDateString("pt-BR")}`}
          </p>
        </div>

        {podeGerenciar && (
          <div className="flex flex-wrap items-center gap-2">
            {modo === "PAPEL" && (
              <Link href={`/squadstock/contagens/${contagemId}/folha`} target="_blank">
                <Button variant="secondary" size="sm">
                  <PrintIcon size={14} />
                  Imprimir folha
                </Button>
              </Link>
            )}
            {modo === "PAPEL" && aberta && (
              <>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={enviarComprovante} hidden />
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={pending}>
                  <UploadIcon size={14} />
                  Anexar comprovante
                </Button>
              </>
            )}
            {aberta && (
              <>
                <Button variant="secondary" size="sm" onClick={cancelar} disabled={pending}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={concluir} disabled={pending}>
                  {pending ? "Concluindo…" : "Concluir contagem"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {comprovanteUrl && (
        <a href={comprovanteUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-accent hover:underline">
          Ver comprovante anexado
        </a>
      )}

      {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}

      <p className="mt-4 text-xs text-text-3">
        {totalContados} de {itens.length} contados
        {totalDivergentes > 0 && ` · ${totalDivergentes} divergente${totalDivergentes !== 1 ? "s" : ""}`}
      </p>

      <div className="mt-2 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
              <th className="px-3 py-2 font-medium"></th>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 text-right font-medium">Esperado</th>
              <th className="px-3 py-2 text-right font-medium">Contado</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <LinhaItem key={item.id} item={item} editavel={podeGerenciar && aberta} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

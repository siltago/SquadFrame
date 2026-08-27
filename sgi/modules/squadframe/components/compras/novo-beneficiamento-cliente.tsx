"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarBeneficiamento } from "@/modules/squadframe/actions/compras/beneficiamentos";
import { Button } from "@/ui/components/Button";
import { Textarea } from "@/ui/components/Input";
import { LoadingOverlay } from "@/ui/components/LoadingOverlay";
import { useLoadingOverlay } from "@/ui/lib/use-loading-overlay";

type ProdutoOrigem = { id: string; codigo_mestre: string; nome: string; unidade: string; tamanho_mm: number | null; linha_id: string | null };
type ItemPedido = { id: string; quantidade_pedida: number; unidade: string; descricao_snapshot: string; produto: ProdutoOrigem | null };
type PedidoOrigem = { id: string; numero: string; obra_id: string | null; obra: { nome: string } | null; itens: ItemPedido[] };
type PedidoResumo = { id: string; numero: string; obra: { nome: string } | null };
type CorRal = { id: string; codigo_ral: string; nome: string | null; tipos: string[] | null };

type LinhaForm = {
  itemId: string;
  incluir: boolean;
  quantidade: number;
  corId: string | null;
};

export function NovoBeneficiamentoCliente({
  pedidoOrigem,
  pedidosElegiveis,
  fornecedores,
  formasPagamento,
  coresRal,
}: {
  pedidoOrigem: PedidoOrigem | null;
  pedidosElegiveis: PedidoResumo[];
  fornecedores: { id: string; nome: string }[];
  formasPagamento: { id: string; nome: string; is_faturamento_direto: boolean }[];
  coresRal: CorRal[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const { status: overlayStatus, run: runComOverlay } = useLoadingOverlay();

  const formaFaturamentoDireto = formasPagamento.find((f) => f.is_faturamento_direto);
  const coresPerfil = coresRal.filter((c) => (c.tipos ?? []).includes("PERFIL"));

  const [linhas, setLinhas] = useState<LinhaForm[]>(
    (pedidoOrigem?.itens ?? []).map((i) => ({
      itemId: i.id, incluir: true, quantidade: i.quantidade_pedida, corId: null,
    }))
  );

  function patch(itemId: string, fn: (l: LinhaForm) => LinhaForm) {
    setLinhas((prev) => prev.map((l) => (l.itemId === itemId ? fn(l) : l)));
  }

  // Sem pedido escolhido ainda — seletor.
  if (!pedidoOrigem) {
    return (
      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Pedido de origem (com perfil cor natural)</label>
          <select
            className="field h-9 text-sm w-full"
            defaultValue=""
            onChange={(e) => { if (e.target.value) router.push(`/squadframe/beneficiamento/novo?pedido_id=${e.target.value}`); }}
          >
            <option value="" disabled>Selecione…</option>
            {pedidosElegiveis.map((p) => (
              <option key={p.id} value={p.id}>{p.numero} {p.obra?.nome ? `— ${p.obra.nome}` : ""}</option>
            ))}
          </select>
          {pedidosElegiveis.length === 0 && (
            <p className="mt-2 text-xs text-text-3">
              Nenhum pedido elegível encontrado (precisa ter item de perfil cor natural e já ter sido emitido).
            </p>
          )}
        </div>
      </div>
    );
  }

  if (pedidoOrigem.itens.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-text-3">
        O pedido {pedidoOrigem.numero} não tem nenhum item de perfil cor natural.
      </div>
    );
  }

  function confirmar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);

    const incluidas = linhas.filter((l) => l.incluir);
    if (incluidas.length === 0) { setErro("Selecione ao menos um item."); return; }
    for (const l of incluidas) {
      if (!l.corId) { setErro("Todo item incluído precisa de uma cor de pintura selecionada."); return; }
      if (!(l.quantidade > 0)) { setErro("Quantidade precisa ser maior que zero."); return; }
    }

    const itens = incluidas.map((l) => {
      const itemOrigem = pedidoOrigem!.itens.find((i) => i.id === l.itemId)!;
      return {
        pedido_item_origem_id: l.itemId,
        produto_cru_id: itemOrigem.produto!.id,
        cor_id: l.corId,
        descricao_snapshot: `${itemOrigem.descricao_snapshot} (pintado)`,
        quantidade: l.quantidade,
        unidade: itemOrigem.unidade,
      };
    });

    fd.set("pedido_origem_id", pedidoOrigem!.id);
    fd.set("obra_id", pedidoOrigem!.obra_id ?? "");
    fd.set("itens", JSON.stringify(itens));

    startTransition(async () => {
      try {
        await runComOverlay(() => criarBeneficiamento(fd));
      } catch (err: any) {
        setErro(err.message ?? "Não foi possível criar o beneficiamento.");
      }
    });
  }

  return (
    <>
      {overlayStatus && (
        <LoadingOverlay status={overlayStatus} label={overlayStatus === "loading" ? "Enviando…" : "Feito!"} />
      )}
    <form onSubmit={confirmar} className="space-y-5">
      <div className="card p-4">
        <p className="text-sm text-text-2">
          Pedido de origem: <span className="font-mono font-semibold text-text">{pedidoOrigem.numero}</span>
          {pedidoOrigem.obra?.nome && <span className="text-text-3"> — {pedidoOrigem.obra.nome}</span>}
        </p>
      </div>

      <div className="card divide-y divide-border">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-text">Itens (perfil cor natural)</h2>
        </div>
        {linhas.map((l) => {
          const item = pedidoOrigem.itens.find((i) => i.id === l.itemId)!;
          return (
            <LinhaItem
              key={l.itemId}
              item={item}
              linha={l}
              coresPerfil={coresPerfil}
              onChange={(fn) => patch(l.itemId, fn)}
            />
          );
        })}
      </div>

      <div className="card p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Fornecedor de beneficiamento</label>
            <select name="fornecedor_id" required className="field h-9 text-sm w-full" defaultValue="">
              <option value="" disabled>Selecione…</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            {fornecedores.length === 0 && (
              <p className="mt-1 text-xs text-danger">
                Nenhum fornecedor marcado como "faz beneficiamento" ainda.{" "}
                <a href="/squadframe/compras/fornecedores" target="_blank" className="underline">Cadastrar</a>
              </p>
            )}
          </div>
          <div>
            <label className="label">Forma de pagamento</label>
            <select name="forma_pagamento_id" required className="field h-9 text-sm w-full" defaultValue={formaFaturamentoDireto?.id ?? ""}>
              <option value="" disabled>Selecione…</option>
              {formasPagamento.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Rota</label>
          <div className="mt-1 flex gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="rota" value="VIA_FABRICA" defaultChecked />
              Via fábrica (material já recebido, sai do estoque pra pintura)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="rota" value="DIRETO_FORNECEDOR" />
              Direto do fornecedor (nunca passa pela fábrica)
            </label>
          </div>
        </div>

        <div>
          <Textarea label="Observações" name="observacoes" rows={2} className="text-sm" />
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando…" : "Criar beneficiamento"}
        </Button>
      </div>
    </form>
    </>
  );
}

function LinhaItem({
  item, linha, coresPerfil, onChange,
}: {
  item: ItemPedido;
  linha: LinhaForm;
  coresPerfil: CorRal[];
  onChange: (fn: (l: LinhaForm) => LinhaForm) => void;
}) {
  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={linha.incluir}
          onChange={(e) => onChange((l) => ({ ...l, incluir: e.target.checked }))}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text truncate">{item.produto?.nome ?? item.descricao_snapshot}</p>
          <p className="text-xs text-text-3 font-mono">{item.produto?.codigo_mestre}</p>
        </div>
        <div className="w-28 shrink-0">
          <input
            type="number" step="0.001" min="0.001"
            value={linha.quantidade}
            disabled={!linha.incluir}
            onChange={(e) => onChange((l) => ({ ...l, quantidade: parseFloat(e.target.value) || 0 }))}
            className="field h-8 text-xs w-full"
          />
        </div>
        <span className="w-16 shrink-0 text-xs text-text-3">{item.unidade} (de {item.quantidade_pedida})</span>
      </div>
      {linha.incluir && (
        <div className="pl-7 flex items-center gap-2">
          <label className="text-xs text-text-3 shrink-0">Cor de pintura:</label>
          <select
            className="field h-8 text-xs w-56"
            value={linha.corId ?? ""}
            onChange={(e) => onChange((l) => ({ ...l, corId: e.target.value || null }))}
          >
            <option value="" disabled>Selecione…</option>
            {coresPerfil.map((c) => (
              <option key={c.id} value={c.id}>{c.codigo_ral}{c.nome ? ` — ${c.nome}` : ""}</option>
            ))}
          </select>
          {coresPerfil.length === 0 && (
            <p className="text-xs text-warning">Nenhuma cor de perfil cadastrada. Configure em Catálogo → Cores RAL.</p>
          )}
        </div>
      )}
    </div>
  );
}

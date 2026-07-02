"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarCorRal, editarCor, deletarCor } from "@/app/catalogo/actions";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { Button } from "@/ui/components/Button";

type CorRal = { id: string; codigo_ral: string; nome: string | null; hex: string | null; tipos: string[] };
type TipoLinha = { id: string; nome: string; slug: string };

function CorRow({ cor, tiposLinha }: { cor: CorRal; tiposLinha: TipoLinha[] }) {
  const [editando, setEditando] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  const podeCriar   = usePode("catalogo.criar");
  const podeExcluir = usePode("catalogo.excluir");

  const tiposNomes = (cor.tipos ?? [])
    .map(slug => tiposLinha.find(t => t.slug === slug)?.nome ?? slug)
    .filter(Boolean);

  function handleEditar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    start(async () => {
      try { await editarCor(cor.id, fd); setEditando(false); router.refresh(); }
      catch (err: any) { setErro(err.message); }
    });
  }

  function handleDeletar() {
    if (!confirm(`Excluir ${cor.codigo_ral}? Será removida de todos os pedidos.`)) return;
    start(async () => {
      try { await deletarCor(cor.id); router.refresh(); }
      catch (err: any) { alert(err.message); }
    });
  }

  if (editando) {
    return (
      <tr className="border-b border-border last:border-0 bg-bg">
        <td colSpan={5} className="px-4 py-3">
          <form onSubmit={handleEditar} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-3">Nome</label>
                <input name="nome" defaultValue={cor.nome ?? ""} className="field h-8 text-sm" placeholder="Ex: Branco puro" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-3">Hex</label>
                <div className="flex items-center gap-2">
                  <input name="hex" defaultValue={cor.hex ?? ""} className="field h-8 text-sm font-mono" placeholder="#F4F4F4" maxLength={7} />
                  <input type="color" defaultValue={cor.hex ?? "#e5e7eb"}
                    onChange={(e) => {
                      const inp = e.currentTarget.closest("div")?.querySelector<HTMLInputElement>("input[name=hex]");
                      if (inp) inp.value = e.currentTarget.value;
                    }}
                    className="h-8 w-9 cursor-pointer rounded border border-border p-0.5" />
                </div>
              </div>
            </div>
            {tiposLinha.length > 0 && (
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-3">Aplica-se a</label>
                <div className="mt-1 flex flex-wrap gap-3">
                  {tiposLinha.map((t) => (
                    <label key={t.slug} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input type="checkbox" name="tipos" value={t.slug}
                        defaultChecked={(cor.tipos ?? []).includes(t.slug)} className="rounded" />
                      {t.nome}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {erro && <p className="text-xs text-danger">{erro}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending} className="text-xs px-3 py-1.5">
                {pending ? "Salvando…" : "Salvar"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setEditando(false); setErro(null); }}
                className="text-xs px-3 py-1.5">Cancelar</Button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-bg">
      <td className="px-4 py-2.5">
        <span className="inline-block h-5 w-5 rounded border border-border"
          style={{ backgroundColor: cor.hex ?? "#e5e7eb" }} />
      </td>
      <td className="px-4 py-2.5 font-mono text-xs font-medium">{cor.codigo_ral}</td>
      <td className="px-4 py-2.5 text-text-2">{cor.nome ?? "—"}</td>
      <td className="px-4 py-2.5 font-mono text-xs text-text-3">{cor.hex ?? "—"}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1 justify-end">
          {podeCriar && (
            <button onClick={() => setEditando(true)} disabled={pending}
              className="rounded p-1.5 text-text-3 hover:bg-surface hover:text-text" title="Editar">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
          {podeExcluir && (
            <button onClick={handleDeletar} disabled={pending}
              className="rounded p-1.5 text-text-3 hover:bg-danger-soft hover:text-danger disabled:opacity-40" title="Excluir">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function FormNovaCor({ tiposLinha, onDone }: { tiposLinha: TipoLinha[]; onDone: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    start(async () => {
      try { await criarCorRal(fd); onDone(); router.refresh(); }
      catch (err: any) { setErro(err.message); }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Código RAL <span className="text-danger">*</span></label>
          <input name="codigo_ral" required className="field font-mono" placeholder="RAL9010" />
        </div>
        <div>
          <label className="label">Nome <span className="font-normal text-text-2">(opcional)</span></label>
          <input name="nome" className="field" placeholder="Branco puro" />
        </div>
        <div>
          <label className="label">Hex <span className="font-normal text-text-2">(opcional)</span></label>
          <div className="flex items-center gap-2">
            <input name="hex" className="field font-mono" placeholder="#F4F4F4" maxLength={7} />
            <input type="color" className="h-9 w-10 cursor-pointer rounded border border-border bg-surface p-1"
              onChange={(e) => {
                const inp = e.currentTarget.closest("div")?.querySelector<HTMLInputElement>("input[name=hex]");
                if (inp) inp.value = e.currentTarget.value;
              }} />
          </div>
        </div>
      </div>
      {tiposLinha.length > 0 && (
        <div>
          <label className="label">Aplica-se a</label>
          <div className="mt-1 flex flex-wrap gap-3">
            {tiposLinha.map((t) => (
              <label key={t.slug} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" name="tipos" value={t.slug} className="rounded" />
                {t.nome}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-text-3">Em quais abas do catálogo esta cor é usada</p>
        </div>
      )}
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Cadastrar"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>Cancelar</Button>
      </div>
    </form>
  );
}

export function AbaCoresCatalogo({
  cores,
  tiposLinha,
  aplicacaoAtiva,
}: {
  cores: CorRal[];
  tiposLinha: TipoLinha[];
  aplicacaoAtiva?: string | null;
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const podeCriar = usePode("catalogo.criar");

  // Slugs em tipos_linha podem ter sido cadastrados com case variado (ex: "PERFIL" vs "vidro"),
  // então a comparação precisa ser case-insensitive.
  const aplicacaoNorm = aplicacaoAtiva?.toLowerCase() ?? null;

  const coresFiltradas = aplicacaoNorm
    ? cores.filter(c => (c.tipos ?? []).some(t => t.toLowerCase() === aplicacaoNorm))
    : cores;

  const tituloAtivo = aplicacaoNorm
    ? tiposLinha.find(t => t.slug.toLowerCase() === aplicacaoNorm)?.nome ?? aplicacaoAtiva
    : "Todas as cores";

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-text">{tituloAtivo}</p>
            <p className="text-xs text-text-3">{coresFiltradas.length} cor(es)</p>
          </div>
          {podeCriar && !mostrarForm && (
            <button onClick={() => setMostrarForm(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nova cor
            </button>
          )}
        </div>

        {mostrarForm && (
          <div className="card p-5">
            <p className="mb-4 font-display text-sm font-semibold text-text">Nova cor RAL</p>
            <FormNovaCor tiposLinha={tiposLinha} onDone={() => setMostrarForm(false)} />
          </div>
        )}

      {coresFiltradas.length > 0 ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3 font-medium">Código RAL</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Hex</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {coresFiltradas.map((cor) => (
                <CorRow key={cor.id} cor={cor} tiposLinha={tiposLinha} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-sm text-text-3">
            {aplicacaoAtiva
              ? `Nenhuma cor cadastrada para ${tituloAtivo}.`
              : "Nenhuma cor RAL cadastrada."}
          </p>
        </div>
      )}

      {!mostrarForm && podeCriar && coresFiltradas.length === 0 && (
        <button onClick={() => setMostrarForm(true)}
          className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm font-medium text-text-2 transition-colors hover:border-primary hover:text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova cor RAL
        </button>
      )}
    </div>
  );
}

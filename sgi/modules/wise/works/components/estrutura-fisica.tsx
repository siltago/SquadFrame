"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adicionarEstruturaAction,
  editarEstruturaAction,
  excluirEstruturaAction,
} from "@/modules/wise/works/actions";
import { Button } from "@/ui/components/Button";
import type { WiseObraEstrutura } from "@/modules/wise/works/types";

type TipoNo = WiseObraEstrutura["tipo"];

const TIPO_LABEL: Record<TipoNo, string> = {
  TORRE:     "Torre",
  BLOCO:     "Bloco",
  PAVIMENTO: "Pavimento",
  AMBIENTE:  "Ambiente",
  OUTRO:     "Outro",
};

const TIPO_FILHOS: Partial<Record<TipoNo, TipoNo[]>> = {
  TORRE:     ["BLOCO", "PAVIMENTO"],
  BLOCO:     ["PAVIMENTO"],
  PAVIMENTO: ["AMBIENTE"],
};

const TIPO_RAIZ: TipoNo[] = ["TORRE", "BLOCO", "PAVIMENTO", "OUTRO"];

function NoEstrutura({
  no,
  obraId,
  profundidade = 0,
}: {
  no: WiseObraEstrutura;
  obraId: string;
  profundidade?: number;
}) {
  const [editando, setEditando] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [nomeEdit, setNomeEdit] = useState(no.nome);
  const [codigoEdit, setCodigoEdit] = useState(no.codigo ?? "");
  const [nomeNovo, setNomeNovo] = useState("");
  const [codigoNovo, setCodigoNovo] = useState("");
  const [tipoNovo, setTipoNovo] = useState<TipoNo>(
    (TIPO_FILHOS[no.tipo]?.[0] ?? "OUTRO") as TipoNo
  );
  const [pending, start] = useTransition();
  const router = useRouter();

  const tiposFilho = TIPO_FILHOS[no.tipo] ?? [];

  function salvarEdição() {
    if (!nomeEdit.trim()) return;
    start(async () => {
      await editarEstruturaAction(no.id, obraId, { nome: nomeEdit, codigo: codigoEdit || null });
      setEditando(false);
      router.refresh();
    });
  }

  function adicionarFilho() {
    if (!nomeNovo.trim()) return;
    start(async () => {
      await adicionarEstruturaAction({
        obra_id: obraId,
        parent_id: no.id,
        tipo: tipoNovo,
        nome: nomeNovo,
        codigo: codigoNovo || null,
      });
      setNomeNovo("");
      setCodigoNovo("");
      setAdicionando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!confirm(`Excluir "${no.nome}" e todos os seus filhos?`)) return;
    start(async () => {
      await excluirEstruturaAction(no.id, obraId);
      router.refresh();
    });
  }

  return (
    <div className={`${profundidade > 0 ? "ml-6 border-l border-border pl-4" : ""} mt-2`}>
      {editando ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <input value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)}
            className="field h-7 flex-1 text-sm" placeholder="Nome" autoFocus />
          <input value={codigoEdit} onChange={(e) => setCodigoEdit(e.target.value)}
            className="field h-7 w-24 text-sm font-mono" placeholder="Cód." />
          <button onClick={salvarEdição} disabled={pending}
            className="text-xs text-primary hover:underline disabled:opacity-40">
            {pending ? "…" : "Salvar"}
          </button>
          <button onClick={() => { setEditando(false); setNomeEdit(no.nome); setCodigoEdit(no.codigo ?? ""); }}
            className="text-xs text-text-3 hover:text-text">
            Cancelar
          </button>
        </div>
      ) : (
        <div className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-bg ${pending ? "opacity-40" : ""}`}>
          <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-3">
            {TIPO_LABEL[no.tipo]}
          </span>
          {no.codigo && (
            <span className="font-mono text-xs text-text-3">{no.codigo}</span>
          )}
          <span className="flex-1 text-sm font-medium text-text">{no.nome}</span>
          <div className="hidden items-center gap-1 group-hover:flex">
            {tiposFilho.length > 0 && (
              <button onClick={() => setAdicionando((v) => !v)}
                className="rounded p-1 text-text-3 hover:bg-surface hover:text-primary" title="Adicionar filho">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            )}
            <button onClick={() => setEditando(true)}
              className="rounded p-1 text-text-3 hover:bg-surface hover:text-text" title="Editar">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button onClick={excluir} disabled={pending}
              className="rounded p-1 text-text-3 hover:bg-danger-soft hover:text-danger" title="Excluir">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {adicionando && tiposFilho.length > 0 && (
        <div className="ml-6 mt-1 flex items-center gap-2 rounded-lg border border-dashed border-border bg-bg px-3 py-2">
          <select value={tipoNovo} onChange={(e) => setTipoNovo(e.target.value as TipoNo)}
            className="field h-7 w-28 text-xs">
            {tiposFilho.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
          </select>
          <input value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)}
            className="field h-7 flex-1 text-sm" placeholder="Nome" autoFocus />
          <input value={codigoNovo} onChange={(e) => setCodigoNovo(e.target.value)}
            className="field h-7 w-20 text-sm font-mono" placeholder="Cód." />
          <button onClick={adicionarFilho} disabled={pending || !nomeNovo.trim()}
            className="text-xs text-primary hover:underline disabled:opacity-40">
            {pending ? "…" : "Adicionar"}
          </button>
          <button onClick={() => setAdicionando(false)} className="text-xs text-text-3 hover:text-text">
            Cancelar
          </button>
        </div>
      )}

      {(no.filhos ?? []).map((filho) => (
        <NoEstrutura key={filho.id} no={filho} obraId={obraId} profundidade={profundidade + 1} />
      ))}
    </div>
  );
}

export function EstruturaFisica({
  obraId,
  arvore,
}: {
  obraId: string;
  arvore: WiseObraEstrutura[];
}) {
  const [adicionando, setAdicionando] = useState(false);
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<TipoNo>("TORRE");
  const [pending, start] = useTransition();
  const router = useRouter();

  function adicionar() {
    if (!nome.trim()) return;
    start(async () => {
      await adicionarEstruturaAction({
        obra_id: obraId,
        tipo,
        nome,
        codigo: codigo || null,
      });
      setNome("");
      setCodigo("");
      setAdicionando(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {arvore.length === 0 && !adicionando && (
        <p className="text-sm text-text-3 py-4">Nenhuma estrutura cadastrada ainda.</p>
      )}

      {arvore.map((no) => (
        <NoEstrutura key={no.id} no={no} obraId={obraId} />
      ))}

      {adicionando ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 mt-3">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoNo)}
            className="field h-7 w-28 text-xs">
            {TIPO_RAIZ.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
          </select>
          <input value={nome} onChange={(e) => setNome(e.target.value)}
            className="field h-7 flex-1 text-sm" placeholder="Nome (ex: Torre A)" autoFocus />
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)}
            className="field h-7 w-20 text-sm font-mono" placeholder="Cód." />
          <button onClick={adicionar} disabled={pending || !nome.trim()}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-40">
            {pending ? "…" : "Adicionar"}
          </button>
          <button onClick={() => { setAdicionando(false); setNome(""); setCodigo(""); }}
            className="text-xs text-text-3 hover:text-text">
            Cancelar
          </button>
        </div>
      ) : (
        <button onClick={() => setAdicionando(true)}
          className="mt-3 flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Adicionar elemento
        </button>
      )}
    </div>
  );
}

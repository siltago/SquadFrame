"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { TarefaComentario, TarefaHistorico, TarefaLink, TarefaArquivo, ChecklistItem, Tarefa, Etiqueta } from "@/types/kanban";
import { PRIORIDADE_COR } from "@/types/kanban";
import {
  buscarDetalhesTarefa,
  buscarUsuarios,
  editarTarefa,
  concluirTarefa,
  cancelarTarefa,
  adicionarComentario,
  adicionarLink,
  removerLink,
  uploadArquivo,
  removerArquivo,
  adicionarChecklistItem,
  toggleChecklistItem,
  removerChecklistItem,
  vincularEtiqueta,
  desvincularEtiqueta,
  criarEtiqueta,
  atribuirTarefa,
} from "@/app/tarefas/actions";
import { createClient } from "@/lib/supabase-client";

interface Props {
  tarefaId: string;
  onClose: () => void;
}

function RelativeTime({ ts }: { ts: string }) {
  const d = new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return <span>{diff}s atrás</span>;
  if (diff < 3600) return <span>{Math.floor(diff / 60)}min atrás</span>;
  if (diff < 86400) return <span>{Math.floor(diff / 3600)}h atrás</span>;
  return <span>{d.toLocaleDateString("pt-BR")}</span>;
}

export function CardPanel({ tarefaId, onClose }: Props) {
  const [dados, setDados] = useState<Awaited<ReturnType<typeof buscarDetalhesTarefa>> | null>(null);
  const [loading, setLoading] = useState(true);

  const [comentarioTexto, setComentarioTexto] = useState("");
  const [checklistTexto, setChecklistTexto] = useState("");
  const [linkTitulo, setLinkTitulo] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [novaEtiquetaNome, setNovaEtiquetaNome] = useState("");
  const [novaEtiquetaCor, setNovaEtiquetaCor] = useState("#6366f1");
  const [showAddEtiqueta, setShowAddEtiqueta] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showResponsavelPicker, setShowResponsavelPicker] = useState(false);
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    const r = await buscarDetalhesTarefa(tarefaId);
    setDados(r);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    buscarUsuarios().then(setUsuarios);
    const supabase = createClient();
    const channel = supabase
      .channel(`card-panel-${tarefaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefas", filter: `id=eq.${tarefaId}` }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tarefaId]);

  function flash(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2500);
  }

  function handleTituloBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.currentTarget.value.trim();
    if (!val || val === dados?.tarefa?.titulo) return;
    startTransition(async () => {
      await editarTarefa(tarefaId, { titulo: val });
      await reload();
    });
  }

  function handleDescricaoBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const val = e.currentTarget.value;
    if (val === (dados?.tarefa?.descricao ?? "")) return;
    startTransition(async () => {
      await editarTarefa(tarefaId, { descricao: val || null });
      await reload();
    });
  }

  function handlePrioridade(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    startTransition(async () => {
      await editarTarefa(tarefaId, { prioridade: val });
      await reload();
    });
  }

  function handleDataLimite(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value || null;
    startTransition(async () => {
      await editarTarefa(tarefaId, { data_limite: val });
      await reload();
    });
  }

  async function handleAtribuir(usuarioId: string, usuarioNome: string) {
    startTransition(async () => {
      if (usuarioId === "__remover__") {
        await editarTarefa(tarefaId, { usuario_responsavel_id: null });
        flash("Responsável removido");
      } else {
        await atribuirTarefa(tarefaId, usuarioId);
        await adicionarComentario(tarefaId, `📌 Tarefa atribuída para ${usuarioNome}`);
        flash(`Atribuído para ${usuarioNome}`);
      }
      setShowResponsavelPicker(false);
      await reload();
    });
  }

  async function handleConcluir() {
    startTransition(async () => {
      const r = await concluirTarefa(tarefaId);
      if (r.ok) { flash("Tarefa concluída"); await reload(); }
    });
  }

  async function handleCancelar() {
    if (!confirm("Cancelar esta tarefa?")) return;
    startTransition(async () => {
      const r = await cancelarTarefa(tarefaId);
      if (r.ok) { flash("Tarefa cancelada"); await reload(); }
    });
  }

  async function handleComentario() {
    if (!comentarioTexto.trim()) return;
    startTransition(async () => {
      await adicionarComentario(tarefaId, comentarioTexto);
      setComentarioTexto("");
      await reload();
    });
  }

  async function handleAddLink() {
    if (!linkTitulo.trim() || !linkUrl.trim()) return;
    startTransition(async () => {
      await adicionarLink(tarefaId, linkTitulo, linkUrl);
      setLinkTitulo(""); setLinkUrl(""); setShowAddLink(false);
      await reload();
    });
  }

  async function handleRemoverLink(linkId: string) {
    startTransition(async () => {
      await removerLink(linkId);
      await reload();
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      await uploadArquivo(tarefaId, fd);
      await reload();
    });
    e.target.value = "";
  }

  async function handleRemoverArquivo(id: string, url: string) {
    startTransition(async () => {
      await removerArquivo(id, url);
      await reload();
    });
  }

  async function handleAddChecklistItem() {
    if (!checklistTexto.trim()) return;
    startTransition(async () => {
      await adicionarChecklistItem(tarefaId, checklistTexto);
      setChecklistTexto("");
      await reload();
    });
  }

  async function handleToggleChecklist(itemId: string, concluido: boolean) {
    startTransition(async () => {
      await toggleChecklistItem(itemId, concluido);
      await reload();
    });
  }

  async function handleRemoverChecklistItem(itemId: string) {
    startTransition(async () => {
      await removerChecklistItem(itemId);
      await reload();
    });
  }

  async function handleVincularEtiqueta(etiquetaId: string) {
    const jaVinculada = dados?.tarefa?.etiquetas?.some((e: Etiqueta) => e.id === etiquetaId);
    startTransition(async () => {
      if (jaVinculada) {
        await desvincularEtiqueta(tarefaId, etiquetaId);
      } else {
        await vincularEtiqueta(tarefaId, etiquetaId);
      }
      await reload();
    });
  }

  async function handleCriarEtiqueta() {
    if (!novaEtiquetaNome.trim()) return;
    const tarefa = dados?.tarefa as Tarefa | undefined;
    startTransition(async () => {
      const r = await criarEtiqueta(novaEtiquetaNome, novaEtiquetaCor, tarefa?.setor_id ?? null);
      if (r.ok && r.id) {
        await vincularEtiqueta(tarefaId, r.id);
        setNovaEtiquetaNome(""); setShowAddEtiqueta(false);
        await reload();
      }
    });
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex" onClick={onClose}>
        <div className="flex-1" />
        <div className="w-full max-w-lg h-full bg-surface border-l border-line flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-ink-faint text-sm">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!dados?.tarefa) return null;

  const tarefa = dados.tarefa as Tarefa & { responsavel?: { id: string; nome: string } | null; etiquetas?: Etiqueta[] };
  const comentarios = dados.comentarios as TarefaComentario[];
  const checklist = dados.checklist as ChecklistItem[];
  const links = dados.links as TarefaLink[];
  const arquivos = dados.arquivos as TarefaArquivo[];
  const historico = dados.historico as TarefaHistorico[];

  const checkTotal = checklist.length;
  const checkDone = checklist.filter((i) => i.concluido).length;
  const checkPct = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0;
  const isFinalizado = tarefa.status === "CONCLUIDA" || tarefa.status === "CANCELADA";

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="relative w-full max-w-lg h-full bg-surface border-l border-line flex flex-col overflow-hidden shadow-2xl"
        style={{ animation: "slideInRight 0.2s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-1.5 rounded-full"
              style={{ backgroundColor: PRIORIDADE_COR[tarefa.prioridade] }}
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {tarefa.origem}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {statusMsg && (
              <span className="text-xs text-steel font-medium">{statusMsg}</span>
            )}
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-canvas transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <div>
            <input
              key={tarefa.titulo}
              defaultValue={tarefa.titulo}
              onBlur={handleTituloBlur}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              className="w-full text-lg font-semibold text-ink bg-transparent border-0 border-b border-transparent hover:border-line focus:border-steel focus:outline-none pb-1 transition-colors"
              placeholder="Título da tarefa"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prioridade</label>
              <select
                value={tarefa.prioridade}
                onChange={handlePrioridade}
                className="field text-sm"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
            <div>
              <label className="label">Data Limite</label>
              <input
                type="date"
                key={tarefa.data_limite ?? ""}
                defaultValue={tarefa.data_limite ?? ""}
                onChange={handleDataLimite}
                className="field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="label">Responsável</label>
            <div className="relative">
              <button
                onClick={() => setShowResponsavelPicker((p) => !p)}
                className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-sm hover:border-steel transition-colors w-full text-left"
              >
                {tarefa.responsavel ? (
                  <>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-steel/15 text-xs font-bold text-steel">
                      {tarefa.responsavel.nome[0].toUpperCase()}
                    </div>
                    <span className="flex-1 font-medium text-ink">{tarefa.responsavel.nome}</span>
                  </>
                ) : (
                  <>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-line text-xs text-ink-faint">+</div>
                    <span className="flex-1 text-ink-faint">Sem responsável</span>
                  </>
                )}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink-faint"><polyline points="6 9 12 15 18 9"/></svg>
              </button>

              {showResponsavelPicker && (
                <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-line bg-surface shadow-lg overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    {tarefa.responsavel && (
                      <button
                        onClick={() => handleAtribuir("__remover__", "")}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-canvas transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Remover responsável
                      </button>
                    )}
                    {usuarios.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleAtribuir(u.id, u.nome)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-canvas transition-colors ${tarefa.responsavel?.id === u.id ? "bg-steel/5 text-steel font-medium" : "text-ink"}`}
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-steel/15 text-xs font-bold text-steel">
                          {u.nome[0].toUpperCase()}
                        </div>
                        {u.nome}
                        {tarefa.responsavel?.id === u.id && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea
              key={tarefa.descricao ?? ""}
              defaultValue={tarefa.descricao ?? ""}
              onBlur={handleDescricaoBlur}
              rows={3}
              className="field text-sm resize-none"
              placeholder="Adicione uma descrição..."
            />
          </div>

          <div>
            <label className="label">Etiquetas</label>
            <div className="flex flex-wrap gap-1.5">
              {(tarefa.etiquetas ?? []).map((et: Etiqueta) => (
                <button
                  key={et.id}
                  onClick={() => handleVincularEtiqueta(et.id)}
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white transition-opacity hover:opacity-70"
                  style={{ backgroundColor: et.cor }}
                  title="Clique para remover"
                >
                  {et.nome} ×
                </button>
              ))}
              <button
                onClick={() => setShowAddEtiqueta(!showAddEtiqueta)}
                className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-ink-faint hover:border-steel hover:text-steel transition-colors"
              >
                + Etiqueta
              </button>
            </div>
            {showAddEtiqueta && (
              <div className="mt-2 flex gap-2 items-center">
                <input
                  value={novaEtiquetaNome}
                  onChange={(e) => setNovaEtiquetaNome(e.target.value)}
                  placeholder="Nome da etiqueta"
                  className="field text-xs flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") handleCriarEtiqueta(); }}
                />
                <input
                  type="color"
                  value={novaEtiquetaCor}
                  onChange={(e) => setNovaEtiquetaCor(e.target.value)}
                  className="h-9 w-9 rounded-lg border border-line cursor-pointer"
                />
                <button onClick={handleCriarEtiqueta} className="btn-primary text-xs px-3 py-2">OK</button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Checklist {checkTotal > 0 && `(${checkDone}/${checkTotal})`}</label>
            </div>
            {checkTotal > 0 && (
              <div className="h-1 w-full bg-canvas rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full bg-steel transition-all" style={{ width: `${checkPct}%` }} />
              </div>
            )}
            <div className="space-y-1">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <input
                    type="checkbox"
                    checked={item.concluido}
                    onChange={(e) => handleToggleChecklist(item.id, e.target.checked)}
                    className="h-4 w-4 rounded border-line text-steel accent-steel"
                  />
                  <span className={`flex-1 text-sm ${item.concluido ? "line-through text-ink-faint" : "text-ink"}`}>
                    {item.texto}
                  </span>
                  <button
                    onClick={() => handleRemoverChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-red-500 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={checklistTexto}
                onChange={(e) => setChecklistTexto(e.target.value)}
                placeholder="Novo item..."
                className="field text-sm flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddChecklistItem(); }}
              />
              <button onClick={handleAddChecklistItem} className="btn-ghost text-sm px-3 py-2">+</button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Links</label>
              <button onClick={() => setShowAddLink(!showAddLink)} className="text-xs text-steel hover:underline">+ Adicionar</button>
            </div>
            {showAddLink && (
              <div className="mb-2 space-y-2">
                <input value={linkTitulo} onChange={(e) => setLinkTitulo(e.target.value)} placeholder="Título do link" className="field text-sm" />
                <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="field text-sm" type="url" />
                <div className="flex gap-2">
                  <button onClick={handleAddLink} className="btn-primary text-xs px-3 py-1.5">Salvar</button>
                  <button onClick={() => setShowAddLink(false)} className="btn-ghost text-xs px-3 py-1.5">Cancelar</button>
                </div>
              </div>
            )}
            <div className="space-y-1">
              {links.map((link) => (
                <div key={link.id} className="flex items-center gap-2 group">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-steel shrink-0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-steel hover:underline truncate">{link.titulo}</a>
                  <button onClick={() => handleRemoverLink(link.id)} className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-red-500 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Arquivos</label>
              <button onClick={() => fileRef.current?.click()} className="text-xs text-steel hover:underline">+ Upload</button>
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
            <div className="space-y-1">
              {arquivos.map((arq) => (
                <div key={arq.id} className="flex items-center gap-2 group">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-faint shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <a href={arq.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-ink hover:text-steel truncate">{arq.nome}</a>
                  <button onClick={() => handleRemoverArquivo(arq.id, arq.url)} className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-red-500 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Comentários</label>
            <div className="space-y-3 mb-3">
              {comentarios.map((c: any) => (
                <div key={c.id} className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-steel/10 text-xs font-bold text-steel">
                    {(c.usuario?.nome ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-ink">{c.usuario?.nome ?? "Usuário"}</span>
                      <span className="text-xs text-ink-faint"><RelativeTime ts={c.criado_em} /></span>
                    </div>
                    <p className="text-sm text-ink-soft mt-0.5 whitespace-pre-wrap">{c.texto}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={comentarioTexto}
                onChange={(e) => setComentarioTexto(e.target.value)}
                placeholder="Adicionar comentário..."
                rows={2}
                className="field text-sm flex-1 resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleComentario(); }}
              />
              <button onClick={handleComentario} disabled={!comentarioTexto.trim()} className="btn-primary text-sm px-3 self-end">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>

          {historico.length > 0 && (
            <div>
              <label className="label">Histórico</label>
              <div className="space-y-1">
                {historico.slice().reverse().slice(0, 10).map((h: any) => (
                  <div key={h.id} className="flex items-start gap-2 text-xs text-ink-faint">
                    <span className="shrink-0"><RelativeTime ts={h.criado_em} /></span>
                    <span>{h.usuario?.nome ?? "Sistema"} — {h.acao.replace(/_/g, " ").toLowerCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isFinalizado && (
          <div className="shrink-0 border-t border-line px-4 py-3 flex gap-2">
            <button onClick={handleConcluir} disabled={pending} className="btn-primary flex-1 text-sm py-2">
              Concluir
            </button>
            <button onClick={handleCancelar} disabled={pending} className="btn-ghost text-sm py-2 px-3 text-red-500 border-red-200 hover:bg-red-50">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

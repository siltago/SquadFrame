"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { cn } from "@/ui/lib/cn";
import { ChevronRightIcon, PlusIcon, EditIcon, TrashIcon } from "@/ui/icons";
import { desativarNo, moverNo } from "@/modules/squadstock/actions/mapa";
import { NoForm } from "./no-form";
import { FREQUENCIA_LABEL, type SugestaoNo } from "@/modules/squadstock/services/frequencia-contagem";

const RAIZ_DROP_ID = "__raiz_drop__";

// Ícone de "pegar" (grip) — não existe em ui/icons, então fica local aqui
// mesmo, pequeno demais pra justificar entrar no set compartilhado de
// ícones do app.
function GripIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="3" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="5" cy="13" r="1.3" />
      <circle cx="11" cy="3" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="11" cy="13" r="1.3" />
    </svg>
  );
}

export interface NoLocal {
  id: string;
  nome: string;
  nivel_tipo: string | null;
  parent_id: string | null;
  ordem: number;
  ativo: boolean;
}

interface NoComFilhos extends NoLocal {
  filhos: NoComFilhos[];
}

function montarArvore(locais: NoLocal[]): NoComFilhos[] {
  const porId = new Map<string, NoComFilhos>();
  locais.forEach((l) => porId.set(l.id, { ...l, filhos: [] }));
  const raizes: NoComFilhos[] = [];
  porId.forEach((no) => {
    if (no.parent_id && porId.has(no.parent_id)) {
      porId.get(no.parent_id)!.filhos.push(no);
    } else {
      raizes.push(no);
    }
  });
  const ordenar = (lista: NoComFilhos[]) => {
    lista.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
    lista.forEach((n) => ordenar(n.filhos));
  };
  ordenar(raizes);
  return raizes;
}

function Linha({
  no,
  profundidade,
  podeGerenciar,
  expandidos,
  toggleExpandido,
  expandirNo,
  criandoFilhoEm,
  setCriandoFilhoEm,
  editando,
  setEditando,
  sugestoes,
  idsInvalidosParaSoltar,
}: {
  no: NoComFilhos;
  profundidade: number;
  podeGerenciar: boolean;
  expandidos: Set<string>;
  toggleExpandido: (id: string) => void;
  expandirNo: (id: string) => void;
  criandoFilhoEm: string | null;
  setCriandoFilhoEm: (id: string | null) => void;
  editando: string | null;
  setEditando: (id: string | null) => void;
  sugestoes: Record<string, SugestaoNo>;
  idsInvalidosParaSoltar: Set<string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const expandido = expandidos.has(no.id);
  const temFilhos = no.filhos.length > 0;

  const formAberto = editando === no.id || criandoFilhoEm === no.id;
  const draggable = useDraggable({ id: no.id, disabled: !podeGerenciar || formAberto });
  const droppableDisabled = !podeGerenciar || idsInvalidosParaSoltar.has(no.id);
  const droppable = useDroppable({ id: no.id, disabled: droppableDisabled });
  const podeSoltarAqui = droppable.isOver && !droppableDisabled;

  function apagar() {
    if (!confirm(`Apagar "${no.nome}"?`)) return;
    setErro(null);
    startTransition(async () => {
      try {
        await desativarNo(no.id);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao apagar.");
      }
    });
  }

  if (editando === no.id) {
    return (
      <div style={{ marginLeft: profundidade * 20 }} className="mb-1">
        <NoForm
          parentId={no.parent_id}
          no={no}
          onDone={() => { setEditando(null); router.refresh(); }}
          onCancel={() => setEditando(null)}
        />
      </div>
    );
  }

  return (
    <div className="mb-1">
      <div
        ref={droppable.setNodeRef}
        className={cn(
          "flex items-center gap-1 rounded-xl transition-colors",
          podeSoltarAqui && "bg-accent/10 ring-2 ring-accent/50"
        )}
        style={{ marginLeft: profundidade * 20, opacity: draggable.isDragging ? 0.4 : 1 }}
      >
        {podeGerenciar && (
          <button
            ref={draggable.setNodeRef}
            {...draggable.listeners}
            {...draggable.attributes}
            type="button"
            disabled={formAberto}
            aria-label="Arrastar para mover"
            title="Arrastar para mover pra dentro de outro local"
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-3 hover:bg-surface-2 hover:text-text",
              formAberto ? "cursor-not-allowed opacity-30" : "cursor-grab active:cursor-grabbing"
            )}
          >
            <GripIcon size={14} />
          </button>
        )}

        <button
          type="button"
          onClick={() => temFilhos && toggleExpandido(no.id)}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-3",
            temFilhos && "transition-transform duration-[var(--motion-hover)] hover:bg-surface-2 hover:text-text",
            !temFilhos && "invisible",
            expandido && "rotate-90"
          )}
        >
          <ChevronRightIcon size={14} />
        </button>

        <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text">
          <span className="truncate">{no.nome}</span>
          {no.nivel_tipo && (
            <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-3">
              {no.nivel_tipo}
            </span>
          )}
          {temFilhos && <span className="shrink-0 text-xs text-text-3">{no.filhos.length}</span>}
          {sugestoes[no.id] && sugestoes[no.id].movimentacoes90d > 0 && (
            <span
              title={`${sugestoes[no.id].movimentacoes90d} movimentação(ões) nos últimos 90 dias — sugestão de 1ª versão, não uma regra fixa`}
              className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent"
            >
              Contar: {FREQUENCIA_LABEL[sugestoes[no.id].frequencia]}
            </span>
          )}
        </div>

        {podeGerenciar && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => setCriandoFilhoEm(criandoFilhoEm === no.id ? null : no.id)}
              aria-label="Adicionar filho"
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-3 hover:bg-surface-2 hover:text-text"
            >
              <PlusIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => setEditando(no.id)}
              aria-label="Editar"
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-3 hover:bg-surface-2 hover:text-text"
            >
              <EditIcon size={14} />
            </button>
            <button
              type="button"
              onClick={apagar}
              disabled={pending}
              aria-label="Apagar"
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-3 hover:bg-danger-soft hover:text-danger disabled:opacity-50"
            >
              <TrashIcon size={14} />
            </button>
          </div>
        )}
      </div>

      {erro && <p className="ml-9 text-xs text-danger">{erro}</p>}

      {criandoFilhoEm === no.id && (
        <div style={{ marginLeft: (profundidade + 1) * 20 }} className="mt-1">
          <NoForm
            parentId={no.id}
            onDone={() => { setCriandoFilhoEm(null); expandirNo(no.id); router.refresh(); }}
            onCancel={() => setCriandoFilhoEm(null)}
          />
        </div>
      )}

      {expandido && no.filhos.map((filho) => (
        <Linha
          key={filho.id}
          no={filho}
          profundidade={profundidade + 1}
          podeGerenciar={podeGerenciar}
          expandidos={expandidos}
          toggleExpandido={toggleExpandido}
          expandirNo={expandirNo}
          criandoFilhoEm={criandoFilhoEm}
          setCriandoFilhoEm={setCriandoFilhoEm}
          editando={editando}
          setEditando={setEditando}
          sugestoes={sugestoes}
          idsInvalidosParaSoltar={idsInvalidosParaSoltar}
        />
      ))}
    </div>
  );
}

export function MapaArvore({
  locais,
  podeGerenciar,
  sugestoes = {},
}: {
  locais: NoLocal[];
  podeGerenciar: boolean;
  sugestoes?: Record<string, SugestaoNo>;
}) {
  const arvore = useMemo(() => montarArvore(locais), [locais]);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [criandoFilhoEm, setCriandoFilhoEm] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [idsInvalidosParaSoltar, setIdsInvalidosParaSoltar] = useState<Set<string>>(new Set());
  const [erroMover, setErroMover] = useState<string | null>(null);
  const [, startTransitionMover] = useTransition();
  const router = useRouter();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const porPai = useMemo(() => {
    const m = new Map<string, string[]>();
    locais.forEach((l) => {
      if (l.parent_id) {
        const arr = m.get(l.parent_id) ?? [];
        arr.push(l.id);
        m.set(l.parent_id, arr);
      }
    });
    return m;
  }, [locais]);

  // Um nó não pode ser solto em si mesmo nem em nenhum dos seus próprios
  // descendentes (criaria ciclo) — calculado no início do arrasto pra
  // desabilitar visualmente esses alvos em tempo real, sem esperar o erro
  // do servidor pra descobrir que o drop não vale.
  function coletarSubarvore(id: string): Set<string> {
    const set = new Set<string>([id]);
    const fila = [id];
    while (fila.length > 0) {
      const atual = fila.pop()!;
      for (const filhoId of porPai.get(atual) ?? []) {
        if (!set.has(filhoId)) {
          set.add(filhoId);
          fila.push(filhoId);
        }
      }
    }
    return set;
  }

  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  // Diferente de toggleExpandido: sempre GARANTE expandido, nunca fecha.
  // Usado depois de criar um filho — se o pai já estava expandido (2º, 3º
  // filho…), um toggle aqui fecharia ele bem na hora que o novo item
  // apareceu.
  function expandirNo(id: string) {
    setExpandidos((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setArrastandoId(id);
    setIdsInvalidosParaSoltar(coletarSubarvore(id));
    setErroMover(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const id = arrastandoId;
    setArrastandoId(null);
    setIdsInvalidosParaSoltar(new Set());

    const { over } = event;
    if (!id || !over) return;

    const overId = String(over.id);
    const novoParentId = overId === RAIZ_DROP_ID ? null : overId;

    const noAtual = locais.find((l) => l.id === id);
    if (!noAtual || (noAtual.parent_id ?? null) === novoParentId) return; // soltou onde já estava

    startTransitionMover(async () => {
      try {
        await moverNo(id, novoParentId);
        router.refresh();
      } catch (e) {
        setErroMover(e instanceof Error ? e.message : "Falha ao mover.");
      }
    });
  }

  const raizDrop = useDroppable({ id: RAIZ_DROP_ID, disabled: arrastandoId == null });
  const noArrastado = arrastandoId ? locais.find((l) => l.id === arrastandoId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="mt-4">
        {podeGerenciar && (
          <div className="mb-3">
            {criandoFilhoEm === "__raiz__" ? (
              <NoForm
                parentId={null}
                onDone={() => { setCriandoFilhoEm(null); router.refresh(); }}
                onCancel={() => setCriandoFilhoEm(null)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setCriandoFilhoEm("__raiz__")}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10"
              >
                <PlusIcon size={14} />
                Novo local raiz (galpão, filial…)
              </button>
            )}
          </div>
        )}

        {erroMover && <p className="mb-3 text-xs text-danger">{erroMover}</p>}

        {/* Só aparece durante o arrasto — soltar aqui promove o nó a raiz
            (parent_id = null), sem precisar apagar e recriar. */}
        {arrastandoId && (
          <div
            ref={raizDrop.setNodeRef}
            className={cn(
              "mb-3 rounded-xl border-2 border-dashed px-3 py-3 text-center text-xs font-medium text-text-3 transition-colors",
              raizDrop.isOver ? "border-accent bg-accent/10 text-accent" : "border-border"
            )}
          >
            Soltar aqui para tornar &quot;{noArrastado?.nome ?? "este local"}&quot; um local raiz
          </div>
        )}

        {arvore.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-text-3">Nenhum local mapeado ainda.</p>
        ) : (
          arvore.map((no) => (
            <Linha
              key={no.id}
              no={no}
              profundidade={0}
              podeGerenciar={podeGerenciar}
              expandidos={expandidos}
              toggleExpandido={toggleExpandido}
              expandirNo={expandirNo}
              criandoFilhoEm={criandoFilhoEm}
              setCriandoFilhoEm={setCriandoFilhoEm}
              editando={editando}
              setEditando={setEditando}
              sugestoes={sugestoes}
              idsInvalidosParaSoltar={idsInvalidosParaSoltar}
            />
          ))
        )}
      </div>

      <DragOverlay>
        {noArrastado ? (
          <div className="flex items-center gap-2 rounded-xl border border-accent bg-surface px-3 py-2 text-sm font-medium text-text shadow-lg">
            <GripIcon size={14} />
            {noArrastado.nome}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

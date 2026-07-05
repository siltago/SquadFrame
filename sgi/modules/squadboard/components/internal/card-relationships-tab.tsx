"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { SearchIcon, PlusIcon, TrashIcon, ArrowLeftIcon, BuildingIcon } from "@/ui/icons";
import {
  salvarRelacionamento,
  removerRelacionamento,
} from "@/modules/squadboard/actions/internal-board";
import type { Setor } from "@/modules/squadboard/types/internal-board";
import {
  buscarObras,
  buscarLotesPorObra,
  buscarPedidosPorObra,
  buscarSolicitacoesPorObra,
  type ObraResult,
  type EntityResult,
} from "@/modules/squadboard/actions/squadsystem";
import {
  ENTITY_TYPE_LABELS,
  type CardEntityLink,
  type EntityType,
} from "@/modules/squadboard/types/entity-link";

// ── Tipos ──────────────────────────────────────────────────────────────

type SubType = "OBRA" | "WORK_PACKAGE" | "PEDIDO_COMPRA" | "SOLICITACAO_COMPRA";

const SUB_TABS: { id: SubType; label: string }[] = [
  { id: "OBRA", label: "Apenas a Obra" },
  { id: "WORK_PACKAGE", label: "Pacote de Trabalho" },
  { id: "PEDIDO_COMPRA", label: "Pedido de Compra" },
  { id: "SOLICITACAO_COMPRA", label: "Solicitação de Compra" },
];

function entityIcon(type: EntityType): string {
  switch (type) {
    case "WORK_PACKAGE": return "📦";
    case "OBRA": return "🏗️";
    case "PEDIDO_COMPRA": return "🛒";
    case "SOLICITACAO_COMPRA": return "📋";
    case "FORNECEDOR": return "🏭";
    case "CLIENTE": return "🤝";
    case "USUARIO": return "👤";
  }
}

// ── Step 1: busca de obras ─────────────────────────────────────────────

function ObraSearch({ onSelect }: { onSelect: (obra: ObraResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ObraResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Carregar obras recentes no mount
    buscarObras("").then(setResults).catch(() => {});
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await buscarObras(value);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 280);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">
        1. Selecionar Obra
      </p>
      <div className="relative">
        <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Buscar por nome ou código…"
          className="w-full bg-surface-2 border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-text placeholder:text-text-3 focus:outline-none focus:border-primary/50"
          autoFocus
        />
        {loading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin rounded-full border border-border border-t-primary" />
        )}
      </div>

      {results.length === 0 && !loading && (
        <p className="py-4 text-center text-xs text-text-3">
          {query ? "Nenhuma obra encontrada." : "Digite para buscar obras."}
        </p>
      )}

      <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
        {results.map((obra) => (
          <button
            key={obra.id}
            type="button"
            onClick={() => onSelect(obra)}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-left hover:border-primary/40 hover:bg-surface-2 transition-colors"
          >
            <BuildingIcon size={14} className="shrink-0 text-text-3" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-text">{obra.nome}</p>
              <p className="text-[10px] text-text-3">
                #{obra.numero}{obra.codigo ? ` · ${obra.codigo}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-[10px] text-primary">Selecionar →</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: picker de entidade dentro da obra ──────────────────────────

function EntityPicker({
  obra,
  cardId,
  setor,
  existingLinks,
  onLinked,
  onBack,
}: {
  obra: ObraResult;
  cardId: string;
  setor: Setor;
  existingLinks: CardEntityLink[];
  onLinked: (link: CardEntityLink) => void;
  onBack: () => void;
}) {
  const [subType, setSubType] = useState<SubType>("OBRA");
  const [entities, setEntities] = useState<EntityResult[]>([]);
  const [entityQuery, setEntityQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [, start] = useTransition();

  useEffect(() => {
    if (subType === "OBRA") { setEntities([]); return; }
    setLoading(true);
    setEntities([]);
    const fetchers: Record<SubType, () => Promise<EntityResult[]>> = {
      OBRA: () => Promise.resolve([]),
      WORK_PACKAGE: () => buscarLotesPorObra(obra.id),
      PEDIDO_COMPRA: () => buscarPedidosPorObra(obra.id),
      SOLICITACAO_COMPRA: () => buscarSolicitacoesPorObra(obra.id),
    };
    fetchers[subType]()
      .then(setEntities)
      .catch(() => setEntities([]))
      .finally(() => setLoading(false));
  }, [subType, obra.id]);

  function link(entityType: EntityType, entityId: string, label: string) {
    const alreadyLinked = existingLinks.some(
      (l) => l.entityType === entityType && l.entityId === entityId,
    );
    if (alreadyLinked) return;

    const tmpLink: CardEntityLink = {
      id: `tmp-${Date.now()}`,
      entityType,
      entityId,
      entityLabel: label,
      criadoEm: new Date().toISOString(),
    };
    onLinked(tmpLink);
    start(() => salvarRelacionamento(cardId, setor, entityType, entityId, label));
  }

  function linkObra() {
    const label = `${obra.nome} (#${obra.numero})`;
    link("OBRA", obra.id, label);
  }

  const filtered = entities.filter((e) =>
    e.label.toLowerCase().includes(entityQuery.toLowerCase()),
  );

  const isLinked = (type: EntityType, id: string) =>
    existingLinks.some((l) => l.entityType === type && l.entityId === id);

  return (
    <div className="flex flex-col gap-3">
      {/* Obra header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[11px] text-text-3 hover:text-text transition-colors"
        >
          <ArrowLeftIcon size={11} />
          Voltar
        </button>
        <span className="text-text-3">/</span>
        <div className="flex items-center gap-1.5 min-w-0">
          <BuildingIcon size={11} className="shrink-0 text-text-3" />
          <span className="truncate text-[11px] font-semibold text-text">{obra.nome}</span>
          <span className="text-[10px] text-text-3 shrink-0">#{obra.numero}</span>
        </div>
      </div>

      {/* Sub-type tabs */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">
        2. Vincular a
      </p>
      <div className="flex gap-1 flex-wrap">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setSubType(tab.id); setEntityQuery(""); }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              subType === tab.id
                ? "bg-primary text-white"
                : "bg-surface-2 border border-border text-text-2 hover:border-primary/40"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {subType === "OBRA" ? (
        <button
          type="button"
          onClick={linkObra}
          disabled={isLinked("OBRA", obra.id)}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-left hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <BuildingIcon size={14} className="shrink-0 text-text-3" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold text-text">{obra.nome}</p>
            <p className="text-[10px] text-text-3">#{obra.numero}{obra.codigo ? ` · ${obra.codigo}` : ""}</p>
          </div>
          {isLinked("OBRA", obra.id) ? (
            <span className="shrink-0 text-[10px] text-green-600 font-medium">Vinculado ✓</span>
          ) : (
            <span className="shrink-0 text-[10px] text-primary">Vincular</span>
          )}
        </button>
      ) : (
        <>
          {entities.length > 4 && (
            <input
              type="text"
              value={entityQuery}
              onChange={(e) => setEntityQuery(e.target.value)}
              placeholder="Filtrar…"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-text placeholder:text-text-3 focus:outline-none focus:border-primary/50"
            />
          )}

          {loading && (
            <p className="py-3 text-center text-xs text-text-3 animate-pulse">Carregando…</p>
          )}

          {!loading && filtered.length === 0 && (
            <p className="py-3 text-center text-xs text-text-3">
              Nenhum item encontrado para esta obra.
            </p>
          )}

          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {filtered.map((entity) => {
              const linked = isLinked(subType as EntityType, entity.id);
              return (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => !linked && link(subType as EntityType, entity.id, entity.label)}
                  disabled={linked}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:border-primary/40 hover:bg-surface-2 transition-colors disabled:opacity-60"
                >
                  <span className="text-sm shrink-0">{entityIcon(subType as EntityType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-medium text-text">{entity.label}</p>
                    {entity.sub && (
                      <p className="text-[10px] text-text-3">{entity.sub}</p>
                    )}
                  </div>
                  {linked ? (
                    <span className="shrink-0 text-[10px] text-green-600 font-medium">Vinculado ✓</span>
                  ) : (
                    <PlusIcon size={11} className="shrink-0 text-text-3" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Tab principal ──────────────────────────────────────────────────────

export function CardRelationshipsTab({
  relacionamentos: initial,
  cardId,
  setor,
}: {
  relacionamentos: CardEntityLink[];
  cardId: string;
  setor: Setor;
}) {
  const [links, setLinks] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [selectedObra, setSelectedObra] = useState<ObraResult | null>(null);
  const [, start] = useTransition();

  function remove(linkId: string) {
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
    start(() => removerRelacionamento(linkId));
  }

  function handleLinked(link: CardEntityLink) {
    setLinks((prev) => [...prev, link]);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Lista de vínculos existentes */}
      {links.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {links.map((link) => (
            <div
              key={link.id}
              className="group flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2"
            >
              <span className="text-sm shrink-0">{entityIcon(link.entityType)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-3">
                  {ENTITY_TYPE_LABELS[link.entityType]}
                </p>
                <p className="truncate text-xs font-medium text-text">
                  {link.entityLabel ?? link.entityId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(link.id)}
                className="hidden group-hover:flex shrink-0 text-text-3 hover:text-danger transition-colors"
              >
                <TrashIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Adicionar novo vínculo */}
      {adding ? (
        <div className="rounded-xl border border-border bg-surface p-3 flex flex-col gap-3">
          {selectedObra === null ? (
            <ObraSearch onSelect={setSelectedObra} />
          ) : (
            <EntityPicker
              obra={selectedObra}
              cardId={cardId}
              setor={setor}
              existingLinks={links}
              onLinked={handleLinked}
              onBack={() => setSelectedObra(null)}
            />
          )}
          <button
            type="button"
            onClick={() => { setAdding(false); setSelectedObra(null); }}
            className="self-start text-[11px] text-text-3 hover:text-text transition-colors"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-text-3 hover:border-primary/40 hover:text-text transition-colors"
        >
          <PlusIcon size={12} />
          Vincular entidade
        </button>
      )}
    </div>
  );
}

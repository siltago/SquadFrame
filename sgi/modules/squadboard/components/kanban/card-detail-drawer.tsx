"use client";

import { useState } from "react";
import { Drawer } from "@/ui/components/Drawer";
import { Tabs, TabList, Tab, TabPanel } from "@/ui/components/Tabs";
import { Checkbox } from "@/ui/components/Checkbox";
import { Textarea } from "@/ui/components/Input";
import { Button } from "@/ui/components/Button";
import { Badge } from "@/ui/components/Badge";
import { Avatar, AvatarGroup } from "@/ui/components/Avatar";
import { EmptyState } from "@/ui/components/EmptyState";
import { AttachmentIcon, ClockIcon, CheckSquareIcon, ImageIcon, FileIcon, LinkIcon, SendIcon } from "@/ui/icons";
import { PriorityDot } from "./priority-dot";
import type { BoardCard } from "@/modules/squadboard/types/board";

function CommentIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function relativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}m atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export function CardDetailDrawer({
  card, open, onClose,
}: {
  card: BoardCard | null;
  open: boolean;
  onClose: () => void;
}) {
  const [novoComentario, setNovoComentario] = useState("");

  if (!card) return null;

  const checklistTotal = card.checklist.length;
  const checklistFeito = card.checklist.filter((i) => i.feito).length;

  return (
    <Drawer open={open} onClose={onClose} side="right" size="lg" title={card.titulo}>
      <div className="flex flex-col gap-5">
        {/* Meta principal */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-3">Prioridade</p>
            <PriorityDot prioridade={card.prioridade} showLabel />
          </div>
          {card.cliente && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-3">Cliente</p>
              <p className="text-text">{card.cliente}</p>
            </div>
          )}
          {card.prazo && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-3">Prazo</p>
              <p className="flex items-center gap-1.5 text-text">
                <ClockIcon size={13} />
                {new Date(card.prazo).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          )}
          {card.tempoEstimadoH != null && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-3">Estimativa</p>
              <p className="text-text">{card.tempoEstimadoH}h</p>
            </div>
          )}
        </div>

        {/* Responsáveis */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">Responsáveis</p>
          {card.responsaveis.length > 0 ? (
            <AvatarGroup items={card.responsaveis.map((m) => ({ name: m.nome }))} />
          ) : (
            <p className="text-sm text-text-3">Sem responsável</p>
          )}
        </div>

        {/* Etiquetas */}
        {card.etiquetas.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">Etiquetas</p>
            <div className="flex flex-wrap gap-1.5">
              {card.etiquetas.map((e) => <Badge key={e.id} variant={e.cor} size="sm">{e.nome}</Badge>)}
            </div>
          </div>
        )}

        {/* Descrição */}
        {card.descricao && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">Descrição</p>
            <p className="text-sm leading-relaxed text-text-2">{card.descricao}</p>
          </div>
        )}

        {/* Tabs: Checklist / Comentários / Timeline / Anexos */}
        <Tabs defaultTab="checklist">
          <TabList variant="underline">
            <Tab id="checklist" icon={<CheckSquareIcon size={14} />} badge={checklistTotal > 0 ? `${checklistFeito}/${checklistTotal}` : undefined}>
              Checklist
            </Tab>
            <Tab id="comentarios" icon={<CommentIcon />} badge={card.comentarios.length || undefined}>
              Comentários
            </Tab>
            <Tab id="timeline" icon={<ClockIcon size={14} />}>Timeline</Tab>
            <Tab id="anexos" icon={<AttachmentIcon size={14} />} badge={card.anexos.length || undefined}>
              Anexos
            </Tab>
          </TabList>

          <TabPanel id="checklist" className="pt-4">
            {card.checklist.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {card.checklist.map((item) => (
                  <Checkbox key={item.id} label={item.texto} defaultChecked={item.feito} />
                ))}
              </div>
            ) : (
              <EmptyState size="sm" title="Nenhum item no checklist" />
            )}
          </TabPanel>

          <TabPanel id="comentarios" className="pt-4">
            <div className="flex flex-col gap-4">
              {card.comentarios.length > 0 ? (
                card.comentarios.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar name={c.autor.nome} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-text">{c.autor.nome}</span>
                        <span className="text-xs text-text-3">{relativo(c.criadoEm)}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-text-2">{c.texto}</p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState size="sm" title="Nenhum comentário ainda" />
              )}

              <div className="flex items-start gap-2.5 border-t border-divider pt-4">
                <Avatar size="sm" />
                <div className="flex-1">
                  <Textarea
                    fullWidth
                    rows={2}
                    placeholder="Escreva um comentário…"
                    value={novoComentario}
                    onChange={(e) => setNovoComentario(e.target.value)}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" disabled={!novoComentario.trim()} className="gap-1.5">
                      <SendIcon size={13} />
                      Comentar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel id="timeline" className="pt-4">
            {card.timeline.length > 0 ? (
              <ol className="flex flex-col gap-4">
                {[...card.timeline].reverse().map((ev) => (
                  <li key={ev.id} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-text-3" />
                      <span className="mt-1 w-px flex-1 bg-divider" />
                    </div>
                    <p className="text-sm text-text-2 -mt-0.5">
                      <span className="font-medium text-text">{ev.autor.nome}</span> {ev.acao}
                      <span className="ml-1.5 text-xs text-text-3">{relativo(ev.criadoEm)}</span>
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState size="sm" title="Sem eventos" />
            )}
          </TabPanel>

          <TabPanel id="anexos" className="pt-4">
            {card.anexos.length > 0 ? (
              <div className="flex flex-col gap-2">
                {card.anexos.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-3">
                      {a.tipo === "imagem" ? <ImageIcon size={15} /> : a.tipo === "link" ? <LinkIcon size={15} /> : <FileIcon size={15} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{a.nome}</p>
                      <p className="text-xs text-text-3">{a.tamanho}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState size="sm" title="Nenhum anexo" />
            )}
          </TabPanel>
        </Tabs>
      </div>
    </Drawer>
  );
}

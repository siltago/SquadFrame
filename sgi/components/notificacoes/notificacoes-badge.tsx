"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import {
  buscarNotificacoes,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
} from "@/app/tarefas/actions";
import type { Notificacao } from "@/types/kanban";

const TIPO_LABEL: Record<string, string> = {
  tarefa_atribuida:            "Tarefa atribuída",
  tarefa_comentario:           "Novo comentário em tarefa",
  pedido_aprovado:             "Pedido aprovado",
  pedido_aguardando_aprovacao: "Pedido aguardando aprovação",
  solicitacao_aprovada:        "Solicitação aprovada",
  solicitacao_rejeitada:       "Solicitação rejeitada",
};

function resolverLink(n: Notificacao): { href: string; label: string } | null {
  const p = n.payload as Record<string, string>;
  switch (n.tipo) {
    case "tarefa_atribuida":
    case "tarefa_comentario":
      if (n.tarefa_id) return { href: `/tarefas?tarefa=${n.tarefa_id}`, label: p.titulo ?? "Ver tarefa" };
      break;
    case "pedido_aguardando_aprovacao":
    case "pedido_aprovado":
      if (p.order_id) return { href: `/compras/pedidos/${p.order_id}`, label: p.numero ?? "Ver pedido" };
      break;
    case "solicitacao_aprovada":
    case "solicitacao_rejeitada":
      if (p.request_id) return { href: `/compras/solicitacoes/${p.request_id}`, label: p.numero ?? "Ver solicitação" };
      break;
  }
  return null;
}

interface Props {
  usuarioId: string;
  naoLidasIniciais: number;
}

function RelativeTime({ ts }: { ts: string }) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return <>agora</>;
  if (mins < 60) return <>{mins}m</>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <>{hrs}h</>;
  return <>{Math.floor(hrs / 24)}d</>;
}

export function NotificacoesBadge({ usuarioId, naoLidasIniciais }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(naoLidasIniciais);
  const [carregado, setCarregado] = useState(false);
  const [, startTransition] = useTransition();

  // Subscrição realtime para novos registros na tabela notificacoes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notificacoes-${usuarioId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `usuario_id=eq.${usuarioId}`,
        },
        (payload) => {
          const nova = payload.new as Notificacao;
          setNotificacoes((prev) => [nova, ...prev]);
          setNaoLidas((n) => n + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notificacoes",
          filter: `usuario_id=eq.${usuarioId}`,
        },
        (payload) => {
          const atualizada = payload.new as Notificacao;
          setNotificacoes((prev) =>
            prev.map((n) => (n.id === atualizada.id ? atualizada : n))
          );
          if (atualizada.lida) {
            setNaoLidas((c) => Math.max(0, c - 1));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [usuarioId]);

  async function handleAbrir() {
    setAberto((p) => !p);
    if (!carregado) {
      const r = await buscarNotificacoes(30);
      setNotificacoes(r.notificacoes);
      setNaoLidas(r.naoLidas);
      setCarregado(true);
    }
  }

  function handleMarcarLida(id: string) {
    startTransition(async () => {
      await marcarNotificacaoLida(id);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
      setNaoLidas((c) => Math.max(0, c - 1));
    });
  }

  function handleMarcarTodas() {
    startTransition(async () => {
      await marcarTodasNotificacoesLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      setNaoLidas(0);
    });
  }

  return (
    <div className="relative">
      <button
        onClick={handleAbrir}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        title="Notificações"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-line bg-surface shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <span className="text-sm font-semibold text-ink">Notificações</span>
              {naoLidas > 0 && (
                <button
                  onClick={handleMarcarTodas}
                  className="text-xs text-steel hover:underline"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-line">
              {notificacoes.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-ink-faint">
                  Nenhuma notificação
                </div>
              ) : (
                notificacoes.map((n) => {
                  const link = resolverLink(n);
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!link) return;
                        if (!n.lida) handleMarcarLida(n.id);
                        setAberto(false);
                        router.push(link.href);
                      }}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${!n.lida ? "bg-steel/5" : ""} ${link ? "cursor-pointer hover:bg-canvas" : ""}`}
                    >
                      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.lida ? "bg-steel" : ""}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink">
                          {TIPO_LABEL[n.tipo] ?? n.tipo}
                        </p>
                        {link && (
                          <p className="truncate text-xs text-steel">
                            {link.label} →
                          </p>
                        )}
                        <span className="text-[10px] text-ink-faint">
                          <RelativeTime ts={n.criado_em} />
                        </span>
                      </div>
                      {!n.lida && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarcarLida(n.id); }}
                          className="shrink-0 text-[10px] text-ink-faint hover:text-steel transition-colors mt-0.5"
                          title="Marcar como lida"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

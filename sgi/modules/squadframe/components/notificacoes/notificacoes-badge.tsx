"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, BellDotIcon, CloseIcon } from "@/ui/icons";
import { createClient } from "@/shared/database/supabase-client";
import {
  buscarNotificacoes,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
} from "@/modules/squadframe/actions/tarefas/actions";
import { TIPOS_NOTIFICACAO_POR_ESCOPO, type EscopoNotificacao, type Notificacao } from "@/modules/squadframe/types/kanban";

const TIPO_LABEL: Record<string, string> = {
  tarefa_atribuida:            "Tarefa atribuída",
  tarefa_comentario:           "Novo comentário em tarefa",
  pedido_aprovado:             "Pedido aprovado — emita agora",
  pedido_aguardando_aprovacao: "Pedido aguardando aprovação",
  solicitacao_aprovada:        "Solicitação aprovada",
  solicitacao_rejeitada:       "Solicitação rejeitada",
  debito_carteira_falhou:      "Débito da carteira não realizado",
  pedido_cobranca_prazo:       "Cobrança: pedido aguardando aprovação",
  solicitacao_cobranca_prazo:  "Cobrança: solicitação aguardando aprovação",
  retorno_pedido_solicitado:   "Retorno de pedido solicitado",
  retorno_pedido_aprovado:     "Retorno de pedido aprovado",
  retorno_pedido_rejeitado:    "Retorno de pedido rejeitado",
  devolucao_pedido_criada:     "Devolução de pedido criada",
  // SquadBoard
  board_card_atribuido:        "Card atribuído a você",
  board_card_movido:           "Card movido de coluna",
  board_card_comentario:       "Novo comentário no card",
  board_checklist_mencionado:  "Você foi mencionado no checklist",
  board_card_prazo_proximo:    "Card com prazo amanhã",
};

function resolverLink(n: Notificacao): { href: string; label: string } | null {
  const p = n.payload as Record<string, string>;
  switch (n.tipo) {
    case "tarefa_atribuida":
    case "tarefa_comentario":
      if (n.tarefa_id) return { href: `/squadframe/tarefas?tarefa=${n.tarefa_id}`, label: p.titulo ?? "Ver tarefa" };
      break;
    case "pedido_aguardando_aprovacao":
    case "pedido_aprovado":
    case "debito_carteira_falhou":
    case "pedido_cobranca_prazo":
    case "retorno_pedido_solicitado":
    case "retorno_pedido_aprovado":
    case "retorno_pedido_rejeitado":
    case "devolucao_pedido_criada":
      if (p.order_id) return { href: `/squadframe/compras/pedidos/${p.order_id}`, label: p.numero ?? "Ver pedido" };
      break;
    case "solicitacao_aprovada":
    case "solicitacao_rejeitada":
    case "solicitacao_cobranca_prazo":
      if (p.request_id) return { href: `/squadframe/compras/solicitacoes/${p.request_id}`, label: p.numero ?? "Ver solicitação" };
      break;
    case "board_card_atribuido":
    case "board_card_movido":
    case "board_card_comentario":
    case "board_checklist_mencionado":
    case "board_card_prazo_proximo":
      if (p.card_id) return { href: `/squadboard/interno?card=${p.card_id}`, label: (p.card_titulo as string) ?? "Ver card" };
      break;
  }
  return null;
}

interface Props {
  usuarioId: string;
  naoLidasIniciais: number;
  // Cada módulo só enxerga os tipos que ele mesmo produz — mesma tabela,
  // mesmo push, sino separado. Ver TIPOS_NOTIFICACAO_POR_ESCOPO.
  escopo: EscopoNotificacao;
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

export function NotificacoesBadge({ usuarioId, naoLidasIniciais, escopo }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(naoLidasIniciais);
  const [carregado, setCarregado] = useState(false);
  const [banners, setBanners] = useState<Notificacao[]>([]);
  const [, startTransition] = useTransition();

  const tiposDoEscopo = TIPOS_NOTIFICACAO_POR_ESCOPO[escopo];
  // Nome de canal único por montagem — em dev, o StrictMode monta o
  // componente duas vezes rapidamente (mount → cleanup → mount); com o
  // mesmo nome de tópico nas duas vezes, o "leave" da primeira pode não
  // terminar no servidor antes do "join" da segunda chegar, deixando a
  // segunda inscrição "fantasma" (cliente marca SUBSCRIBED mas o servidor
  // nunca entrega eventos pra esse tópico). Um sufixo aleatório por
  // instância elimina qualquer colisão de tópico entre montagens.
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  function dispensarBanner(id: string) {
    setBanners((prev) => prev.filter((n) => n.id !== id));
  }

  function abrirBanner(n: Notificacao) {
    dispensarBanner(n.id);
    const link = resolverLink(n);
    if (!link) return;
    if (!n.lida) handleMarcarLida(n.id);
    router.push(link.href);
  }

  // Subscrição realtime para novos registros na tabela notificacoes. O
  // filtro do Realtime só suporta igualdade simples (usuario_id=eq.X), então
  // o recorte por tipo é feito no cliente após o evento chegar.
  useEffect(() => {
    // Em dev, o StrictMode roda esse efeito, desmonta e roda de novo na
    // hora — a primeira execução é sempre descartada. Se ela chega a
    // chamar .subscribe() (join no servidor) antes do cleanup rodar
    // (remoteChannel = leave), as duas mensagens ficam correndo quase
    // juntas no mesmo socket, e a segunda inscrição (a que "vale", com o
    // componente que fica montado de verdade) fica "fantasma": o cliente
    // marca SUBSCRIBED normalmente, mas o servidor nunca entrega eventos
    // pra ela. Adiar o .subscribe() por um tick e checar se o efeito já
    // foi cancelado evita que a primeira montagem (descartável) chegue a
    // mandar o join — só a montagem que realmente fica de pé assina.
    let cancelado = false;
    const supabase = createClient();
    const channel = supabase
      .channel(`notificacoes-${escopo}-${usuarioId}-${instanceIdRef.current}`)
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
          if (!tiposDoEscopo.includes(nova.tipo)) return;
          setNotificacoes((prev) => [nova, ...prev]);
          setNaoLidas((n) => n + 1);
          // Banner efêmero — some sozinho depois de um tempo, mas o sino
          // (acima) já ficou marcado, então nada se perde se o usuário não
          // ver a tempo.
          setBanners((prev) => [...prev, nova]);
          setTimeout(() => dispensarBanner(nova.id), 7000);
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
          if (!tiposDoEscopo.includes(atualizada.tipo)) return;
          setNotificacoes((prev) =>
            prev.map((n) => (n.id === atualizada.id ? atualizada : n))
          );
          if (atualizada.lida) {
            setNaoLidas((c) => Math.max(0, c - 1));
          }
        }
      );

    const timer = setTimeout(() => {
      if (!cancelado) channel.subscribe();
    }, 0);

    return () => {
      cancelado = true;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [usuarioId, escopo, tiposDoEscopo]);

  async function handleAbrir() {
    setAberto((p) => !p);
    if (!carregado) {
      const r = await buscarNotificacoes(30, escopo);
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
      await marcarTodasNotificacoesLidas(escopo);
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
        <BellIcon size={18} />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {/* Banners efêmeros — surgem no realtime, somem sozinhos. O sino acima
          já registrou a notificação, então perder o banner não perde nada. */}
      <div
        className="fixed z-[190] flex flex-col gap-2 pointer-events-none"
        style={{ top: "calc(1rem + env(safe-area-inset-top))", right: "calc(1rem + env(safe-area-inset-right))" }}
      >
        {banners.map((n) => {
          const link = resolverLink(n);
          return (
            <div
              key={n.id}
              onClick={() => abrirBanner(n)}
              className={`pointer-events-auto flex w-72 items-start gap-2.5 rounded-xl border border-border bg-surface p-3 shadow-lg sm:w-80 ${link ? "cursor-pointer" : ""}`}
              style={{ animation: "slideDownBanner 0.2s ease-out" }}
            >
              <span className="mt-0.5 shrink-0 text-primary"><BellDotIcon size={16} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text">{TIPO_LABEL[n.tipo] ?? n.tipo}</p>
                {link && <p className="truncate text-xs text-primary">{link.label} →</p>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dispensarBanner(n.id); }}
                className="shrink-0 text-text-3 hover:text-text-2"
                aria-label="Fechar"
              >
                <CloseIcon size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideDownBanner { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="fixed inset-x-4 top-16 z-50 mx-auto max-w-sm rounded-xl border border-border bg-surface shadow-xl overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:max-w-none">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-text">Notificações</span>
              {naoLidas > 0 && (
                <button
                  onClick={handleMarcarTodas}
                  className="text-xs text-primary hover:underline"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-border">
              {notificacoes.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-text-3">
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
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${!n.lida ? "bg-primary/5" : ""} ${link ? "cursor-pointer hover:bg-bg" : ""}`}
                    >
                      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.lida ? "bg-primary" : ""}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text">
                          {TIPO_LABEL[n.tipo] ?? n.tipo}
                        </p>
                        {link && (
                          <p className="truncate text-xs text-primary">
                            {link.label} →
                          </p>
                        )}
                        <span className="text-[10px] text-text-3">
                          <RelativeTime ts={n.criado_em} />
                        </span>
                      </div>
                      {!n.lida && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarcarLida(n.id); }}
                          className="shrink-0 text-[10px] text-text-3 hover:text-primary transition-colors mt-0.5"
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

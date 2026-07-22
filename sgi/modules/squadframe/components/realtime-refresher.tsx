"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/database/supabase-client";

export type RealtimeSub = {
  table: string;
  filter?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
};

interface Props {
  /** Nome único do channel Supabase — deve ser estável entre renders */
  channelName: string;
  /** Tabelas e filtros para escutar */
  subs: RealtimeSub[];
  /** Debounce em ms antes de disparar router.refresh() (padrão: 400) */
  debounceMs?: number;
}

/**
 * Componente invisível que escuta Supabase Realtime e chama router.refresh()
 * automaticamente quando qualquer dado relevante muda no banco.
 *
 * Coloque junto ao conteúdo do Server Component que precisa ser reativo.
 * O router.refresh() do Next.js App Router re-executa apenas os Server Components
 * da rota atual — sem recarregar JS, sem flash, sem perda de estado de Client Components.
 */
export function RealtimeRefresher({ channelName, subs, debounceMs = 400 }: Props) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Usamos ref para subs pois o array é recriado a cada render mas o conteúdo é estável
  const subsRef = useRef(subs);
  subsRef.current = subs;
  // Sufixo único por montagem — em dev, o StrictMode monta o componente duas
  // vezes rapidamente (mount → cleanup → mount); com o mesmo nome de tópico
  // nas duas vezes, o "leave" da primeira pode não terminar no servidor
  // antes do "join" da segunda chegar, deixando a inscrição "fantasma"
  // (cliente marca SUBSCRIBED mas o servidor nunca entrega eventos pra esse
  // tópico). channelName continua controlando o dedup lógico (mesmo nome =
  // mesma tela), só o sufixo evita a colisão entre as duas montagens.
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    const supabase = createClient();

    function handleChange() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => router.refresh(), debounceMs);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel = supabase.channel(`${channelName}-${instanceIdRef.current}`) as any;

    for (const sub of subsRef.current) {
      channel = channel.on(
        "postgres_changes",
        {
          event: sub.event ?? "*",
          schema: "public",
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        handleChange,
      );
    }

    // Em dev, o StrictMode roda esse efeito, desmonta e roda de novo na
    // hora — a primeira execução é sempre descartada. Se ela chegar a
    // mandar o join (channel.subscribe()) antes do cleanup rodar, a
    // segunda montagem (a que fica de pé de verdade) pode ficar "fantasma":
    // o cliente marca SUBSCRIBED, mas o servidor nunca entrega eventos pra
    // ela. Adiar o subscribe por um tick e checar se o efeito já foi
    // cancelado evita que a montagem descartável chegue a mandar o join.
    let cancelado = false;
    const subscribeTimer = setTimeout(() => {
      if (!cancelado) channel.subscribe();
    }, 0);

    return () => {
      cancelado = true;
      clearTimeout(subscribeTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [channelName, debounceMs, router]);

  return null;
}

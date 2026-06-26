"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

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

  useEffect(() => {
    const supabase = createClient();

    function handleChange() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => router.refresh(), debounceMs);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel = supabase.channel(channelName) as any;

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

    channel.subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [channelName, debounceMs, router]);

  return null;
}

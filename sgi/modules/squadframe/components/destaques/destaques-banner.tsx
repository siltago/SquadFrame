"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Alert } from "@/ui/components/Alert";
import { adiarDestaquesParaAmanha } from "@/modules/squadframe/actions/destaques";
import type { Destaque } from "@/modules/squadframe/services/destaques/types";

// Banner de primeiro acesso do dia com os "Destaques" que o usuário tem
// permissão de resolver (ver detectarDestaquesDashboard) — separado do
// PendenciasGate (pendências pessoais de compras). Fica atrás dele na
// pilha (z-[190] vs z-[200]): se os dois tiverem algo pra mostrar, o
// usuário fecha as pendências pessoais primeiro e só depois vê os
// destaques gerais, sem os dois disputando a tela ao mesmo tempo.
export function DestaquesBanner({ destaquesIniciais }: { destaquesIniciais: Destaque[] }) {
  const [fechado, setFechado] = useState(false);
  const [adiando, startAdiar] = useTransition();

  if (destaquesIniciais.length === 0 || fechado) return null;

  function fechar() {
    startAdiar(async () => {
      await adiarDestaquesParaAmanha();
      setFechado(true);
    });
  }

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-bg p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Destaques</p>
            <h2 className="mt-1 text-xl font-bold text-text">O que precisa da sua atenção hoje</h2>
          </div>
          <button
            onClick={fechar}
            disabled={adiando}
            title="Fechar e lembrar de novo amanhã"
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-2 hover:bg-bg disabled:opacity-50"
          >
            {adiando ? "Fechando…" : "Entendi"}
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {destaquesIniciais.map((d) => (
            <Alert key={d.tipo} variant={d.variant} title={d.titulo}>
              {d.corpo}{" "}
              <Link href={d.href} onClick={fechar} className="font-semibold underline">
                Ver
              </Link>
            </Alert>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { CardPanel } from "./card-panel";

interface Props {
  tarefaId: string;
}

export function TarefaStandaloneWrapper({ tarefaId }: Props) {
  const router = useRouter();

  return (
    <div className="relative flex" style={{ minHeight: "calc(100dvh - 100px)" }}>
      {/* Painel em modo standalone: ocupa a tela toda sem overlay */}
      <div className="w-full max-w-2xl mx-auto">
        <CardPanel
          tarefaId={tarefaId}
          onClose={() => router.back()}
          standalone
        />
      </div>
    </div>
  );
}

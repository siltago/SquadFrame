"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buscarRomaneioPorNumero, type RomaneioBusca } from "@/modules/squadstock/actions/buscar-romaneio";
import { Input } from "@/ui/components/Input";
import { Button } from "@/ui/components/Button";

export function BuscaRomaneio() {
  const [numero, setNumero] = useState("");
  const [resultados, setResultados] = useState<RomaneioBusca[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    start(async () => {
      try {
        const r = await buscarRomaneioPorNumero(numero);
        if (r.length === 0) { setErro("Nenhum romaneio encontrado com esse número."); setResultados(null); }
        else if (r.length === 1) { router.push(`/squadstock/recebimento/romaneio/${r[0].id}`); }
        else { setResultados(r); }
      } catch (e: any) { setErro(e.message); }
    });
  }

  return (
    <div className="card p-4">
      <form onSubmit={buscar} className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Buscar romaneio por número"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Ex: 12345"
          />
        </div>
        <Button type="submit" disabled={pending}>{pending ? "Buscando…" : "Buscar"}</Button>
      </form>
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
      {resultados && (
        <ul className="mt-3 divide-y divide-border">
          {resultados.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                Romaneio {r.numero ?? "—"} · {r.fornecedor?.nome ?? "Fornecedor não identificado"}
                {r.data_entrega && ` · ${new Date(r.data_entrega + "T00:00:00").toLocaleDateString("pt-BR")}`}
              </span>
              <Button as="a" href={`/squadstock/recebimento/romaneio/${r.id}`} variant="ghost" className="text-xs">
                Abrir
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

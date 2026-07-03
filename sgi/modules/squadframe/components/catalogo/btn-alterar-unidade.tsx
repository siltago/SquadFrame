"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarUnidadeLinha, definirComprimentoLinha } from "@/modules/squadframe/actions/catalogo/actions";
import { Button } from "@/ui/components/Button";

type Aba = "unidade" | "comprimento";

export function BtnAlterarUnidade({ linhaId }: { linhaId: string }) {
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<Aba>("unidade");
  const [de, setDe] = useState("ML");
  const [para, setPara] = useState("BARRA");
  const [comprimento, setComprimento] = useState("6000");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function flash(texto: string) {
    setMsg(texto);
    setAberto(false);
    router.refresh();
    setTimeout(() => setMsg(null), 4000);
  }

  function confirmarUnidade() {
    if (!de.trim() || !para.trim()) return;
    startTransition(async () => {
      const res = await atualizarUnidadeLinha(linhaId, de.trim().toUpperCase(), para.trim().toUpperCase());
      flash(res.atualizados > 0
        ? `${res.atualizados} produto${res.atualizados !== 1 ? "s" : ""} atualizado${res.atualizados !== 1 ? "s" : ""}.`
        : "Nenhum produto encontrado com essa unidade.");
    });
  }

  function confirmarComprimento() {
    const mm = parseInt(comprimento);
    if (!mm || mm <= 0) return;
    startTransition(async () => {
      const res = await definirComprimentoLinha(linhaId, mm);
      flash(res.atualizados > 0
        ? `${res.atualizados} produto${res.atualizados !== 1 ? "s" : ""} atualizado${res.atualizados !== 1 ? "s" : ""} para ${mm} mm.`
        : "Todos os produtos já têm comprimento definido.");
    });
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-2 hover:border-primary hover:text-primary transition-colors"
        title="Edição em massa"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
        </svg>
        Edição em massa
      </button>

      {msg && <span className="text-sm font-medium text-success">{msg}</span>}

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">

            {/* Tabs */}
            <div className="flex border-b border-border">
              {(["unidade", "comprimento"] as Aba[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setAba(t)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    aba === t ? "text-primary border-b-2 border-primary" : "text-text-2 hover:text-text"
                  }`}
                >
                  {t === "unidade" ? "Unidade" : "Comprimento"}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {aba === "unidade" && (
                <>
                  <p className="text-xs text-text-3">Substitui a unidade de todos os produtos desta linha com a unidade informada.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">De</label>
                      <input value={de} onChange={(e) => setDe(e.target.value.toUpperCase())} className="field text-sm font-mono" placeholder="ML" />
                    </div>
                    <div>
                      <label className="label">Para</label>
                      <input value={para} onChange={(e) => setPara(e.target.value.toUpperCase())} className="field text-sm font-mono" placeholder="BARRA" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setAberto(false)} disabled={pending} className="text-sm">Cancelar</Button>
                    <Button onClick={confirmarUnidade} disabled={pending || !de || !para} className="text-sm disabled:opacity-50">
                      {pending ? "Atualizando…" : "Atualizar todos"}
                    </Button>
                  </div>
                </>
              )}

              {aba === "comprimento" && (
                <>
                  <p className="text-xs text-text-3">Define o comprimento (mm) nos produtos desta linha que ainda não têm comprimento cadastrado.</p>
                  <div>
                    <label className="label">Comprimento (mm)</label>
                    <input
                      type="number"
                      value={comprimento}
                      onChange={(e) => setComprimento(e.target.value)}
                      className="field text-sm font-mono"
                      placeholder="6000"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setAberto(false)} disabled={pending} className="text-sm">Cancelar</Button>
                    <Button onClick={confirmarComprimento} disabled={pending || !comprimento} className="text-sm disabled:opacity-50">
                      {pending ? "Atualizando…" : "Definir em todos"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

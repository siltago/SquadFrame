"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarLotePlanejamento, criarLoteComXmlPlanejamento } from "@/modules/squadframe/actions/planejamento/actions";
import { lerArquivoXml, parseXml, type RascunhoTipologia } from "@/modules/squadframe/lib/xml-tipologias";
import { Button } from "@/ui/components/Button";
import { Modal } from "@/ui/components/Modal";
import { Input, Textarea } from "@/ui/components/Input";

export function NovoLoteModal({ obraId }: { obraId: string }) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const [rascunhos, setRascunhos] = useState<RascunhoTipologia[] | null>(null);
  const [erroXml, setErroXml] = useState<string | null>(null);
  const [nomeSugerido, setNomeSugerido] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function fechar() {
    setAberto(false);
    setRascunhos(null);
    setErroXml(null);
    setNomeSugerido("");
    setErro(null);
  }

  function handleXmlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setErroXml(null);
    lerArquivoXml(file)
      .then((text) => {
        const parsed = parseXml(text);
        if (parsed.length === 0) { setErroXml("Nenhuma tipologia encontrada no XML."); return; }
        setRascunhos(parsed);
        setNomeSugerido(file.name.replace(/\.xml$/i, ""));
      })
      .catch(() => setErroXml("Erro ao ler o arquivo XML."));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nome = String(fd.get("nome") || "").trim();
    const numeroExterno = String(fd.get("numero_externo") || "").trim() || null;
    const descricao = String(fd.get("descricao") || "").trim() || null;
    setErro(null);
    startTransition(async () => {
      try {
        if (rascunhos && rascunhos.length > 0) {
          await criarLoteComXmlPlanejamento(obraId, nome, numeroExterno, descricao, rascunhos.map(({ _key, ...rest }) => rest));
        } else {
          await criarLotePlanejamento(obraId, fd);
        }
        fechar();
        router.refresh();
      } catch (e: any) {
        setErro(e.message);
      }
    });
  }

  return (
    <>
      <Button onClick={() => setAberto(true)}>Novo lote</Button>
      <Modal open={aberto} onClose={fechar} title="Novo lote" size="sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {erro && <p className="text-xs text-danger">{erro}</p>}

          <div>
            <label className="label">Importar XML de tipologias <span className="font-normal text-text-2">(opcional)</span></label>
            {rascunhos ? (
              <div className="mt-1 space-y-2 rounded-lg border border-primary/30 bg-primary-soft p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-text">{rascunhos.length} tipologia{rascunhos.length !== 1 ? "s" : ""} carregada{rascunhos.length !== 1 ? "s" : ""}</p>
                  <button type="button" onClick={() => { setRascunhos(null); setNomeSugerido(""); }} className="text-xs text-text-3 hover:text-danger">Remover</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm font-medium text-text-2 hover:border-primary hover:text-primary transition-colors">
                Selecionar arquivo XML
              </button>
            )}
            <input ref={fileRef} type="file" accept=".xml,text/xml" className="hidden" onChange={handleXmlChange} />
            {erroXml && <p className="mt-1 text-xs text-danger">{erroXml}</p>}
          </div>

          <Input key={nomeSugerido} label="Nome" name="nome" required defaultValue={nomeSugerido} placeholder="Ex: Fachada Norte" />
          <Input label="Número externo" name="numero_externo" placeholder="Número do outro sistema (ERP)" />
          <Textarea label="Descrição" name="descricao" placeholder="Escopo deste lote (opcional)" />

          <div className="flex justify-end gap-2">
            <Button type="button" onClick={fechar} disabled={pending} variant="ghost">Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Criando…" : "Criar lote"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { criarFornecedor } from "@/app/squadframe/compras/actions";
import { FornecedoresLista } from "@/modules/squadframe/components/compras/fornecedores-lista";
import { Button } from "@/ui/components/Button";

type Fornecedor = {
  id: string; nome: string; razao_social: string | null; cnpj: string | null;
  email: string | null; telefone: string | null; contato: string | null;
  ativo: boolean; tipos: string[] | null;
  endereco: string | null; numero: string | null; complemento: string | null;
  bairro: string | null; cidade: string | null; estado: string | null; cep: string | null;
};
type TipoLinha = { nome: string; slug: string };

export function GerenciarFornecedores({
  fornecedores,
  tiposLinha,
  tipoAtual,
}: {
  fornecedores: Fornecedor[];
  tiposLinha: TipoLinha[];
  tipoAtual?: string;
}) {
  const podeCriar = usePode("catalogo.fornecedor.criar", "compras.fornecedor.criar");
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function handleCriar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await criarFornecedor(fd);
        setAberto(false);
        router.refresh();
      } catch (err: any) { setErro(err.message); }
    });
  }

  return (
    <div className="mt-4 space-y-6">
      {podeCriar && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-text-3">
              Novo fornecedor
            </h2>
            <Button
              onClick={() => { setAberto(!aberto); setErro(null); }}
              variant="secondary" className="text-xs"
            >
              {aberto ? "Cancelar" : "+ Adicionar"}
            </Button>
          </div>

          {aberto && (
            <form onSubmit={handleCriar} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Nome Fantasia *</label>
                  <input name="nome" required className="field h-9 text-sm" placeholder="Ex: Metalperfil" />
                </div>
                <div>
                  <label className="label">Razão Social</label>
                  <input name="razao_social" className="field h-9 text-sm" />
                </div>
                <div>
                  <label className="label">CNPJ</label>
                  <input name="cnpj" className="field h-9 text-sm" placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input name="telefone" className="field h-9 text-sm" />
                </div>
                <div>
                  <label className="label">E-mail</label>
                  <input name="email" type="email" className="field h-9 text-sm" />
                </div>
                <div>
                  <label className="label">Contato</label>
                  <input name="contato" className="field h-9 text-sm" />
                </div>
              </div>

              {tiposLinha.length > 0 && (
                <div>
                  <label className="label">Fornece para</label>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {tiposLinha.map((t) => (
                      <label key={t.slug} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" name="tipos" value={t.slug}
                          defaultChecked={!!tipoAtual && t.slug === tipoAtual}
                          className="rounded" />
                        {t.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {erro && <p className="text-xs text-danger">{erro}</p>}

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={pending}>
                  {pending ? "Salvando…" : "Salvar fornecedor"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-text-3">
            Exibindo fornecedores vinculados a esta aba.
          </p>
          <a href="/squadframe/compras/fornecedores" target="_blank"
            className="text-xs text-primary hover:underline">
            Ver todos →
          </a>
        </div>
        <FornecedoresLista fornecedores={fornecedores} tiposLinha={tiposLinha} />
      </div>
    </div>
  );
}

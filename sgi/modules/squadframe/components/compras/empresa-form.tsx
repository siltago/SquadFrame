"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { salvarEmpresa } from "@/modules/squadframe/actions/compras/empresa";
import { Button } from "@/ui/components/Button";

type Empresa = {
  nome: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  ie: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  logo_url: string | null;
};

function Field({ label, name, defaultValue, placeholder, type = "text", className = "" }: {
  label: string; name: string; defaultValue?: string | null; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} className="field" />
    </div>
  );
}

export function EmpresaForm({ empresa }: { empresa: Empresa }) {
  const [pending, startTransition] = useTransition();
  const [logoPreview, setLogoPreview] = useState<string | null>(empresa.logo_url);
  const [status, setStatus] = useState<{ type: "ok" | "erro"; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sincroniza quando o servidor atualiza os props (após revalidatePath)
  useEffect(() => {
    setLogoPreview((prev) => empresa.logo_url ?? prev);
  }, [empresa.logo_url]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setStatus(null);
    startTransition(async () => {
      const result = await salvarEmpresa(fd);
      if (result.ok) {
        if (result.logo_url) setLogoPreview(result.logo_url);
        setStatus({ type: "ok", msg: "Salvo com sucesso" });
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus({ type: "erro", msg: result.erro });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Logo */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-3">Logotipo</h2>
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative flex h-28 w-48 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-bg transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-3" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-text-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span className="text-xs">Clique para enviar</span>
              </div>
            )}
            <div className="absolute inset-0 hidden items-center justify-center rounded-xl bg-black/40 text-white group-hover:flex">
              <span className="text-xs font-medium">Trocar logo</span>
            </div>
          </button>
          <input ref={fileRef} type="file" name="logo_file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          <div className="text-sm text-text-2">
            <p>Formatos aceitos: PNG, JPG, SVG, WEBP</p>
            <p className="mt-1 text-xs text-text-3">Tamanho recomendado: 400 × 200 px</p>
            {logoPreview && (
              <button
                type="button"
                onClick={() => { setLogoPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="mt-3 text-xs text-danger hover:underline"
              >
                Remover logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dados da empresa */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-3">Dados da Empresa</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Razão Social" name="nome" defaultValue={empresa.nome} placeholder="Nome Ltda." className="sm:col-span-2" />
          <Field label="Nome Fantasia" name="nome_fantasia" defaultValue={empresa.nome_fantasia} placeholder="Nome exibido nos documentos" />
          <Field label="CNPJ" name="cnpj" defaultValue={empresa.cnpj} placeholder="00.000.000/0000-00" />
          <Field label="IE / RG" name="ie" defaultValue={empresa.ie} placeholder="Inscrição Estadual ou RG" />
          <Field label="Telefone" name="telefone" defaultValue={empresa.telefone} placeholder="(00) 00000-0000" type="tel" />
          <Field label="E-mail" name="email" defaultValue={empresa.email} placeholder="contato@empresa.com.br" type="email" className="sm:col-span-2" />
          <Field label="Site" name="site" defaultValue={empresa.site} placeholder="www.empresa.com.br" className="sm:col-span-2" />
        </div>
      </div>

      {/* Endereço */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-3">Endereço</h2>
        <div className="grid gap-4 sm:grid-cols-6">
          <Field label="CEP" name="cep" defaultValue={empresa.cep} placeholder="00000-000" className="sm:col-span-2" />
          <Field label="Logradouro" name="endereco" defaultValue={empresa.endereco} placeholder="Rua, Av., Al." className="sm:col-span-3" />
          <Field label="Número" name="numero" defaultValue={empresa.numero} placeholder="123" className="sm:col-span-1" />
          <Field label="Complemento" name="complemento" defaultValue={empresa.complemento} placeholder="Sala, Bloco" className="sm:col-span-2" />
          <Field label="Bairro" name="bairro" defaultValue={empresa.bairro} placeholder="Centro" className="sm:col-span-2" />
          <Field label="Cidade" name="cidade" defaultValue={empresa.cidade} placeholder="São Paulo" className="sm:col-span-1" />
          <Field label="Estado" name="estado" defaultValue={empresa.estado} placeholder="SP" className="sm:col-span-1" />
        </div>
      </div>

      {/* Salvar */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending} className="px-8">
          {pending ? "Salvando…" : "Salvar dados"}
        </Button>
        {status && (
          <span className={`flex items-center gap-2 text-sm ${status.type === "ok" ? "text-success" : "text-danger"}`}>
            {status.type === "ok" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            )}
            {status.msg}
          </span>
        )}
      </div>
    </form>
  );
}

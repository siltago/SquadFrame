"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { BackButton } from "@/components/back-button";
import { salvarFotoUrl, salvarPerfil, salvarAssinatura } from "./actions";
import type { UsuarioAtual } from "@/lib/auth";

function resizeAvatar(file: File, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      // Recorte centralizado em quadrado
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao processar imagem."))),
        "image/webp",
        0.88,
      );
    };
    img.onerror = () => reject(new Error("Imagem inválida."));
    img.src = objectUrl;
  });
}

function CardAssinatura({ textoAtual, nome, cargo }: { textoAtual: string | null; nome: string; cargo: string | null }) {
  const [texto, setTexto] = useState(textoAtual ?? "");
  const [salvando, setSalvando] = useState(false);
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSalvar() {
    if (!texto.trim()) { setErro("Informe o texto da assinatura."); return; }
    setSalvando(true);
    setErro(null);
    setOk(false);
    try {
      await salvarAssinatura(texto.trim());
      setOk(true);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">
        Assinatura eletrônica
      </h2>
      <p className="mb-5 text-xs text-ink-faint">
        Funciona como carimbo ao criar ou aprovar documentos. Escreva como quiser que apareça, ex:{" "}
        <em>{[nome, cargo].filter(Boolean).join(" ").toUpperCase() || "NOME CARGO"}</em>.
      </p>

      <div>
        <label className="label">Texto da assinatura</label>
        <input
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setOk(false); }}
          className="field font-mono uppercase tracking-widest"
          placeholder={[nome, cargo].filter(Boolean).join(" ").toUpperCase() || "SEU NOME E CARGO"}
          maxLength={80}
        />
      </div>

      {texto.trim() && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-ink-faint">Prévia do carimbo</p>
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-steel/50 bg-steel/5 p-4">
            <div className="text-center">
              <p className="font-mono text-base font-bold uppercase tracking-widest text-steel">
                {texto.trim()}
              </p>
              <p className="mt-1 font-mono text-xs text-steel/60">DD/MM/AAAA HH:MM:SS</p>
            </div>
          </div>
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      {ok && <p className="mt-3 text-sm text-green-600">Assinatura salva com sucesso.</p>}

      <button
        type="button"
        onClick={handleSalvar}
        disabled={salvando || !texto.trim()}
        className="btn-primary mt-4 disabled:opacity-50"
      >
        {salvando ? "Salvando…" : "Salvar assinatura"}
      </button>
    </div>
  );
}

export function PerfilCliente({ usuario, assinaturaUrl }: { usuario: UsuarioAtual; assinaturaUrl: string | null }) {
  const [nome, setNome] = useState(usuario.nome);
  const [empresa, setEmpresa] = useState(usuario.empresa ?? "");
  const [fotoUrl, setFotoUrl] = useState(usuario.foto_url ?? "");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [okGeral, setOkGeral] = useState(false);
  const [okSenha, setOkSenha] = useState(false);
  const [pendingGeral, startGeral] = useTransition();
  const [pendingSenha, startSenha] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const initials = usuario.nome
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const cargoCor = usuario.cargo?.cor ?? "#475569";

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErroGeral(null);
    try {
      // Redimensiona e recorta em quadrado antes de enviar
      const blob = await resizeAvatar(file, 400);

      const supabase = createClient();
      const path = `${usuario.auth_id}/avatar.webp`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/webp" });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      // Força revalidação do cache do browser adicionando versão única
      const url = `${publicUrl}?v=${Date.now()}`;
      setFotoUrl(url);

      await supabase.auth.updateUser({ data: { foto_url: url } });
      await salvarFotoUrl(url);

      router.refresh();
    } catch (err: any) {
      setErroGeral(err.message ?? "Erro ao fazer upload.");
    } finally {
      setUploading(false);
    }
  }

  function handleSalvarPerfil() {
    setErroGeral(null);
    setOkGeral(false);
    startGeral(async () => {
      try {
        await salvarPerfil(nome, empresa, fotoUrl || null);
        setOkGeral(true);
        router.refresh();
      } catch (err: any) {
        setErroGeral(err.message);
      }
    });
  }

  function handleAlterarSenha() {
    setErroSenha(null);
    setOkSenha(false);
    if (novaSenha !== confirmar) { setErroSenha("As senhas não coincidem."); return; }
    if (novaSenha.length < 6)   { setErroSenha("Mínimo 6 caracteres."); return; }
    startSenha(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password: novaSenha });
        if (error) throw new Error(error.message);
        setOkSenha(true);

        setNovaSenha("");
        setConfirmar("");
      } catch (err: any) {
        setErroSenha(err.message);
      }
    });
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <BackButton href="/" />
        <p className="text-xs font-medium uppercase tracking-widest text-ink-faint">
          Conta
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Meu perfil</h1>
      </div>

      <div className="grid max-w-2xl gap-6">
        {/* Card: foto + dados */}
        <div className="card p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Informações pessoais
          </h2>

          {/* Avatar */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative">
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt={usuario.nome}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-line"
                />
              ) : (
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
                  style={{ backgroundColor: cargoCor }}
                >
                  {initials}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn-ghost py-1.5 text-xs"
              >
                {uploading ? "Enviando…" : "Alterar foto"}
              </button>
              <p className="mt-1 text-xs text-ink-faint">JPG, PNG ou WebP · máx 2 MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUploadFoto}
            />
          </div>

          {/* Campos */}
          <div className="space-y-4">
            <div>
              <label className="label">Nome completo</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="label">Empresa</label>
              <input
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="field"
                placeholder="Nome da empresa"
              />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input
                value={usuario.email}
                disabled
                className="field opacity-60"
              />
              <p className="mt-1 text-xs text-ink-faint">
                Para alterar o e-mail, entre em contato com o administrador.
              </p>
            </div>

            {/* Cargo e setor — somente leitura */}
            {usuario.cargo && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="label">Cargo</label>
                  <div className="flex items-center gap-2 rounded-card border border-line bg-canvas px-3 py-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: usuario.cargo.cor }}
                    />
                    <span className="text-sm text-ink">{usuario.cargo.nome}</span>
                    {usuario.cargo.is_admin && (
                      <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                {usuario.setor && (
                  <div className="flex-1">
                    <label className="label">Setor</label>
                    <div className="flex items-center gap-2 rounded-card border border-line bg-canvas px-3 py-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: usuario.setor.cor }}
                      />
                      <span className="text-sm text-ink">{usuario.setor.nome}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {erroGeral && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {erroGeral}
            </p>
          )}
          {okGeral && (
            <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              Perfil atualizado com sucesso.
            </p>
          )}

          <button
            onClick={handleSalvarPerfil}
            disabled={pendingGeral}
            className="btn-primary mt-5"
          >
            {pendingGeral ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>

        {/* Card: assinatura */}
        <CardAssinatura textoAtual={assinaturaUrl} nome={usuario.nome} cargo={usuario.cargo?.nome ?? null} />

        {/* Card: senha */}
        <div className="card p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Alterar senha
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Nova senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="field"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="label">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="field"
                placeholder="••••••••"
              />
            </div>
          </div>

          {erroSenha && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {erroSenha}
            </p>
          )}
          {okSenha && (
            <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              Senha alterada com sucesso.
            </p>
          )}

          <button
            onClick={handleAlterarSenha}
            disabled={pendingSenha}
            className="btn-primary mt-5"
          >
            {pendingSenha ? "Alterando…" : "Alterar senha"}
          </button>
        </div>
      </div>
    </div>
  );
}

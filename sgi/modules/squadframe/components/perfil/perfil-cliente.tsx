"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/database/supabase-client";
import { BackButton } from "@/modules/squadframe/components/back-button";
import {
  salvarFotoUrl,
  salvarPerfil,
  salvarAssinatura,
  enviarCodigoWhatsapp,
  confirmarCodigoWhatsapp,
  cancelarVerificacaoWhatsapp,
} from "@/modules/squadframe/actions/perfil/actions";
import type { UsuarioAtual } from "@/shared/auth/auth";
import { Avatar } from "@/ui/components/Avatar";
import { Button } from "@/ui/components/Button";
import { Alert } from "@/ui/components/Alert";
import { Badge } from "@/ui/components/Badge";
import { Input } from "@/ui/components/Input";
import { Spinner } from "@/ui/components/Spinner";

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
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-2">
        Assinatura eletrônica
      </h2>
      <p className="mb-5 text-xs text-text-3">
        Funciona como carimbo ao criar ou aprovar documentos. Escreva como quiser que apareça, ex:{" "}
        <em>{[nome, cargo].filter(Boolean).join(" ").toUpperCase() || "NOME CARGO"}</em>.
      </p>

      <Input
        label="Texto da assinatura"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setOk(false); }}
        className="font-mono uppercase tracking-widest"
        placeholder={[nome, cargo].filter(Boolean).join(" ").toUpperCase() || "SEU NOME E CARGO"}
        maxLength={80}
      />

      {texto.trim() && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-text-3">Prévia do carimbo</p>
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-primary-soft p-4">
            <div className="text-center">
              <p className="font-mono text-base font-bold uppercase tracking-widest text-primary">
                {texto.trim()}
              </p>
              <p className="mt-1 font-mono text-xs text-primary/60">DD/MM/AAAA HH:MM:SS</p>
            </div>
          </div>
        </div>
      )}

      {erro && <Alert variant="danger" className="mt-3">{erro}</Alert>}
      {ok && <Alert variant="success" className="mt-3">Assinatura salva com sucesso.</Alert>}

      <Button
        type="button"
        onClick={handleSalvar}
        disabled={salvando || !texto.trim()}
        className="mt-4"
      >
        {salvando ? "Salvando…" : "Salvar assinatura"}
      </Button>
    </div>
  );
}

type EstadoWhatsapp = "visualizar" | "editar" | "confirmar";

function CardWhatsapp({
  numeroVerificado,
  numeroPendenteInicial,
}: {
  numeroVerificado: string | null;
  numeroPendenteInicial: string | null;
}) {
  const [estado, setEstado] = useState<EstadoWhatsapp>(
    numeroPendenteInicial ? "confirmar" : numeroVerificado ? "visualizar" : "editar"
  );
  const [numero, setNumero] = useState(numeroVerificado ?? "");
  const [numeroPendente, setNumeroPendente] = useState(numeroPendenteInicial);
  const [codigo, setCodigo] = useState("");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const router = useRouter();

  function handleEnviarCodigo() {
    setErro(null);
    startTransition(async () => {
      try {
        const { numeroEnvio } = await enviarCodigoWhatsapp(numero);
        setNumeroPendente(numeroEnvio);
        setCodigo("");
        setEstado("confirmar");
      } catch (e: any) {
        setErro(e.message);
      }
    });
  }

  function handleConfirmarCodigo() {
    if (!codigo.trim()) { setErro("Informe o código recebido."); return; }
    setErro(null);
    startTransition(async () => {
      try {
        await confirmarCodigoWhatsapp(codigo.trim());
        setOk(true);
        setEstado("visualizar");
        router.refresh();
      } catch (e: any) {
        setErro(e.message);
      }
    });
  }

  function handleCancelar() {
    setErro(null);
    startTransition(async () => {
      try {
        await cancelarVerificacaoWhatsapp();
      } catch {
        // best-effort — segue trocando a UI mesmo se a limpeza falhar
      }
      setNumeroPendente(null);
      setEstado(numeroVerificado ? "visualizar" : "editar");
    });
  }

  return (
    <div className="card p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-2">
        WhatsApp
      </h2>
      <p className="mb-5 text-xs text-text-3">
        Usado para receber cobranças de prazo (pedidos e solicitações aguardando aprovação).
        Precisa ser confirmado por código antes de valer.
      </p>

      {estado === "visualizar" && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2">
          <span className="text-sm text-text">{numeroVerificado}</span>
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-3 text-xs shrink-0"
            onClick={() => { setEstado("editar"); setNumero(numeroVerificado ?? ""); setOk(false); }}
          >
            Editar
          </Button>
        </div>
      )}

      {estado === "editar" && (
        <>
          <Input
            label="Número"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="(11) 99999-8888"
          />
          {erro && <Alert variant="danger" className="mt-3">{erro}</Alert>}
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={handleEnviarCodigo} disabled={pending || !numero.trim()} className="text-sm">
              {pending ? "Enviando…" : "Enviar código"}
            </Button>
            {numeroVerificado && (
              <Button type="button" variant="ghost" disabled={pending} onClick={() => { setEstado("visualizar"); setErro(null); }} className="text-sm">
                Cancelar
              </Button>
            )}
          </div>
        </>
      )}

      {estado === "confirmar" && (
        <>
          <p className="mb-3 text-sm text-text-2">
            Enviamos um código de 6 dígitos para <strong>{numeroPendente}</strong>. Informe abaixo para confirmar.
          </p>
          <Input
            label="Código de verificação"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="font-mono tracking-widest"
            maxLength={6}
          />
          {erro && <Alert variant="danger" className="mt-3">{erro}</Alert>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={handleConfirmarCodigo} disabled={pending || codigo.length !== 6} className="text-sm">
              {pending ? "Confirmando…" : "Confirmar código"}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={handleEnviarCodigo} className="text-sm">
              Reenviar código
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={handleCancelar} className="text-sm">
              Cancelar
            </Button>
          </div>
        </>
      )}

      {ok && estado === "visualizar" && (
        <Alert variant="success" className="mt-3">WhatsApp confirmado com sucesso.</Alert>
      )}
    </div>
  );
}

export function PerfilCliente({
  usuario,
  assinaturaUrl,
  whatsappPendente,
}: {
  usuario: UsuarioAtual;
  assinaturaUrl: string | null;
  whatsappPendente: string | null;
}) {
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

  const cargoCor = usuario.cargo?.cor ?? "#475569";

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErroGeral(null);
    try {
      const blob = await resizeAvatar(file, 400);

      const supabase = createClient();
      const path = `${usuario.auth_id}/avatar.webp`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/webp" });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
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
        <p className="text-xs font-medium uppercase tracking-widest text-text-3">Conta</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Meu perfil</h1>
      </div>

      <div className="grid max-w-2xl gap-6">
        {/* Card: foto + dados */}
        <div className="card p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-text-2">
            Informações pessoais
          </h2>

          {/* Avatar */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative">
              <Avatar
                src={fotoUrl || null}
                name={usuario.nome}
                color={cargoCor}
                size="xl"
                className="ring-2 ring-border"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Spinner size="sm" className="text-white" />
                </div>
              )}
            </div>
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Enviando…" : "Alterar foto"}
              </Button>
              <p className="mt-1 text-xs text-text-3">JPG, PNG ou WebP · máx 2 MB</p>
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
            <Input
              label="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <Input
              label="Empresa"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Nome da empresa"
            />
            <Input
              label="E-mail"
              value={usuario.email}
              disabled
              className="opacity-60"
              hint="Para alterar o e-mail, entre em contato com o administrador."
            />

            {/* Cargo e setor — somente leitura */}
            {usuario.cargo && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="label">Cargo</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: usuario.cargo.cor }}
                    />
                    <span className="text-sm text-text">{usuario.cargo.nome}</span>
                    {usuario.cargo.is_admin && (
                      <Badge variant="warning" size="sm" className="ml-auto">Admin</Badge>
                    )}
                  </div>
                </div>
                {usuario.setor && (
                  <div className="flex-1">
                    <label className="label">Setor</label>
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: usuario.setor.cor }}
                      />
                      <span className="text-sm text-text">{usuario.setor.nome}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {erroGeral && <Alert variant="danger" className="mt-3">{erroGeral}</Alert>}
          {okGeral && <Alert variant="success" className="mt-3">Perfil atualizado com sucesso.</Alert>}

          <Button onClick={handleSalvarPerfil} disabled={pendingGeral} className="mt-5">
            {pendingGeral ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>

        {/* Card: assinatura */}
        <CardAssinatura textoAtual={assinaturaUrl} nome={usuario.nome} cargo={usuario.cargo?.nome ?? null} />

        {/* Card: WhatsApp */}
        <CardWhatsapp numeroVerificado={usuario.whatsapp} numeroPendenteInicial={whatsappPendente} />

        {/* Card: senha */}
        <div className="card p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-text-2">
            Alterar senha
          </h2>
          <div className="space-y-4">
            <Input
              label="Nova senha"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="••••••••"
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {erroSenha && <Alert variant="danger" className="mt-3">{erroSenha}</Alert>}
          {okSenha && <Alert variant="success" className="mt-3">Senha alterada com sucesso.</Alert>}

          <Button onClick={handleAlterarSenha} disabled={pendingSenha} className="mt-5">
            {pendingSenha ? "Alterando…" : "Alterar senha"}
          </Button>
        </div>
      </div>
    </div>
  );
}

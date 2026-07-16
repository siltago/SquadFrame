"use client";

import { useState, useTransition } from "react";
import { AuthLayout } from "@/ui/layouts/AuthLayout";
import { Input } from "@/ui/components/Input";
import { Button } from "@/ui/components/Button";
import { Alert } from "@/ui/components/Alert";
import { ativarConviteAction } from "../actions";

export function AtivarConviteForm({ token }: { token: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pending, start] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) { setErro("Link de convite inválido — falta o token."); return; }

    const fd = new FormData(e.currentTarget);
    const senha = String(fd.get("senha") || "");
    const confirmar = String(fd.get("confirmar") || "");
    if (senha !== confirmar) { setErro("As senhas não coincidem."); return; }

    setErro(null);
    start(async () => {
      const resultado = await ativarConviteAction(token, senha);
      if (!resultado.ok) { setErro(resultado.erro); return; }
      setSucesso(true);
    });
  }

  return (
    <AuthLayout logoSrc="/squadwise.png" logoAlt="SquadWise" title="SquadWise" description="Ativar convite" cardSize="sm">
      {sucesso ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-sm text-text-2">Conta ativada! Já pode entrar com o e-mail e a senha que você definiu.</p>
          <Button as="a" href="/login" fullWidth>
            Ir para o login
          </Button>
        </div>
      ) : !token ? (
        <Alert variant="danger">Link de convite inválido — falta o token. Peça um novo link ao administrador.</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-text-2">Defina uma senha pra ativar sua conta.</p>
          <Input
            label="Senha"
            name="senha"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
          />
          <Input
            label="Confirmar senha"
            name="confirmar"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
          />
          {erro && <Alert variant="danger">{erro}</Alert>}
          <Button type="submit" disabled={pending} fullWidth>
            {pending ? "Ativando…" : "Ativar conta"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

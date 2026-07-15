"use client";

import { useState, useTransition } from "react";
import { redefinirSenhaSemEmail } from "./actions";
import { Input } from "@/ui/components/Input";
import { Button } from "@/ui/components/Button";
import { Alert } from "@/ui/components/Alert";
import { AuthLayout } from "@/ui/layouts/AuthLayout";

export default function EsqueciSenhaPage() {
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pending, start] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const senha = String(fd.get("senha") || "");
    const confirmar = String(fd.get("confirmar") || "");

    if (senha !== confirmar) { setErro("As senhas não coincidem."); return; }
    setErro(null);

    start(async () => {
      try {
        await redefinirSenhaSemEmail(email, senha);
        setSucesso(true);
      } catch (err: any) {
        setErro(err.message);
      }
    });
  }

  return (
    <AuthLayout
      logoSrc="/logo-system.png"
      logoAlt="SquadSystem"
      title="SquadSystem"
      description="Redefinir senha"
      cardSize="sm"
    >
      {sucesso ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-sm text-text-2">Senha atualizada! Já pode entrar com a senha nova.</p>
          <Button as="a" href="/login" fullWidth>
            Ir para o login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-text-2">
            Informe seu e-mail e a senha nova.
          </p>
          <Input
            label="E-mail"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
          />
          <Input
            label="Nova senha"
            name="senha"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
          />
          <Input
            label="Confirmar nova senha"
            name="confirmar"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
          />
          {erro && <Alert variant="danger">{erro}</Alert>}
          <Button type="submit" disabled={pending} fullWidth>
            {pending ? "Salvando…" : "Redefinir senha"}
          </Button>
          <p className="text-center text-sm text-text-2">
            <a href="/login" className="text-primary hover:underline font-medium">
              Voltar para o login
            </a>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

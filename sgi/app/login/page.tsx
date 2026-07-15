"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/database/supabase-client";
import { Input } from "@/ui/components/Input";
import { Button } from "@/ui/components/Button";
import { Alert } from "@/ui/components/Alert";
import { AuthLayout } from "@/ui/layouts/AuthLayout";

export default function LoginPage() {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const senha = String(fd.get("senha") || "");
    setErro(null);

    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) { setErro("E-mail ou senha incorretos."); return; }
      router.refresh();
    });
  }

  return (
    <AuthLayout
      logoSrc="/logo-system.png"
      logoAlt="SquadSystem"
      logoSize={72}
      title="SquadSystem"
      description="Plataforma modular de gestão industrial"
      cardSize="sm"
      className="squadsystem"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="E-mail"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
        />
        <Input
          label="Senha"
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
        <p className="-mt-2 text-right text-sm">
          <a href="/esqueci-senha" className="text-primary hover:underline font-medium">
            Esqueci minha senha
          </a>
        </p>
        {erro && <Alert variant="danger">{erro}</Alert>}
        <Button type="submit" disabled={pending} fullWidth>
          {pending ? "Entrando…" : "Entrar"}
        </Button>
        <p className="text-center text-sm text-text-2">
          Primeiro acesso?{" "}
          <a href="/cadastro" className="text-primary hover:underline font-medium">
            Criar conta
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}

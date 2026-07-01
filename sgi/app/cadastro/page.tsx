"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/database/supabase-client";
import { cadastrarUsuario } from "./actions";
import { Input } from "@/ui/components/Input";
import { Button } from "@/ui/components/Button";
import { Alert } from "@/ui/components/Alert";
import { AuthLayout } from "@/ui/layouts/AuthLayout";

export default function CadastroPage() {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const senha    = String(fd.get("senha")    || "");
    const confirmar = String(fd.get("confirmar") || "");

    if (senha !== confirmar) { setErro("As senhas não coincidem."); return; }
    setErro(null);

    start(async () => {
      try {
        await cadastrarUsuario(fd);
      } catch (err: any) {
        if (err.message.includes("já está cadastrado")) {
          const supabase = createClient();
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: String(fd.get("email") || ""),
            password: senha,
          });
          if (!loginError) { router.refresh(); return; }
        }
        setErro(err.message);
        return;
      }

      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: String(fd.get("email") || ""),
        password: senha,
      });

      if (loginError) { setErro(loginError.message); return; }
      router.refresh();
    });
  }

  return (
    <AuthLayout
      logoSrc="/icon.png"
      logoAlt="SquadFrame"
      title="SquadFrame"
      description="Criar conta"
      cardSize="sm"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Nome completo" name="nome" required placeholder="João da Silva" />
        <Input label="E-mail" name="email" type="email" required placeholder="joao@acme.com" />
        <Input label="Senha" name="senha" type="password" required minLength={6} placeholder="••••••••" />
        <Input label="Confirmar senha" name="confirmar" type="password" required placeholder="••••••••" />
        {erro && <Alert variant="danger">{erro}</Alert>}
        <Button type="submit" disabled={pending} fullWidth>
          {pending ? "Criando conta…" : "Criar conta"}
        </Button>
        <p className="text-center text-sm text-text-2">
          Já tem conta?{" "}
          <a href="/login" className="text-primary hover:underline font-medium">
            Entrar
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/database/supabase-client";
import { Input } from "@/ui/components/Input";
import { Button } from "@/ui/components/Button";
import { Alert } from "@/ui/components/Alert";
import { AuthLayout } from "@/ui/layouts/AuthLayout";

export default function RedefinirSenhaPage() {
  const [status, setStatus] = useState<"verificando" | "pronto" | "invalido">("verificando");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // O link do e-mail já chega autenticando uma sessão temporária de
    // recuperação — o evento PASSWORD_RECOVERY confirma isso. Também checa a
    // sessão direto, pro caso do evento já ter disparado antes do listener
    // montar (corrida entre o supabase-js processar a URL e este efeito).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("pronto");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus((atual) => (atual === "verificando" ? "pronto" : atual));
      else setTimeout(() => setStatus((atual) => (atual === "verificando" ? "invalido" : atual)), 2500);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const senha = String(fd.get("senha") || "");
    const confirmar = String(fd.get("confirmar") || "");

    if (senha !== confirmar) { setErro("As senhas não coincidem."); return; }
    setErro(null);

    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) { setErro(error.message); return; }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <AuthLayout
      logoSrc="/logo-system.png"
      logoAlt="SquadSystem"
      title="SquadSystem"
      description="Criar nova senha"
      cardSize="sm"
    >
      {status === "verificando" && (
        <p className="text-center text-sm text-text-2">Verificando o link…</p>
      )}

      {status === "invalido" && (
        <div className="flex flex-col gap-4 text-center">
          <Alert variant="danger">
            Esse link de recuperação é inválido ou já expirou.
          </Alert>
          <a href="/esqueci-senha" className="text-sm font-medium text-primary hover:underline">
            Pedir um novo link
          </a>
        </div>
      )}

      {status === "pronto" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nova senha"
            name="senha"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
            autoFocus
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
            {pending ? "Salvando…" : "Salvar nova senha"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/shared/database/supabase-client";
import { Input } from "@/ui/components/Input";
import { Button } from "@/ui/components/Button";
import { Alert } from "@/ui/components/Alert";
import { AuthLayout } from "@/ui/layouts/AuthLayout";

export default function EsqueciSenhaPage() {
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pending, start] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    setErro(null);

    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      // Não revela se o e-mail existe ou não — mesma mensagem em qualquer caso,
      // pra não dar pista de quais e-mails têm conta no sistema.
      if (error && error.status && error.status >= 500) { setErro("Não foi possível enviar o e-mail agora. Tente novamente em instantes."); return; }
      setEnviado(true);
    });
  }

  return (
    <AuthLayout
      logoSrc="/logo-system.png"
      logoAlt="SquadSystem"
      title="SquadSystem"
      description="Recuperar senha"
      cardSize="sm"
    >
      {enviado ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-sm text-text-2">
            Se esse e-mail estiver cadastrado, você vai receber um link pra criar uma senha nova.
          </p>
          <a href="/login" className="text-sm font-medium text-primary hover:underline">
            Voltar para o login
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-text-2">
            Informe o e-mail da sua conta. Vamos mandar um link pra você criar uma senha nova.
          </p>
          <Input
            label="E-mail"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
          />
          {erro && <Alert variant="danger">{erro}</Alert>}
          <Button type="submit" disabled={pending} fullWidth>
            {pending ? "Enviando…" : "Enviar link de recuperação"}
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

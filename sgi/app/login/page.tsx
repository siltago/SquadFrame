"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) {
        setErro("E-mail ou senha incorretos.");
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white"
            style={{ backgroundColor: "#0F4C81" }}
          >
            S
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-bold text-ink">SGI</p>
            <p className="text-sm text-ink-faint">Sistema de Gestão Industrial</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="label">E-mail</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="field"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="label">Senha</label>
            <input
              name="senha"
              type="password"
              required
              autoComplete="current-password"
              className="field"
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {erro}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Entrando…" : "Entrar"}
          </button>

          <p className="text-center text-sm text-ink-faint">
            Primeiro acesso?{" "}
            <a href="/cadastro" className="text-steel hover:underline">
              Criar conta
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

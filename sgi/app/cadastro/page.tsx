"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { cadastrarUsuario } from "./actions";

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
        // Cria usuário via server action (admin API, sem e-mail de confirmação)
        await cadastrarUsuario(fd);
      } catch (err: any) {
        // Se já existe, tenta login direto com as credenciais informadas
        if (err.message.includes("já está cadastrado")) {
          const supabase = createClient();
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: String(fd.get("email") || ""),
            password: senha,
          });
          if (!loginError) { router.push("/"); router.refresh(); return; }
        }
        setErro(err.message);
        return;
      }

      // Login imediato após criação
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: String(fd.get("email") || ""),
        password: senha,
      });

      if (loginError) { setErro(loginError.message); return; }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white"
            style={{ backgroundColor: "#0F4C81" }}
          >
            S
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-bold text-ink">SGI</p>
            <p className="text-sm text-ink-faint">Criar conta</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="label">Nome completo</label>
            <input name="nome" required className="field" placeholder="João da Silva" />
          </div>
          <div>
            <label className="label">Empresa</label>
            <input name="empresa" required className="field" placeholder="Acme Ltda" />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input name="email" type="email" required className="field" placeholder="joao@acme.com" />
          </div>
          <div>
            <label className="label">Senha</label>
            <input name="senha" type="password" required minLength={6} className="field" placeholder="••••••••" />
          </div>
          <div>
            <label className="label">Confirmar senha</label>
            <input name="confirmar" type="password" required className="field" placeholder="••••••••" />
          </div>

          {erro && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {erro}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Criando conta…" : "Criar conta"}
          </button>

          <p className="text-center text-sm text-ink-faint">
            Já tem conta?{" "}
            <a href="/login" className="text-steel hover:underline">
              Entrar
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

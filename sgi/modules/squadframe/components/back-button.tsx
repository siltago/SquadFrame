"use client";

import { useRouter } from "next/navigation";

export function BackButton({ href = "/", label = "Voltar" }: { href?: string; label?: string }) {
  const router = useRouter();

  function handleClick() {
    // Se o usuário chegou aqui navegando dentro do app (mesma origem), volta pelo
    // histórico do navegador — isso preserva filtros/busca que estavam na URL da
    // tela anterior. Se não houver histórico (link direto, nova aba, PWA aberto
    // direto nesta página), cai no href fixo como fallback.
    const veioDoApp =
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer &&
      (() => { try { return new URL(document.referrer).origin === window.location.origin; } catch { return false; } })();

    if (veioDoApp) router.back();
    else router.push(href);
  }

  return (
    <button
      onClick={handleClick}
      className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-2 shadow-sm transition-colors hover:bg-bg hover:text-text"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {label}
    </button>
  );
}

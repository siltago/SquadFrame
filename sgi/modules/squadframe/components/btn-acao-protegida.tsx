"use client";

import { useState } from "react";
import { Button } from "@/ui/components/Button";
import type { ButtonVariant } from "@/ui/components/Button";
import { IconDialog } from "@/ui/components/IconDialog";

export function BtnAcaoProtegida({
  href,
  label,
  temPermissao,
  acao,
  className,
  variant,
}: {
  href: string;
  label: React.ReactNode;
  temPermissao: boolean;
  acao?: string;
  className?: string;
  variant?: ButtonVariant;
}) {
  const [aberto, setAberto] = useState(false);

  if (temPermissao) {
    return <Button as="a" href={href} variant={variant} className={className}>{label}</Button>;
  }

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={() => setAberto(true)}>
        {label}
      </Button>
      {aberto && (
        <IconDialog
          iconTone="danger"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          }
          title="Acesso restrito"
          description={
            <>
              Você não tem permissão para{" "}
              <span className="font-medium text-text">{acao ?? "realizar esta ação"}</span>.
              Solicite ao administrador do sistema.
            </>
          }
          footer={
            <div className="mt-5 flex justify-end">
              <Button variant="ghost" onClick={() => setAberto(false)}>
                Fechar
              </Button>
            </div>
          }
        />
      )}
    </>
  );
}

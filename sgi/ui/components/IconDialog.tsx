import type { ReactNode } from "react";

// Casca de diálogo com ícone circular + título + descrição, compartilhada
// entre AssinarModal e BtnAcaoProtegida (ambos reimplementavam o mesmo
// wrapper fixed/backdrop/painel na mão). Corpo e rodapé ficam livres pro
// consumidor — cada um tem conteúdo próprio (carimbo de assinatura vs.
// aviso de permissão).
export function IconDialog({
  icon,
  iconTone = "primary",
  title,
  description,
  children,
  footer,
}: {
  icon: ReactNode;
  iconTone?: "primary" | "danger";
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconTone === "danger" ? "bg-danger-soft" : "bg-primary/10"}`}>
            <span className={iconTone === "danger" ? "text-danger" : "text-primary"}>{icon}</span>
          </div>
          <div>
            <h2 className="font-semibold text-text">{title}</h2>
            {description && <div className="mt-1 text-sm text-text-2">{description}</div>}
          </div>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";

// Wrapper genérico pra <form action={serverAction}> puro — sem isso, um erro
// lançado pela action (ex: violação de constraint única, "já existe um X com
// esse nome") não tem nenhum try/catch no meio do caminho e derruba a tela
// inteira (error boundary do Next). Server actions que fazem redirect()
// continuam funcionando normalmente mesmo dentro do try/catch (mesmo padrão
// já usado e confirmado em outros formulários client deste projeto).
export function ServerActionForm({
  action,
  className,
  children,
  erroClassName = "mt-3 text-sm text-danger",
}: {
  action: (formData: FormData) => Promise<unknown>;
  className?: string;
  children: React.ReactNode;
  erroClassName?: string;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function submeter(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      try {
        await action(formData);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Ocorreu um erro. Tente novamente.");
      }
    });
  }

  return (
    <form action={submeter} className={className}>
      {children}
      {erro && <p className={erroClassName}>{erro}</p>}
    </form>
  );
}

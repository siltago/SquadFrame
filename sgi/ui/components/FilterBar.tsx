import { FormHTMLAttributes, ReactNode } from "react";
import { cn } from "@/ui/lib/cn";

interface FilterBarProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
}

// Barra de filtros — mesma superfície flutuante (.card: sombra, cantos
// arredondados) dos StatCards, em vez de campos soltos direto sobre o
// fundo em gradiente da página. Padrão único no SquadUI pra qualquer
// form GET de filtro do sistema, em vez de repetir a classe em cada tela.
export function FilterBar({ children, className, ...props }: FilterBarProps) {
  return (
    <form className={cn("card flex flex-wrap items-end gap-3 p-5", className)} {...props}>
      {children}
    </form>
  );
}

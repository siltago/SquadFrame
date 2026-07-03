import Image from "next/image";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import type { Modulo } from "@/modules/home/types/module";

export function ModuleCard({ modulo }: { modulo: Modulo }) {
  const { slug, nome, descricao, ativo, cor, logo, logoSize = 44 } = modulo;

  return (
    <div
      className={`card relative flex flex-col items-center gap-4 p-6 text-center transition-shadow duration-[120ms] ${
        ativo ? "hover:shadow-lg" : "opacity-60"
      }`}
    >
      {!ativo && (
        <Badge variant="default" size="sm" className="absolute right-4 top-4">Em breve</Badge>
      )}

      {logo ? (
        <span
          className="flex shrink-0 items-center justify-center"
          style={{ height: logoSize, width: logoSize }}
        >
          <Image src={logo} alt={nome} width={logoSize} height={logoSize} className="h-full w-full object-contain" />
        </span>
      ) : (
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold"
          style={{ backgroundColor: `rgb(var(--color-${cor}-soft))`, color: `rgb(var(--color-${cor}))` }}
        >
          {nome.replace("Squad", "").slice(0, 1)}
        </span>
      )}

      <div className="flex-1">
        <h3 className="text-base font-bold text-text">{nome}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-text-2">{descricao}</p>
      </div>

      {ativo ? (
        <Button as="a" href={`/${slug}`} className="w-full justify-center">
          Acessar
        </Button>
      ) : (
        <Button disabled className="w-full justify-center" variant="secondary">
          Em breve
        </Button>
      )}
    </div>
  );
}

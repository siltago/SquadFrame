"use client";

import { cn } from "@/ui/lib/cn";
import { BuildingIcon, PackageIcon, CartIcon, UserIcon, ExternalLinkIcon } from "@/ui/icons";
import type { CardEntityLink, EntityType } from "@/modules/squadboard/types/entity-link";
import { ENTITY_TYPE_LABELS } from "@/modules/squadboard/types/entity-link";

function EntityIcon({ type, size = 13 }: { type: EntityType; size?: number }) {
  switch (type) {
    case "OBRA": return <BuildingIcon size={size} className="shrink-0 text-text-3" />;
    case "WORK_PACKAGE": return <PackageIcon size={size} className="shrink-0 text-text-3" />;
    case "PEDIDO_COMPRA":
    case "SOLICITACAO_COMPRA": return <CartIcon size={size} className="shrink-0 text-text-3" />;
    case "USUARIO":
    case "FORNECEDOR":
    case "CLIENTE": return <UserIcon size={size} className="shrink-0 text-text-3" />;
    default: return <ExternalLinkIcon size={size} className="shrink-0 text-text-3" />;
  }
}

export function RelationshipsSection({
  relacionamentos,
  className,
}: {
  relacionamentos: CardEntityLink[];
  className?: string;
}) {
  if (relacionamentos.length === 0) return null;

  return (
    <section className={cn(className)}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-3">
        Vínculos SquadSystem
      </p>
      <div className="flex flex-col gap-1.5">
        {relacionamentos.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2"
          >
            <EntityIcon type={r.entityType} />
            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] text-text-3">{ENTITY_TYPE_LABELS[r.entityType]}</span>
              <span className="truncate text-sm text-text-2">
                {r.entityLabel ?? r.entityId}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

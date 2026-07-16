"use client";

import { useState, useTransition } from "react";
import { Container, Section, PageHeader } from "@/ui/components/PageHeader";
import { Switch } from "@/ui/components/Switch";
import { Badge } from "@/ui/components/Badge";
import type { WiseModulo } from "../types";
import { habilitarModuloAction, desabilitarModuloAction } from "../actions";

export function ModulosLista({
  empresaId,
  modulos,
  habilitadosIds: habilitadosIniciais,
}: {
  empresaId: string;
  modulos: WiseModulo[];
  habilitadosIds: string[];
}) {
  const [habilitados, setHabilitados] = useState(new Set(habilitadosIniciais));
  const [pending, startTransition] = useTransition();

  function toggle(modulo: WiseModulo) {
    const habilitado = habilitados.has(modulo.id);
    startTransition(async () => {
      const acao = habilitado ? desabilitarModuloAction : habilitarModuloAction;
      const resultado = await acao(empresaId, modulo.id);
      if (resultado.ok) {
        setHabilitados((prev) => {
          const next = new Set(prev);
          habilitado ? next.delete(modulo.id) : next.add(modulo.id);
          return next;
        });
      }
    });
  }

  return (
    <Container>
      <Section>
        <PageHeader
          title="Módulos"
          description="Quais módulos do SquadSystem essa empresa tem habilitados — base do modelo SaaS."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((modulo) => {
            const habilitado = habilitados.has(modulo.id);
            return (
              <div key={modulo.id} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">{modulo.nome}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge variant={modulo.ativo ? "default" : "warning"} size="sm">
                      {modulo.ativo ? "Disponível no código" : "Em desenvolvimento"}
                    </Badge>
                  </div>
                </div>
                <Switch
                  checked={habilitado}
                  onChange={() => toggle(modulo)}
                  disabled={pending || !modulo.ativo}
                />
              </div>
            );
          })}
        </div>
      </Section>
    </Container>
  );
}

"use client";

import { useState, useTransition, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { normalizeSearch } from "@/ui/lib/search";
import { atribuirCargo, alterarStatusUsuario, configurarPrimeiroAdmin } from "@/modules/squadframe/actions/usuarios/actions";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { Avatar } from "@/ui/components/Avatar";
import { Badge } from "@/ui/components/Badge";
import { ColorBadge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { StatCard } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import { Alert } from "@/ui/components/Alert";
import { Th, Td } from "@/ui/components/Table";
import { EmptyState } from "@/ui/components/EmptyState";

type Cargo = { id: string; nome: string; cor: string; is_admin: boolean; setor_id: string | null };
type Setor = { id: string; nome: string; cor: string };
type Usuario = {
  id: string;
  nome: string;
  email: string;
  foto_url: string | null;
  empresa: string | null;
  ativo: boolean;
  criado_em: string;
  cargo: Cargo | null;
  setor: Setor | null;
};

function LinhaExpandida({
  usuario,
  cargos,
  podeEditar,
  onUpdate,
}: {
  usuario: Usuario;
  cargos: Cargo[];
  podeEditar: boolean;
  onUpdate: (u: Usuario) => void;
}) {
  const [pending, start] = useTransition();
  const [local, setLocal] = useState(usuario);
  const router = useRouter();

  useEffect(() => { setLocal(usuario); }, [usuario]);

  function handleCargo(cargoId: string | null) {
    const cargo = cargoId ? cargos.find((c) => c.id === cargoId) ?? null : null;
    start(async () => {
      await atribuirCargo(local.id, cargoId);
      const updated = { ...local, cargo };
      setLocal(updated);
      onUpdate(updated);
      router.refresh();
    });
  }

  function handleStatus() {
    start(async () => {
      await alterarStatusUsuario(local.id, !local.ativo);
      const updated = { ...local, ativo: !local.ativo };
      setLocal(updated);
      onUpdate(updated);
      router.refresh();
    });
  }

  return (
    <tr>
      <td colSpan={5} className="border-b border-divider bg-bg px-5 pb-5 pt-4">
        <div className="flex flex-wrap items-start gap-8">

          {/* Cargo */}
          <div className="min-w-[200px]">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-3">Cargo</p>
            {podeEditar ? (
              <select
                disabled={pending}
                value={local.cargo?.id ?? ""}
                onChange={(e) => handleCargo(e.target.value || null)}
                className="field w-full disabled:opacity-50"
              >
                <option value="">Sem cargo</option>
                {cargos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            ) : local.cargo ? (
              <ColorBadge color={local.cargo.cor} label={local.cargo.nome} />
            ) : (
              <span className="text-sm text-text-3">Sem cargo atribuído</span>
            )}
            {local.cargo?.is_admin && (
              <Badge variant="warning" size="sm" className="mt-1.5">★ Admin</Badge>
            )}
          </div>

          {/* Setor */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-3">Setor</p>
            {local.setor ? (
              <ColorBadge color={local.setor.cor} label={local.setor.nome} />
            ) : (
              <span className="text-sm text-text-3">—</span>
            )}
            {local.cargo && (
              <p className="mt-1 text-xs text-text-3">Definido pelo cargo</p>
            )}
          </div>

          {/* Empresa */}
          {local.empresa && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-3">Empresa</p>
              <p className="text-sm text-text">{local.empresa}</p>
            </div>
          )}

          {/* Membro desde */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-3">Membro desde</p>
            <p className="text-sm text-text">
              {new Date(local.criado_em).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "long", year: "numeric",
              })}
            </p>
          </div>

          {/* Ações */}
          {podeEditar && (
            <div className="ml-auto self-end">
              <Button
                disabled={pending}
                onClick={handleStatus}
                variant={local.ativo ? "danger" : "success"}
                size="sm"
              >
                {pending ? "Aguarde…" : local.ativo ? "Desativar" : "Reativar"}
              </Button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export function UsuariosCliente({
  usuarios: usuariosInit,
  cargos,
  setores,
  temAdmin,
}: {
  usuarios: Usuario[];
  cargos: Cargo[];
  setores: Setor[];
  temAdmin: boolean;
}) {
  const podeEditar = usePode("usuarios.editar");
  const [busca, setBusca] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState<"todos" | "ativos" | "inativos">("todos");
  const [usuarios, setUsuarios] = useState(usuariosInit);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [pendingSetup, startSetup] = useTransition();
  const [erroSetup, setErroSetup] = useState("");
  const router = useRouter();

  useEffect(() => { setUsuarios(usuariosInit); }, [usuariosInit]);

  const filtrados = usuarios.filter((u) => {
    const buscaN = normalizeSearch(busca);
    const matchBusca =
      normalizeSearch(u.nome).includes(buscaN) ||
      normalizeSearch(u.email).includes(buscaN);
    const matchAtivo =
      filtroAtivo === "todos" ||
      (filtroAtivo === "ativos" && u.ativo) ||
      (filtroAtivo === "inativos" && !u.ativo);
    return matchBusca && matchAtivo;
  });

  function handleUpdate(updated: Usuario) {
    setUsuarios((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  function toggleExpandido(id: string) {
    setExpandido((prev) => (prev === id ? null : id));
  }

  const total    = usuarios.length;
  const ativos   = usuarios.filter((u) => u.ativo).length;
  const semCargo = usuarios.filter((u) => !u.cargo).length;

  return (
    <div>
      {/* Banner de primeiro admin */}
      {!temAdmin && (
        <Alert variant="warning" title="Nenhum administrador configurado" className="mb-6">
          <div className="flex items-center justify-between gap-4 mt-1">
            <span>Clique para se tornar o primeiro administrador do sistema.</span>
            <Button
              variant="warning"
              size="sm"
              disabled={pendingSetup}
              onClick={() =>
                startSetup(async () => {
                  try {
                    await configurarPrimeiroAdmin();
                    router.refresh();
                  } catch (e: any) {
                    setErroSetup(e.message);
                  }
                })
              }
            >
              {pendingSetup ? "Configurando…" : "Tornar-me administrador"}
            </Button>
          </div>
          {erroSetup && <p className="mt-1 text-sm">{erroSetup}</p>}
        </Alert>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total de usuários" value={total} />
        <StatCard label="Ativos" value={ativos} />
        <StatCard label="Sem cargo" value={semCargo} />
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          fullWidth={false}
          className="h-9 w-64 text-sm"
        />
        <div className="flex overflow-hidden rounded-lg border border-border text-sm">
          {(["todos", "ativos", "inativos"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroAtivo(f)}
              className={`px-3 py-1.5 capitalize transition-colors duration-[120ms] ${
                filtroAtivo === f
                  ? "bg-primary text-white"
                  : "bg-surface text-text-2 hover:bg-surface-2"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.refresh()}
          className="ml-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
          </svg>
          Atualizar
        </Button>
      </div>

      {/* Tabela */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-divider text-left">
              <Th>Usuário</Th>
              <Th>Cargo</Th>
              <Th>Setor</Th>
              <Th>Status</Th>
              <Th>Desde</Th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10">
                  <EmptyState
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
                    title="Nenhum usuário encontrado"
                  />
                </td>
              </tr>
            ) : (
              filtrados.map((u) => (
                <Fragment key={u.id}>
                  <tr
                    onClick={() => toggleExpandido(u.id)}
                    className={`cursor-pointer border-b border-divider transition-colors hover:bg-bg ${
                      expandido === u.id ? "bg-bg border-b-0" : "last:border-0"
                    } ${!u.ativo ? "opacity-50" : ""}`}
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={u.foto_url}
                          name={u.nome}
                          color={u.cargo?.cor}
                          size="lg"
                        />
                        <div>
                          <p className="font-medium text-text">{u.nome}</p>
                          <p className="text-xs text-text-3">{u.email}</p>
                        </div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14" height="14" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"
                          className={`ml-1 shrink-0 text-text-3 transition-transform ${expandido === u.id ? "rotate-180" : ""}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </Td>
                    <Td>
                      {u.cargo ? (
                        <ColorBadge color={u.cargo.cor} label={u.cargo.nome} size="sm" />
                      ) : (
                        <span className="text-xs text-text-3">Sem cargo</span>
                      )}
                    </Td>
                    <Td>
                      {u.setor ? (
                        <ColorBadge color={u.setor.cor} label={u.setor.nome} size="sm" />
                      ) : (
                        <span className="text-xs text-text-3">—</span>
                      )}
                    </Td>
                    <Td>
                      <Badge
                        variant={u.ativo ? "success" : "default"}
                        size="sm"
                        dot
                      >
                        {u.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </Td>
                    <Td className="text-xs text-text-3">
                      {new Date(u.criado_em).toLocaleDateString("pt-BR")}
                    </Td>
                  </tr>

                  {expandido === u.id && (
                    <LinhaExpandida
                      usuario={u}
                      cargos={cargos}
                      podeEditar={podeEditar}
                      onUpdate={handleUpdate}
                    />
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

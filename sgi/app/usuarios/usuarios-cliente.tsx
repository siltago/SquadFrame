"use client";

import { useState, useTransition, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { atribuirCargo, alterarStatusUsuario, configurarPrimeiroAdmin } from "./actions";
import { usePode } from "@/components/user-provider";

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

function Avatar({ usuario, size = 36 }: { usuario: Usuario; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = usuario.nome
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const cor = usuario.cargo?.cor ?? "#475569";
  if (usuario.foto_url && !imgError) {
    return (
      <img
        src={usuario.foto_url}
        alt={usuario.nome}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: cor, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

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
      <td colSpan={5} className="border-b border-line bg-canvas px-5 pb-5 pt-4">
        <div className="flex flex-wrap items-start gap-8">

          {/* Cargo */}
          <div className="min-w-[200px]">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-ink-faint">Cargo</p>
            {podeEditar ? (
              <select
                disabled={pending}
                value={local.cargo?.id ?? ""}
                onChange={(e) => handleCargo(e.target.value || null)}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-steel disabled:opacity-50"
              >
                <option value="">Sem cargo</option>
                {cargos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            ) : local.cargo ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white"
                style={{ backgroundColor: local.cargo.cor }}
              >
                {local.cargo.nome}
              </span>
            ) : (
              <span className="text-sm text-ink-faint">Sem cargo atribuído</span>
            )}
            {local.cargo?.is_admin && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                ★ Admin
              </span>
            )}
          </div>

          {/* Setor */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-ink-faint">Setor</p>
            {local.setor ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                style={{ backgroundColor: local.setor.cor + "22", color: local.setor.cor }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: local.setor.cor }} />
                {local.setor.nome}
              </span>
            ) : (
              <span className="text-sm text-ink-faint">—</span>
            )}
            {local.cargo && (
              <p className="mt-1 text-xs text-ink-faint">Definido pelo cargo</p>
            )}
          </div>

          {/* Empresa */}
          {local.empresa && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-ink-faint">Empresa</p>
              <p className="text-sm text-ink">{local.empresa}</p>
            </div>
          )}

          {/* Membro desde */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-ink-faint">Membro desde</p>
            <p className="text-sm text-ink">
              {new Date(local.criado_em).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "long", year: "numeric",
              })}
            </p>
          </div>

          {/* Ações */}
          {podeEditar && (
            <div className="ml-auto self-end">
              <button
                disabled={pending}
                onClick={handleStatus}
                className={`rounded-md border px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  local.ativo
                    ? "border-red-200 text-red-600 hover:bg-red-50"
                    : "border-green-200 text-green-600 hover:bg-green-50"
                }`}
              >
                {pending ? "Aguarde…" : local.ativo ? "Desativar" : "Reativar"}
              </button>
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
    const matchBusca =
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase());
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
        <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
          <div>
            <p className="font-semibold text-amber-800">Nenhum administrador configurado</p>
            <p className="mt-0.5 text-sm text-amber-700">
              Clique para se tornar o primeiro administrador do sistema.
            </p>
            {erroSetup && <p className="mt-1 text-sm text-red-600">{erroSetup}</p>}
          </div>
          <button
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
            className="ml-6 shrink-0 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {pendingSetup ? "Configurando…" : "Tornar-me administrador"}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: total },
          { label: "Ativos", value: ativos },
          { label: "Sem cargo", value: semCargo },
        ].map((s) => (
          <div key={s.label} className="card px-5 py-4">
            <p className="text-2xl font-bold text-ink">{s.value}</p>
            <p className="text-xs text-ink-faint">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          className="field h-9 w-64 text-sm"
        />
        <div className="flex overflow-hidden rounded-md border border-line text-sm">
          {(["todos", "ativos", "inativos"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroAtivo(f)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                filtroAtivo === f ? "bg-steel text-white" : "bg-surface text-ink-soft hover:bg-canvas"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => router.refresh()}
          title="Atualizar lista"
          className="ml-auto flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink-soft hover:bg-canvas hover:text-ink"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
          </svg>
          Atualizar
        </button>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3 font-medium">Usuário</th>
              <th className="px-5 py-3 font-medium">Cargo</th>
              <th className="px-5 py-3 font-medium">Setor</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Desde</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink-faint">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((u) => (
                <Fragment key={u.id}>
                  <tr
                    onClick={() => toggleExpandido(u.id)}
                    className={`cursor-pointer border-b border-line transition-colors hover:bg-canvas ${
                      expandido === u.id ? "bg-canvas border-b-0" : "last:border-0"
                    } ${!u.ativo ? "opacity-50" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar usuario={u} size={52} />
                        <div>
                          <p className="font-medium text-ink">{u.nome}</p>
                          <p className="text-xs text-ink-faint">{u.email}</p>
                        </div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14" height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`ml-1 shrink-0 text-ink-faint transition-transform ${expandido === u.id ? "rotate-180" : ""}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {u.cargo ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: u.cargo.cor }}
                        >
                          {u.cargo.nome}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-faint">Sem cargo</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {u.setor ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: u.setor.cor + "22", color: u.setor.cor }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: u.setor.cor }} />
                          {u.setor.nome}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.ativo ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${u.ativo ? "bg-green-500" : "bg-zinc-400"}`} />
                        {u.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-faint">
                      {new Date(u.criado_em).toLocaleDateString("pt-BR")}
                    </td>
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

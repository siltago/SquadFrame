"use client";

import { useState, useTransition } from "react";
import { Container, Section, PageHeader } from "@/ui/components/PageHeader";
import { DataTable, type Column } from "@/ui/components/Table";
import { Badge } from "@/ui/components/Badge";
import { Avatar } from "@/ui/components/Avatar";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";
import { Select } from "@/ui/components/Select";
import { Modal } from "@/ui/components/Modal";
import { Alert } from "@/ui/components/Alert";
import type { WiseUsuario, WiseSetor, WiseCargo } from "../types";
import type { WisePapel } from "@/modules/wise/access/types";
import { convidarUsuarioAction, bloquearUsuarioAction, desbloquearUsuarioAction } from "../actions";

type UsuarioComPapeis = WiseUsuario & {
  setorNome: string | null;
  cargoNome: string | null;
  papeis: WisePapel[];
};

const STATUS_BADGE: Record<WiseUsuario["status"], { label: string; variant: "success" | "default" | "danger" | "info" }> = {
  ativo:     { label: "Ativo",     variant: "success" },
  inativo:   { label: "Inativo",   variant: "default" },
  bloqueado: { label: "Bloqueado", variant: "danger" },
  convidado: { label: "Convidado", variant: "info" },
};

export function UsuariosLista({
  usuarios: usuariosIniciais,
  empresaId,
  setores,
  cargos,
}: {
  usuarios: UsuarioComPapeis[];
  empresaId: string;
  setores: WiseSetor[];
  cargos: WiseCargo[];
}) {
  const [usuarios, setUsuarios] = useState(usuariosIniciais);
  const [modalConvite, setModalConvite] = useState(false);
  const [linkConvite, setLinkConvite] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleBloqueio(usuario: UsuarioComPapeis) {
    startTransition(async () => {
      const acao = usuario.status === "bloqueado" ? desbloquearUsuarioAction : bloquearUsuarioAction;
      const resultado = await acao(usuario.id);
      if (resultado.ok) {
        setUsuarios((prev) =>
          prev.map((u) => (u.id === usuario.id ? { ...u, status: usuario.status === "bloqueado" ? "ativo" : "bloqueado" } : u)),
        );
      }
    });
  }

  const columns: Column<UsuarioComPapeis>[] = [
    {
      key: "nome",
      label: "Usuário",
      sortable: true,
      render: (_v, u) => (
        <div className="flex items-center gap-2.5">
          <Avatar src={u.foto_url ?? undefined} name={u.nome} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text">{u.nome}</p>
            <p className="truncate text-xs text-text-3">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "setorNome",
      label: "Setor / Cargo",
      render: (_v, u) => (
        <span className="text-sm text-text-2">
          {u.setorNome ?? "—"}{u.cargoNome ? ` · ${u.cargoNome}` : ""}
        </span>
      ),
    },
    {
      key: "papeis",
      label: "Papéis",
      render: (_v, u) =>
        u.papeis.length === 0 ? (
          <span className="text-xs text-text-3">Nenhum</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {u.papeis.map((p) => (
              <Badge key={p.id} variant={p.is_admin ? "primary" : "default"} size="sm">
                {p.nome}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (_v, u) => {
        const s = STATUS_BADGE[u.status];
        return <Badge variant={s.variant} size="sm">{s.label}</Badge>;
      },
    },
    {
      key: "acoes",
      label: "",
      align: "right",
      render: (_v, u) =>
        u.status === "convidado" ? null : (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => toggleBloqueio(u)}>
            {u.status === "bloqueado" ? "Desbloquear" : "Bloquear"}
          </Button>
        ),
    },
  ];

  return (
    <Container>
      <Section>
        <PageHeader
          title="Usuários"
          description="Identidade do SquadWise — usuários migrados aparecem automaticamente; novos entram por convite."
          actions={<Button onClick={() => setModalConvite(true)}>Convidar usuário</Button>}
        />
        <DataTable columns={columns} data={usuarios} rowKey={(u) => u.id} emptyTitle="Nenhum usuário" />
      </Section>

      <Modal
        open={modalConvite}
        onClose={() => { setModalConvite(false); setLinkConvite(null); }}
        title="Convidar usuário"
        size="sm"
      >
        {linkConvite ? (
          <div className="space-y-3">
            <Alert variant="success">Convite criado! Copie o link e envie manualmente (WhatsApp, etc — não enviamos e-mail).</Alert>
            <div className="flex items-center gap-2">
              <Input readOnly value={linkConvite} onFocus={(e) => e.currentTarget.select()} />
              <Button
                variant="secondary"
                onClick={() => navigator.clipboard.writeText(linkConvite)}
              >
                Copiar
              </Button>
            </div>
            <p className="text-xs text-text-3">O link expira em 24 horas.</p>
            <Button className="w-full justify-center" onClick={() => { setModalConvite(false); setLinkConvite(null); }}>
              Fechar
            </Button>
          </div>
        ) : (
          <ConviteForm
            empresaId={empresaId}
            setores={setores}
            cargos={cargos}
            onCriado={(usuario, token) => {
              setUsuarios((prev) => [...prev, { ...usuario, setorNome: null, cargoNome: null, papeis: [] }]);
              setLinkConvite(`${window.location.origin}/squadwise/ativar?token=${token}`);
            }}
          />
        )}
      </Modal>
    </Container>
  );
}

function ConviteForm({
  empresaId,
  setores,
  cargos,
  onCriado,
}: {
  empresaId: string;
  setores: WiseSetor[];
  cargos: WiseCargo[];
  onCriado: (usuario: WiseUsuario, token: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [setorId, setSetorId] = useState("");
  const [cargoId, setCargoId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submeter() {
    setErro(null);
    startTransition(async () => {
      const resultado = await convidarUsuarioAction({
        empresa_id: empresaId,
        nome,
        email,
        setor_id: setorId || null,
        cargo_id: cargoId || null,
      });
      if (!resultado.ok) { setErro(resultado.erro); return; }
      onCriado(resultado.dados.usuario, resultado.dados.token);
    });
  }

  return (
    <div className="space-y-3">
      <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Select label="Setor (opcional)" value={setorId} onChange={(e) => setSetorId(e.target.value)}>
        <option value="">—</option>
        {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
      </Select>
      <Select label="Cargo (opcional)" value={cargoId} onChange={(e) => setCargoId(e.target.value)}>
        <option value="">—</option>
        {cargos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </Select>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <Button onClick={submeter} disabled={pending || !nome.trim() || !email.trim()} className="w-full justify-center">
        Gerar convite
      </Button>
    </div>
  );
}

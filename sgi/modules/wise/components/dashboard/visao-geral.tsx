import { Container, Section, PageHeader } from "@/ui/components/PageHeader";
import { StatCard } from "@/ui/components/Card";
import { Badge } from "@/ui/components/Badge";
import { EmptyState } from "@/ui/components/EmptyState";
import { UsersIcon, MailIcon, ShieldIcon, LockIcon } from "@/ui/icons";
import type { WiseAuditoria } from "@/modules/wise/audit/types";

const ACAO_LABEL: Record<string, string> = {
  CONVITE_CRIADO: "Convite criado",
  USUARIO_ATIVADO: "Usuário ativado",
  USUARIO_BLOQUEADO: "Usuário bloqueado",
  USUARIO_DESBLOQUEADO: "Usuário desbloqueado",
  PAPEL_ATRIBUIDO: "Papel atribuído",
  PAPEL_REVOGADO: "Papel revogado",
  SETOR_CARGO_ALTERADO: "Setor/cargo alterado",
};

const ACAO_VARIANT: Record<string, "success" | "danger" | "warning" | "info" | "default"> = {
  CONVITE_CRIADO: "info",
  USUARIO_ATIVADO: "success",
  USUARIO_BLOQUEADO: "danger",
  USUARIO_DESBLOQUEADO: "success",
  PAPEL_ATRIBUIDO: "info",
  PAPEL_REVOGADO: "warning",
};

export function VisaoGeral({
  totalUsuarios,
  usuariosAtivos,
  convitesPendentes,
  usuariosBloqueados,
  totalSetores,
  totalCargos,
  totalPapeis,
  eventosRecentes,
}: {
  totalUsuarios: number;
  usuariosAtivos: number;
  convitesPendentes: number;
  usuariosBloqueados: number;
  totalSetores: number;
  totalCargos: number;
  totalPapeis: number;
  eventosRecentes: WiseAuditoria[];
}) {
  return (
    <Container>
      <Section>
        <PageHeader
          title="Visão geral"
          description="Governança, identidade e permissões do SquadSystem."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Usuários ativos"
            value={usuariosAtivos}
            sub={`${totalUsuarios} no total`}
            icon={<UsersIcon size={18} />}
            href="/squadwise/usuarios"
          />
          <StatCard
            label="Convites pendentes"
            value={convitesPendentes}
            sub={usuariosBloqueados > 0 ? `${usuariosBloqueados} bloqueado(s)` : undefined}
            icon={<MailIcon size={18} />}
            href="/squadwise/usuarios"
          />
          <StatCard
            label="Papéis configurados"
            value={totalPapeis}
            sub={`${totalCargos} cargos · ${totalSetores} setores`}
            icon={<ShieldIcon size={18} />}
            href="/squadwise/papeis"
          />
          <StatCard
            label="Eventos de auditoria"
            value={eventosRecentes.length}
            sub="Últimos registros"
            icon={<LockIcon size={18} />}
            href="/squadwise/auditoria"
          />
        </div>
      </Section>

      <Section title="Atividade recente" className="mt-8">
        {eventosRecentes.length === 0 ? (
          <EmptyState title="Nenhuma atividade ainda" description="Ações sensíveis (convite, bloqueio, troca de papel) aparecem aqui." />
        ) : (
          <div className="card divide-y divide-divider">
            {eventosRecentes.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant={ACAO_VARIANT[e.acao] ?? "default"} size="sm">
                    {ACAO_LABEL[e.acao] ?? e.acao}
                  </Badge>
                  <span className="truncate text-sm text-text-2">{e.entidade}</span>
                </div>
                <span className="shrink-0 text-xs text-text-3">
                  {new Date(e.criado_em).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </Container>
  );
}

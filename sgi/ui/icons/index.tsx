/**
 * SquadIcons — Biblioteca oficial de ícones do SquadSystem
 *
 * Grid: 24×24 · Traço: 2px · Estilo: outline · Caps: round · Joins: round
 * Todos os ícones usam currentColor — respeitem automaticamente light/dark.
 */

import { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

/* Base wrapper — aplica os defaults de design de todos os ícones */
function S({ size = 18, children, ...p }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      {children}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   NAVEGAÇÃO & LAYOUT
═══════════════════════════════════════════════════════ */

/** Quatro blocos — painel geral */
export function DashboardIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </S>
  );
}

/** Casa */
export function HomeIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M3 11L12 3l9 8v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V11z" />
      <polyline points="9 22 9 16 15 16 15 22" />
    </S>
  );
}

/** Três linhas horizontais — menu */
export function MenuIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="3" y1="7" x2="21" y2="7" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="17" x2="21" y2="17" />
    </S>
  );
}

/** X — fechar */
export function CloseIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </S>
  );
}

export function ChevronUpIcon(p: IconProps) {
  return <S {...p}><polyline points="18 15 12 9 6 15" /></S>;
}

export function ChevronDownIcon(p: IconProps) {
  return <S {...p}><polyline points="6 9 12 15 18 9" /></S>;
}

export function ChevronLeftIcon(p: IconProps) {
  return <S {...p}><polyline points="15 18 9 12 15 6" /></S>;
}

export function ChevronRightIcon(p: IconProps) {
  return <S {...p}><polyline points="9 18 15 12 9 6" /></S>;
}

export function ArrowLeftIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="11 18 5 12 11 6" />
    </S>
  );
}

export function ArrowRightIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </S>
  );
}

export function ArrowUpIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="6 11 12 5 18 11" />
    </S>
  );
}

export function ArrowDownIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="18 13 12 19 6 13" />
    </S>
  );
}

/** Três pontos horizontais */
export function MoreHorizontalIcon(p: IconProps) {
  return (
    <S {...p}>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </S>
  );
}

/** Três pontos verticais */
export function MoreVerticalIcon(p: IconProps) {
  return (
    <S {...p}>
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   BUSCA & FILTRO
═══════════════════════════════════════════════════════ */

export function SearchIcon(p: IconProps) {
  return (
    <S {...p}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </S>
  );
}

/** Funil de filtro */
export function FilterIcon(p: IconProps) {
  return (
    <S {...p}>
      <polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3" />
    </S>
  );
}

/** Três sliders de ajuste */
export function SlidersIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   AÇÕES PRIMÁRIAS
═══════════════════════════════════════════════════════ */

export function PlusIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </S>
  );
}

/** Caneta/lápis — editar */
export function EditIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </S>
  );
}

/** Lixeira — excluir */
export function TrashIcon(p: IconProps) {
  return (
    <S {...p}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </S>
  );
}

/** Disquete — salvar */
export function SaveIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </S>
  );
}

/** Dois retângulos sobrepostos — copiar */
export function CopyIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </S>
  );
}

/** Seta para baixo saindo de caixa */
export function DownloadIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </S>
  );
}

/** Seta para cima entrando em caixa */
export function UploadIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </S>
  );
}

/** Impressora */
export function PrintIcon(p: IconProps) {
  return (
    <S {...p}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </S>
  );
}

/** Avião de papel — enviar */
export function SendIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </S>
  );
}

/** Duas setas em círculo — atualizar */
export function RefreshIcon(p: IconProps) {
  return (
    <S {...p}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </S>
  );
}

/** Seta saindo de caixa — link externo */
export function ExternalLinkIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </S>
  );
}

/** Dois elos — link */
export function LinkIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </S>
  );
}

/** Seta para cima com braços — compartilhar */
export function ShareIcon(p: IconProps) {
  return (
    <S {...p}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   STATUS & FEEDBACK
═══════════════════════════════════════════════════════ */

/** Check simples */
export function CheckIcon(p: IconProps) {
  return <S {...p}><polyline points="20 6 9 17 4 12" /></S>;
}

/** Check dentro de círculo — sucesso */
export function CheckCircleIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </S>
  );
}

/** X dentro de círculo — erro */
export function XCircleIcon(p: IconProps) {
  return (
    <S {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </S>
  );
}

/** Triângulo com exclamação — aviso */
export function AlertTriangleIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </S>
  );
}

/** Círculo com i — informação */
export function InfoIcon(p: IconProps) {
  return (
    <S {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </S>
  );
}

/** Sino — notificação */
export function BellIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </S>
  );
}

/** Sino com ponto vermelho — notificação não lida */
export function BellDotIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <circle cx="18" cy="5" r="3" fill="currentColor" stroke="none" />
    </S>
  );
}

/** Raio — ação automática / rápida */
export function ZapIcon(p: IconProps) {
  return <S {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></S>;
}

/* ═══════════════════════════════════════════════════════
   USUÁRIO & ACESSO
═══════════════════════════════════════════════════════ */

/** Silhueta de pessoa */
export function UserIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </S>
  );
}

/** Duas silhuetas — usuários / equipe */
export function UsersIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </S>
  );
}

/** Seta saindo de porta — sair */
export function LogoutIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </S>
  );
}

/** Cadeado fechado */
export function LockIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </S>
  );
}

/** Cadeado aberto */
export function UnlockIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </S>
  );
}

/** Escudo */
export function ShieldIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   TEMPO
═══════════════════════════════════════════════════════ */

/** Calendário */
export function CalendarIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </S>
  );
}

/** Relógio */
export function ClockIcon(p: IconProps) {
  return (
    <S {...p}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   TEMA
═══════════════════════════════════════════════════════ */

/** Sol — modo claro */
export function SunIcon(p: IconProps) {
  return (
    <S {...p}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </S>
  );
}

/** Lua — modo escuro */
export function MoonIcon(p: IconProps) {
  return <S {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></S>;
}

/* ═══════════════════════════════════════════════════════
   ARQUIVOS & DOCUMENTOS
═══════════════════════════════════════════════════════ */

/** Folha com canto dobrado */
export function FileIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </S>
  );
}

/** Folha com linhas de texto */
export function DocumentIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </S>
  );
}

/** Pasta de arquivos */
export function FolderIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </S>
  );
}

/** Livro aberto — catálogo */
export function BookOpenIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </S>
  );
}

/** Imagem / foto */
export function ImageIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </S>
  );
}

/** Clipe de papel — anexo */
export function AttachmentIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </S>
  );
}

/** Nota com seta — anotação / histórico */
export function NoteIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="12" y1="17" x2="8" y2="17" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   DADOS & GRÁFICOS
═══════════════════════════════════════════════════════ */

/** Barras verticais crescentes */
export function BarChartIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </S>
  );
}

/** Linha de tendência subindo */
export function TrendingUpIcon(p: IconProps) {
  return (
    <S {...p}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </S>
  );
}

/** Linha de tendência descendo */
export function TrendingDownIcon(p: IconProps) {
  return (
    <S {...p}>
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </S>
  );
}

/** Fatia de torta */
export function PieChartIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </S>
  );
}

/** Pulso / atividade */
export function ActivityIcon(p: IconProps) {
  return <S {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></S>;
}

/** Cilindro — banco de dados */
export function DatabaseIcon(p: IconProps) {
  return (
    <S {...p}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   VISUALIZAÇÃO
═══════════════════════════════════════════════════════ */

/** Olho aberto */
export function EyeIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </S>
  );
}

/** Olho com risco — ocultar */
export function EyeOffIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   CONFIGURAÇÕES
═══════════════════════════════════════════════════════ */

/** Engrenagem */
export function SettingsIcon(p: IconProps) {
  return (
    <S {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </S>
  );
}

/** Servidor */
export function ServerIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </S>
  );
}

/** Maximizar — expandir */
export function MaximizeIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </S>
  );
}

/** Minimizar — recolher */
export function MinimizeIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   COMUNICAÇÃO
═══════════════════════════════════════════════════════ */

/** Envelope — email */
export function MailIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22 6 12 13 2 6" />
    </S>
  );
}

/** Telefone */
export function PhoneIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </S>
  );
}

/** Globo — web / endereço */
export function GlobeIcon(p: IconProps) {
  return (
    <S {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </S>
  );
}

/** Pin de mapa */
export function MapPinIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   DOMÍNIO BUSINESS
═══════════════════════════════════════════════════════ */

/** Casa/prédio — obras e fornecedores */
export function BuildingIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </S>
  );
}

/** Depósito industrial */
export function WarehouseIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M3 21h18" />
      <path d="M3 10l9-7 9 7v11H3V10z" />
      <rect x="9" y="14" width="6" height="7" rx="0.5" />
      <line x1="6" y1="14" x2="6" y2="18" />
      <line x1="18" y1="14" x2="18" y2="18" />
    </S>
  );
}

/** Caixa 3D — pedido / pacote */
export function PackageIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </S>
  );
}

/** Bolsa de compras */
export function ShoppingBagIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </S>
  );
}

/** Cifrão — financeiro */
export function DollarSignIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </S>
  );
}

/** Pasta executiva — empresa */
export function BriefcaseIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="8" y1="14" x2="16" y2="14" />
    </S>
  );
}

/** Cartão de crédito — forma de pagamento */
export function CreditCardIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
      <line x1="7" y1="15" x2="7.01" y2="15" />
      <line x1="11" y1="15" x2="15" y2="15" />
    </S>
  );
}

/** Caminhão — entrega / transporte */
export function TruckIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </S>
  );
}

/** Etiqueta de preço */
export function TagIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </S>
  );
}

/** Carrinho de compras */
export function CartIcon(p: IconProps) {
  return (
    <S {...p}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </S>
  );
}

/** Estrela — favorito / destaque */
export function StarIcon(p: IconProps) {
  return (
    <S {...p}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   MÓDULOS SQUADSYSTEM
═══════════════════════════════════════════════════════ */

/** Lista com checks — tarefas */
export function TasksIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <polyline points="4 6 5 7 7 5" />
      <polyline points="4 12 5 13 7 11" />
      <polyline points="4 18 5 19 7 17" />
    </S>
  );
}

/** Colunas verticais — Kanban */
export function KanbanIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="3" y="3" width="5" height="18" rx="1.5" />
      <rect x="10" y="3" width="5" height="12" rx="1.5" />
      <rect x="17" y="3" width="4" height="15" rx="1.5" />
    </S>
  );
}

/** Nós conectados em fluxo — Flow */
export function FlowIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="15" y="3" width="6" height="6" rx="1.5" />
      <rect x="9" y="15" width="6" height="6" rx="1.5" />
      <line x1="9" y1="6" x2="15" y2="6" />
      <line x1="6" y1="9" x2="12" y2="15" />
      <line x1="18" y1="9" x2="12" y2="15" />
    </S>
  );
}

/** Régua — Measure */
export function MeasureIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="2" y="8" width="20" height="8" rx="1.5" />
      <line x1="6" y1="8" x2="6" y2="12" />
      <line x1="10" y1="8" x2="10" y2="14" />
      <line x1="14" y1="8" x2="14" y2="12" />
      <line x1="18" y1="8" x2="18" y2="14" />
    </S>
  );
}

/** Diamante — Wise (analytics / insights) */
export function WiseIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M12 2L22 12L12 22L2 12Z" />
      <path d="M12 7L17 12L12 17L7 12Z" />
    </S>
  );
}

/** Nó central com 4 conexões — Hub */
export function HubIcon(p: IconProps) {
  return (
    <S {...p}>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="3.5" r="1.5" />
      <circle cx="20.5" cy="12" r="1.5" />
      <circle cx="12" cy="20.5" r="1.5" />
      <circle cx="3.5" cy="12" r="1.5" />
      <line x1="12" y1="5" x2="12" y2="9" />
      <line x1="19" y1="12" x2="15" y2="12" />
      <line x1="12" y1="15" x2="12" y2="19" />
      <line x1="5" y1="12" x2="9" y2="12" />
    </S>
  );
}

/** Caixas empilhadas — Stock */
export function StockIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M12 2l9 4.5L12 11 3 6.5 12 2z" />
      <path d="M21 6.5v5L12 17l-9-5.5v-5" />
      <path d="M21 12v5L12 22l-9-5v-5" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   FORMULÁRIOS & INPUTS
═══════════════════════════════════════════════════════ */

/** Checkbox marcado */
export function CheckSquareIcon(p: IconProps) {
  return (
    <S {...p}>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </S>
  );
}

/** Toggle ligado — direita */
export function ToggleOnIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="1" y="5" width="22" height="14" rx="7" />
      <circle cx="16" cy="12" r="3" fill="currentColor" stroke="none" />
    </S>
  );
}

/** Toggle desligado — esquerda */
export function ToggleOffIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="1" y="5" width="22" height="14" rx="7" />
      <circle cx="8" cy="12" r="3" fill="currentColor" stroke="none" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   RICH TEXT FORMATTING
═══════════════════════════════════════════════════════ */

/** Negrito */
export function BoldIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </S>
  );
}

/** Itálico */
export function ItalicIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </S>
  );
}

/** Sublinhado */
export function UnderlineIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </S>
  );
}

/** Tachado */
export function StrikethroughIcon(p: IconProps) {
  return (
    <S {...p}>
      <path d="M17.3 12.3C17.8 12.9 18 13.6 18 14.4c0 1.7-1.3 3.1-3.1 3.5-.6.1-1.2.2-1.9.2-2 0-3.6-.6-4.9-1.7" />
      <path d="M6.7 11.7C6.3 11.2 6 10.5 6 9.6 6 7.6 7.6 6 9.8 6c.8 0 1.5.1 2.2.4 1 .4 1.8 1 2.4 1.7" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </S>
  );
}

/** Caixa de entrada */
export function InboxIcon(p: IconProps) {
  return (
    <S {...p}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </S>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT & ESTRUTURA
═══════════════════════════════════════════════════════ */

/** Camadas sobrepostas */
export function LayersIcon(p: IconProps) {
  return (
    <S {...p}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </S>
  );
}

/** Grade 3×2 — visualização em grid */
export function GridIcon(p: IconProps) {
  return (
    <S {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </S>
  );
}

/** Lista simples */
export function ListIcon(p: IconProps) {
  return (
    <S {...p}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </S>
  );
}

/** Código — desenvolvimento */
export function CodeIcon(p: IconProps) {
  return (
    <S {...p}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </S>
  );
}

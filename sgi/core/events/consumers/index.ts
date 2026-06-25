import "server-only";
import { DomainEvent } from "../event-types";
import { sideEffectsConsumerHandler } from "./side-effects.consumer";
import { kanbanConsumerHandler } from "./kanban.consumer";
import { historicoConsumerHandler } from "./historico.consumer";
import { assinaturaConsumerHandler } from "./assinatura.consumer";
import { dashboardConsumerHandler } from "./dashboard.consumer";

export type ConsumerFn = (event: DomainEvent) => Promise<void>;

// Críticos: falha aborta a operação inteira.
// SideEffects altera o estado do DB (ex: reverter solicitações, remover Storage).
// Se falhar, a operação não tem consistência — correto interromper.
export const CRITICAL_CONSUMERS: ConsumerFn[] = [
  sideEffectsConsumerHandler,
];

// Observers: falha é registrada mas NÃO impede a operação principal.
// O dado já foi salvo com sucesso — esses consumers são efeitos colaterais.
export const OBSERVER_CONSUMERS: ConsumerFn[] = [
  kanbanConsumerHandler,
  historicoConsumerHandler,
  assinaturaConsumerHandler,
  dashboardConsumerHandler,
];

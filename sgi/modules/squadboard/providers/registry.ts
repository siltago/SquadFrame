import "server-only";

import { TrelloProvider } from "./trello/trello-provider";
import type { BoardProvider, ProviderId } from "./index";

// Registro de providers disponíveis.
// Para adicionar um novo provider: instanciar aqui + adicionar ao tipo ProviderId.
const REGISTRY: Record<ProviderId, BoardProvider> = {
  trello: new TrelloProvider(),
};

export function getProvider(id: ProviderId): BoardProvider {
  const provider = REGISTRY[id];
  if (!provider) throw new Error(`Provider "${id}" não está registrado.`);
  return provider;
}

export function getAllProviders(): BoardProvider[] {
  return Object.values(REGISTRY);
}

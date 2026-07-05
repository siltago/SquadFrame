export function buildCacheKey(provider: string, boardId: string): string {
  return `${provider}:${boardId}`;
}

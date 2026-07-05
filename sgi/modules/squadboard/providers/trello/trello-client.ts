import "server-only";

// Toda comunicação com a API do Trello passa por aqui.
// Nunca importar este arquivo em componentes client.
// Credenciais via variáveis de ambiente; preparado para OAuth (trocar authParams).

const BASE = "https://api.trello.com/1";

function authParams(): string {
  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  if (!key || !token) {
    throw new Error(
      "TRELLO_API_KEY e TRELLO_TOKEN são obrigatórios. Configure-os em .env.local.",
    );
  }
  return `key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`;
}

export async function trelloGet<T>(
  path: string,
  params: Record<string, string> = {},
  cacheTag?: string,
  revalidate = 60,
): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${path}?${authParams()}${qs ? `&${qs}` : ""}`;

  const fetchOptions: RequestInit = cacheTag
    ? { next: { revalidate, tags: [cacheTag] } }
    : { next: { revalidate } };

  const res = await fetch(url, fetchOptions);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Trello ${res.status} — ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function trelloPut<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = `${BASE}${path}?${authParams()}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const b = await res.text().catch(() => "");
    throw new Error(`Trello PUT ${res.status} — ${path}: ${b}`);
  }
  return res.json() as Promise<T>;
}

export async function trelloPost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = `${BASE}${path}?${authParams()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const b = await res.text().catch(() => "");
    throw new Error(`Trello POST ${res.status} — ${path}: ${b}`);
  }
  return res.json() as Promise<T>;
}

export async function trelloDelete(path: string): Promise<void> {
  const url = `${BASE}${path}?${authParams()}`;
  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!res.ok) {
    const b = await res.text().catch(() => "");
    throw new Error(`Trello DELETE ${res.status} — ${path}: ${b}`);
  }
}

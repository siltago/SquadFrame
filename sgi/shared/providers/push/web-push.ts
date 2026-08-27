import "server-only";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = require("web-push");

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@squadframe.com";

let vapidConfigured = false;
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  vapidConfigured = true;
} else {
  // Sem isso, todo envio falha em silêncio (early return em
  // sendPushToSubscription/sendPushToSubscriptions) — se as env vars
  // faltarem só no ambiente de produção (nunca testado localmente com o
  // mesmo .env), o sintoma vira "não chega notificação" sem nenhuma pista
  // nos logs. Loga uma vez, no cold start da função.
  console.error(
    "[web-push] VAPID não configurado — NEXT_PUBLIC_VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY ausente. Push notifications não serão enviadas.",
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  actions?: Array<{ action: string; title: string }>;
}

export interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// endpointsExpirados: quem chamou pode apagar essas linhas de
// push_subscriptions — 404/410 é subscription revogada/expirada de
// verdade, e 400 VapidPkHashMismatch é subscription criada com uma chave
// VAPID antiga (rotacionada desde então): em ambos os casos o endpoint
// nunca mais vai funcionar, não é um erro passageiro pra tentar de novo.
export interface ResultadoEnvioPush {
  endpoint: string;
  ok: boolean;
  expirado: boolean;
}

export async function sendPushToSubscription(
  subscription: PushSubscription,
  payload: PushPayload,
): Promise<ResultadoEnvioPush> {
  if (!vapidConfigured) return { endpoint: subscription.endpoint, ok: false, expirado: false };

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({
        icon: "/icon-192-v3.png",
        badge: "/icon-192-v3.png",
        ...payload,
      }),
    );
    return { endpoint: subscription.endpoint, ok: true, expirado: false };
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    const body = String((err as { body?: string })?.body ?? "");
    const expirado = status === 404 || status === 410 || (status === 400 && body.includes("VapidPkHashMismatch"));
    // Nunca deixar isso sumir — expirado é esperado com o tempo, mas
    // qualquer outro erro (payload malformado etc.) precisa aparecer nos
    // logs, senão "não chega notificação" nunca tem pista nenhuma.
    if (!expirado) {
      console.error(`[web-push] Falha ao enviar push (endpoint ...${subscription.endpoint.slice(-24)}, status ${status ?? "?"}):`, err);
    }
    return { endpoint: subscription.endpoint, ok: false, expirado };
  }
}

export async function sendPushToSubscriptions(
  subscriptions: PushSubscription[],
  payload: PushPayload,
): Promise<ResultadoEnvioPush[]> {
  if (!vapidConfigured || !subscriptions.length) return [];

  const resultados = await Promise.allSettled(
    subscriptions.map((sub) => sendPushToSubscription(sub, payload)),
  );
  return resultados.map((r, i) =>
    r.status === "fulfilled" ? r.value : { endpoint: subscriptions[i].endpoint, ok: false, expirado: false },
  );
}

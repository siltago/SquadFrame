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

export async function sendPushToSubscription(
  subscription: PushSubscription,
  payload: PushPayload,
): Promise<void> {
  if (!vapidConfigured) return;

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
  } catch (err) {
    // Nunca deixar isso sumir — status 410/404 (subscription expirada/
    // revogada) é esperado com o tempo, mas qualquer outro erro (VAPID
    // inválido, payload malformado etc.) precisa aparecer nos logs, senão
    // "não chega notificação" nunca tem pista nenhuma.
    const status = (err as { statusCode?: number })?.statusCode;
    console.error(`[web-push] Falha ao enviar push (endpoint ...${subscription.endpoint.slice(-24)}, status ${status ?? "?"}):`, err);
  }
}

export async function sendPushToSubscriptions(
  subscriptions: PushSubscription[],
  payload: PushPayload,
): Promise<void> {
  if (!vapidConfigured || !subscriptions.length) return;

  await Promise.allSettled(
    subscriptions.map((sub) => sendPushToSubscription(sub, payload)),
  );
}

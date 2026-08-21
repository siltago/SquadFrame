"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

interface PwaContextValue {
  isOnline: boolean;
  canInstall: boolean;
  isInstalled: boolean;
  installApp: () => Promise<void>;
  showIOSInstructions: boolean;
  isPushSupported: boolean;
  pushPermission: NotificationPermission | "unsupported";
  requestPushPermission: () => Promise<{ ok: boolean; motivo?: string }>;
  hasUpdate: boolean;
  applyUpdate: () => void;
}

const PwaContext = createContext<PwaContextValue>({
  isOnline: true,
  canInstall: false,
  isInstalled: false,
  installApp: async () => {},
  showIOSInstructions: false,
  isPushSupported: false,
  pushPermission: "unsupported",
  requestPushPermission: async () => ({ ok: false }),
  hasUpdate: false,
  applyUpdate: () => {},
});

export function usePwa() {
  return useContext(PwaContext);
}

interface Props {
  children: ReactNode;
  usuarioId?: string | null;
  vapidPublicKey?: string;
}

export function PwaProvider({ children, usuarioId, vapidPublicKey }: Props) {
  const [isOnline, setIsOnline] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const deferredPromptRef = useRef<any>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  const isPushSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Estado inicial de conexão
    setIsOnline(navigator.onLine);

    // Detectar se já está instalado
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) setIsInstalled(true);

    // Detectar iOS Safari (sem suporte a beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isIOS && isSafari && !standalone) {
      setShowIOSInstructions(true);
    }

    // Push permission
    if ("Notification" in window) {
      setPushPermission(Notification.permission);
    }

    // Online / Offline
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // beforeinstallprompt (Chrome/Edge/Android)
    const onInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);

    // appinstalled
    const onInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setShowIOSInstructions(false);
      deferredPromptRef.current = null;
    };
    window.addEventListener("appinstalled", onInstalled);

    // Registrar Service Worker — nunca em dev: sw.js cacheia /_next/static/
    // com cache-first, e o Next em dev às vezes reusa o mesmo nome de chunk
    // entre recompilações (HMR) — o SW serve o JS antigo pra sempre, mesmo
    // com o dev server já rodando o código novo, e nada nas devtools chama
    // atenção pra isso (parece só "a mudança não tem efeito").
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Verificar atualização disponível imediatamente
          if (reg.waiting) {
            waitingWorkerRef.current = reg.waiting;
            setHasUpdate(true);
          }

          // Detectar quando um novo SW entra em estado "waiting"
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                waitingWorkerRef.current = newWorker;
                setHasUpdate(true);
              }
            });
          });

          // Verificar atualização a cada 60 segundos
          const interval = setInterval(() => reg.update().catch(() => {}), 60_000);

          // Ressincroniza a subscription de push com o servidor. A permissão
          // do navegador (Notification.permission) fica "granted" pra
          // sempre, mas a linha em push_subscriptions pode ter sido apagada
          // (endpoint expirado detectado num envio qualquer) sem o
          // navegador nunca ficar sabendo — nesse caso o botão de "ativar
          // notificações" nem aparece mais (só mostra quando permission !==
          // granted), e o usuário fica travado sem push e sem forma de
          // consertar pela UI. Reenviar a subscription que o navegador já
          // tem (ou criar uma nova, se o navegador também a perdeu) a cada
          // carregamento resolve os dois casos, sem prompt nenhum.
          if (Notification.permission === "granted" && vapidPublicKey && usuarioId) {
            reg.pushManager
              .getSubscription()
              .then((existing) =>
                existing ??
                reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as string,
                })
              )
              .then((subscription) =>
                fetch("/api/push/subscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    browser: detectBrowser(),
                    platform: navigator.platform,
                  }),
                })
              )
              .catch((err) => console.error("[Push] resync failed:", err));
          }

          return () => clearInterval(interval);
        })
        .catch((err) => console.error("[SW] registration failed:", err));

      // SW_ACTIVATED: nova versão ativou — reload para consumir assets novos
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SW_ACTIVATED") {
          // Não forçar reload automaticamente — o banner faz isso
        }
      });

      // Reload quando o SW muda (versão nova assumiu controle)
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") {
      setIsInstalled(true);
      setCanInstall(false);
    }
    deferredPromptRef.current = null;
  }, []);

  const applyUpdate = useCallback(() => {
    const worker = waitingWorkerRef.current;
    if (worker) {
      worker.postMessage({ type: "SKIP_WAITING" });
      setHasUpdate(false);
    }
  }, []);

  const requestPushPermission = useCallback(async (): Promise<{ ok: boolean; motivo?: string }> => {
    if (!usuarioId) return { ok: false, motivo: "Usuário não identificado." };
    if (!vapidPublicKey) {
      // Sem NEXT_PUBLIC_VAPID_PUBLIC_KEY no build, o botão não tinha
      // nenhum retorno visível — parecia simplesmente não fazer nada ao
      // clicar. NEXT_PUBLIC_* é embutido em build time: se a env var foi
      // adicionada depois do último deploy, só passa a valer no próximo.
      console.error("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY ausente — variável não estava disponível no build.");
      return { ok: false, motivo: "Notificações push não estão configuradas neste ambiente (chave VAPID ausente)." };
    }
    // No iOS o PushManager só fica disponível após interação — retestar no momento do clique
    const pushOk =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!pushOk) return { ok: false, motivo: "Este navegador não suporta notificações push." };
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") {
        return { ok: false, motivo: "Permissão de notificação não concedida." };
      }

      const sw = await navigator.serviceWorker.ready;
      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as string,
      });

      const resp = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          browser: detectBrowser(),
          platform: navigator.platform,
        }),
      });
      if (!resp.ok) {
        console.error("[Push] /api/push/subscribe respondeu", resp.status);
        return { ok: false, motivo: "Falha ao registrar a assinatura no servidor." };
      }
      return { ok: true };
    } catch (err) {
      console.error("[Push] subscription failed:", err);
      return { ok: false, motivo: "Não foi possível ativar as notificações. Tente de novo em instantes." };
    }
  }, [usuarioId, vapidPublicKey]);

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        canInstall: canInstall && !isInstalled,
        isInstalled,
        installApp,
        showIOSInstructions: showIOSInstructions && !isInstalled,
        isPushSupported,
        pushPermission,
        requestPushPermission,
        hasUpdate,
        applyUpdate,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/")) return "Safari";
  if (ua.includes("Samsung")) return "Samsung Internet";
  return "Unknown";
}

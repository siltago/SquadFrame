import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.TRAINING_BASE_URL;
const email = process.env.TRAINING_EMAIL;
const password = process.env.TRAINING_PASSWORD;
const outputDir = new URL("../public/treinamento/carteiras/", import.meta.url);

if (!baseUrl || !email || !password) throw new Error("Variaveis de captura ausentes.");

const target = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" }).then((r) => r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  message.error ? reject(new Error(message.error.message)) : resolve(message.result);
});

function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, { resolve, reject });
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
}

async function evaluate(expression) {
  const result = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Tempo esgotado aguardando: ${expression}`);
}

async function navigate(path) {
  await cdp("Page.navigate", { url: new URL(path, baseUrl).href });
  await waitFor("document.readyState === 'complete'");
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

async function shot(name) {
  await evaluate("window.scrollTo(0, 0)");
  const metrics = await cdp("Page.getLayoutMetrics");
  const width = Math.ceil(metrics.cssContentSize.width);
  const height = Math.ceil(metrics.cssContentSize.height);
  const result = await cdp("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  });
  await writeFile(new URL(name, outputDir), Buffer.from(result.data, "base64"));
}

await mkdir(outputDir, { recursive: true });
await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

await navigate("/login");
await waitFor("document.querySelector('input[type=email]') && document.querySelector('input[type=password]')");
await evaluate(`(() => {
  const set = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  set(document.querySelector('input[type=email]'), ${JSON.stringify(email)});
  set(document.querySelector('input[type=password]'), ${JSON.stringify(password)});
  document.querySelector('form').requestSubmit();
})()`);
await new Promise((resolve) => setTimeout(resolve, 2500));
const loginError = await evaluate("document.body.innerText.includes('E-mail ou senha incorretos.')");
if (loginError) throw new Error("Falha no login: credenciais recusadas pelo sistema.");
await navigate("/");
if (await evaluate("location.pathname.includes('login')")) throw new Error("Falha no login: sessão não foi criada.");

await navigate("/squadframe/financeiro/contratos");
await shot("01-contratos.png");
await navigate("/squadframe/financeiro/contratos/novo");
await shot("02-novo-contrato.png");

await navigate("/squadframe/financeiro/contratos");
const detalheHref = await evaluate("document.querySelector('a[href^=\"/squadframe/financeiro/contratos/\"]:not([href$=\"/novo\"])')?.getAttribute('href') || null");
if (detalheHref) {
  await navigate(detalheHref);
  await shot("03-destinos-alocacoes.png");
}

await navigate("/squadframe/financeiro?aba=carteiras");
await shot("04-carteiras.png");
await navigate("/squadframe/financeiro?aba=faturamento-direto");
await shot("05-correcao-saldo.png");

ws.close();
console.log(JSON.stringify({ detalheCapturado: Boolean(detalheHref) }));

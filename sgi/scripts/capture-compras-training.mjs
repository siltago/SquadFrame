import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.TRAINING_BASE_URL;
const email = process.env.TRAINING_EMAIL;
const password = process.env.TRAINING_PASSWORD;
const outputDir = new URL("../public/treinamento/processos-compras/", import.meta.url);

if (!baseUrl || !email || !password) throw new Error("Variáveis de captura ausentes.");

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
  const callback = pending.get(message.id);
  pending.delete(message.id);
  message.error ? callback.reject(new Error(message.error.message)) : callback.resolve(message.result);
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
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
  const width = Math.min(1600, Math.ceil(metrics.cssContentSize.width));
  const height = Math.ceil(metrics.cssContentSize.height);
  const result = await cdp("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  });
  await writeFile(new URL(name, outputDir), Buffer.from(result.data, "base64"));
}

async function firstHref(prefix, exclude = "") {
  return evaluate(`(() => {
    const links = [...document.querySelectorAll('a[href^=${JSON.stringify(prefix)}]')];
    return links.find((a) => !${JSON.stringify(exclude)} || !a.getAttribute('href').includes(${JSON.stringify(exclude)}))?.getAttribute('href') || null;
  })()`);
}

async function captureDetail(listPath, prefix, name, suffix = "", exclude = "/novo") {
  await navigate(listPath);
  const href = await firstHref(prefix, exclude);
  if (!href) return null;
  await navigate(`${href}${suffix}`);
  await shot(name);
  return href;
}

await mkdir(outputDir, { recursive: true });
await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

await navigate("/login");
const loginVisible = await evaluate("Boolean(document.querySelector('input[type=email]') && document.querySelector('input[type=password]'))");
if (loginVisible) {
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
  if (await evaluate("document.body.innerText.includes('E-mail ou senha incorretos.')")) throw new Error("Credenciais recusadas.");
  await navigate("/");
}

await navigate("/squadframe/compras/solicitacoes");
await shot("solicitacoes-01-lista.png");
await navigate("/squadframe/compras/solicitacoes/nova");
await shot("solicitacoes-02-nova.png");
await captureDetail("/squadframe/compras/solicitacoes", "/squadframe/compras/solicitacoes/", "solicitacoes-03-detalhe.png", "", "/nova");

await navigate("/squadframe/compras/pedidos");
await shot("pedidos-01-lista.png");
await navigate("/squadframe/compras/pedidos/novo");
await shot("pedidos-02-novo.png");
await captureDetail("/squadframe/compras/pedidos?status=AGUARDANDO_APROVACAO", "/squadframe/compras/pedidos/", "pedidos-03-aprovacao.png");
const retorno = await captureDetail("/squadframe/compras/pedidos?status=AGUARDANDO_RECEBIMENTO", "/squadframe/compras/pedidos/", "pedidos-04-detalhe-etapas.png");
if (retorno) {
  await navigate(`${retorno}/retornar`);
  await shot("pedidos-05-retorno.png");
}
const devolucao = await captureDetail("/squadframe/compras/pedidos?status=RECEBIDO_PARCIAL", "/squadframe/compras/pedidos/", "pedidos-06-recebido-parcial.png");
if (devolucao) {
  await navigate(`${devolucao}/devolver`);
  await shot("pedidos-07-devolucao.png");
}

await navigate("/squadframe/compras/lotes");
await shot("lotes-01-lista.png");
await captureDetail("/squadframe/compras/lotes", "/squadframe/compras/lotes/", "lotes-02-detalhe-vinculo.png");

await navigate("/squadframe/compras/entregas");
await shot("romaneios-01-lista.png");
await navigate("/squadframe/compras/entregas/novo");
await shot("romaneios-02-novo.png");
await captureDetail("/squadframe/compras/entregas", "/squadframe/compras/entregas/", "romaneios-03-detalhe.png");

await navigate("/squadframe/beneficiamento");
await shot("beneficiamento-01-lista.png");
await navigate("/squadframe/beneficiamento/novo");
await shot("beneficiamento-02-novo.png");
await captureDetail("/squadframe/beneficiamento", "/squadframe/beneficiamento/", "beneficiamento-03-detalhe.png");

await navigate("/squadframe/financeiro?aba=faturamento-direto");
await shot("faturamento-01-pendencias.png");
const pedidoDebito = await firstHref("/squadframe/compras/pedidos/");
if (pedidoDebito) {
  await navigate(pedidoDebito);
  await shot("faturamento-02-aprovar-debito.png");
}

ws.close();
console.log("Capturas de Compras concluídas.");

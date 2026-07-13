import "server-only";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM; // dígitos com DDI, ex "14155238886"
const TWILIO_CONTENT_SID = process.env.TWILIO_CONTENT_SID; // opcional — template aprovado na Meta

const configured = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM);

export interface WhatsappSendResult {
  ok: boolean;
  error?: string;
}

// numero em E.164 sem "+" (ex "5511999998888")
export async function sendWhatsappMessage(numero: string, texto: string): Promise<WhatsappSendResult> {
  if (!configured) return { ok: false, error: "not_configured" };

  const params = new URLSearchParams();
  params.set("From", `whatsapp:+${TWILIO_WHATSAPP_FROM}`);
  params.set("To", `whatsapp:+${numero}`);

  // Fora da janela de 24h após msg do usuário, o WhatsApp Business Platform só
  // aceita mensagens iniciadas pela empresa via template aprovado na Meta.
  // Com TWILIO_CONTENT_SID configurado, manda como template (1 variável = texto
  // inteiro); sem isso, manda como Body livre (funciona no Sandbox e dentro da
  // janela de 24h de conversas já iniciadas pelo usuário).
  if (TWILIO_CONTENT_SID) {
    params.set("ContentSid", TWILIO_CONTENT_SID);
    params.set("ContentVariables", JSON.stringify({ "1": texto }));
  } else {
    params.set("Body", texto);
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `http_${res.status}: ${body.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "unknown_error" };
  }
}

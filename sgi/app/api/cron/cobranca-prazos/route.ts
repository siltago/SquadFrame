import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { executarCobrancaPrazos } from "@/modules/squadframe/services/cobranca/executar-cobranca";

// Job agendado (ver vercel.json, schedule "0 11 * * 1-5" = 08h BRT, seg-sex).
// Cobra diariamente, via WhatsApp, pedidos e solicitações parados em
// AGUARDANDO_APROVACAO. Protegido por CRON_SECRET.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Guarda de dia útil (America/Sao_Paulo) — segunda camada de defesa além do
  // schedule "1-5" do vercel.json, para o caso de disparo manual/replay.
  // ?forcar=1 ignora o guard — útil para testes manuais e disparo sob demanda
  // (autenticado pelo mesmo CRON_SECRET, não é um bypass público).
  const forcar = req.nextUrl.searchParams.get("forcar") === "1";
  const diaSemana = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  }).format(new Date());
  if (!forcar && (diaSemana === "Sat" || diaSemana === "Sun")) {
    return NextResponse.json({ ok: true, skipped: "fim_de_semana" });
  }

  const admin = createAdminClient();
  const resultado = await executarCobrancaPrazos(admin);

  return NextResponse.json({ ok: true, resultado });
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { escalonarPendenciasCriticas } from "@/modules/squadframe/services/pendencias/escalonar";

// Job agendado (ver vercel.json, schedule "0 12 * * 1-5" = 09h BRT, seg-sex,
// 1h depois do cobranca-prazos pra não concorrer). Escala pendências
// críticas (>5 dias) pros gestores via push/notificação in-app. Protegido
// por CRON_SECRET, mesmo padrão de app/api/cron/cobranca-prazos/route.ts.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const forcar = req.nextUrl.searchParams.get("forcar") === "1";
  const diaSemana = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  }).format(new Date());
  if (!forcar && (diaSemana === "Sat" || diaSemana === "Sun")) {
    return NextResponse.json({ ok: true, skipped: "fim_de_semana" });
  }

  const admin = createAdminClient();
  const resultado = await escalonarPendenciasCriticas(admin);

  return NextResponse.json({ ok: true, resultado });
}

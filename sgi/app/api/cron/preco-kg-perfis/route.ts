import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { recalcularPrecoKgPerfis } from "@/modules/squadframe/lib/preco-kg-perfis";

// Job agendado (ver vercel.json) — roda no dia 1 e no dia 16 de cada mês,
// recalculando o preço/kg médio dos perfis a partir dos pedidos com valor
// final confirmado no mês corrente. Protegido por CRON_SECRET.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const resultado = await recalcularPrecoKgPerfis(admin);

  return NextResponse.json({ ok: true, resultado });
}

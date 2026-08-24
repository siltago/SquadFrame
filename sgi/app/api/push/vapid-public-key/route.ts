import { NextResponse } from "next/server";

// Chave pública, sem problema nenhum expor — é o mesmo valor de
// NEXT_PUBLIC_VAPID_PUBLIC_KEY já embutido no bundle do cliente. Existe só
// pra o service worker (que não tem acesso a env vars do Next) conseguir
// resubscrever sozinho no handler de pushsubscriptionchange.
export async function GET() {
  return NextResponse.json({ key: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null });
}

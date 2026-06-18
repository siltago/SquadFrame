import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ texto: null });

  const admin = createAdminClient();
  const { data: usuario } = await admin
    .from("usuarios").select("id").eq("auth_id", user.id).single();
  if (!usuario) return NextResponse.json({ texto: null });

  const { data } = await admin
    .from("assinaturas").select("texto").eq("usuario_id", usuario.id).single();

  return NextResponse.json({ texto: data?.texto ?? null });
}

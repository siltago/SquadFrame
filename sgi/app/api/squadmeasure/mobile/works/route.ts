import { NextRequest } from "next/server";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { authenticate, failure, ok, requirePermission } from "../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await authenticate(request);
    requirePermission(ctx, "squadmeasure.visualizar");
    const { data, error } = await createAdminClient()
      .from("obras")
      .select("id,codigo,nome,endereco,cidade,estado,cliente:clientes(id,nome,razao_social)")
      .is("deleted_at", null)
      .order("nome");
    if (error) throw error;
    return ok((data ?? []).map(work => {
      const client = work.cliente as unknown as { id:string; nome:string; razao_social:string|null } | null;
      return { id:work.id, code:work.codigo, name:work.nome, clientName:client?.nome ?? client?.razao_social ?? null, address:[work.endereco,work.cidade,work.estado].filter(Boolean).join(" · ") || null };
    }));
  } catch (error) {
    return failure(error);
  }
}

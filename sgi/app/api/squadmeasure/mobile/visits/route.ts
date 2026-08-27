import { NextRequest } from "next/server";
import { z } from "zod";
import * as service from "@/modules/squadmeasure/services";
import { authenticate, failure, ok, parse, requirePermission } from "../_lib/auth";

const schema = z.object({
  workId: z.string().uuid(),
  priority: z.enum(["baixa","normal","alta","urgente"]).default("normal"),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await authenticate(request);
    requirePermission(ctx, "squadmeasure.criar_visita");
    const body = parse(schema, await request.json());
    const id = await service.createVisit({ obra_id:body.workId, medidor_responsavel_id:ctx.userId, prioridade:body.priority, agendada_para:new Date().toISOString(), observacoes_gerais:body.notes }, ctx.userId);
    return ok({ id }, 201);
  } catch (error) {
    return failure(error);
  }
}

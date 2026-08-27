import { NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/shared/database/supabase-admin";
import {
  authenticate,
  failure,
  MobileError,
  ok,
  requirePermission,
  requireVisitAccess,
} from "../_lib/auth";

const dimensionSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["dimension", "leader"]).optional().default("dimension"),
  text: z.string().trim().min(1).max(500).optional(),
  name: z.string().trim().min(1).max(120),
  value: z.number().finite(),
  unit: z.enum(["mm", "cm", "m", "graus", "unidade"]),
  x1: z.number().min(0).max(1),
  y1: z.number().min(0).max(1),
  x2: z.number().min(0).max(1),
  y2: z.number().min(0).max(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
}).refine(value => value.x1 !== value.x2 || value.y1 !== value.y2)
  .refine(value => value.kind !== "leader" || Boolean(value.text));

const metadataSchema = z.object({
  id: z.string().uuid(),
  visitId: z.string().uuid(),
  environmentId: z.string().uuid().optional(),
  elementId: z.string().uuid().optional(),
  width: z.coerce.number().int().positive(),
  height: z.coerce.number().int().positive(),
  capturedAt: z.string().datetime(),
  dimensions: z.array(dimensionSchema).max(100),
});

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
]);

export async function POST(request: NextRequest) {
  try {
    const ctx = await authenticate(request);
    requirePermission(ctx, "squadmeasure.executar_medicao");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new MobileError("VALIDATION_ERROR", 422);
    if (!allowedMimeTypes.has(file.type) || file.size > 20 * 1024 * 1024)
      throw new MobileError("VALIDATION_ERROR", 422);

    const metadata = metadataSchema.parse({
      id: form.get("id"),
      visitId: form.get("visitId"),
      environmentId: form.get("environmentId") || undefined,
      elementId: form.get("elementId") || undefined,
      width: form.get("width"),
      height: form.get("height"),
      capturedAt: form.get("capturedAt"),
      dimensions: JSON.parse(String(form.get("dimensions") ?? "[]")),
    });
    await requireVisitAccess(ctx, metadata.visitId);

    const admin = createAdminClient();
    if (metadata.elementId) {
      const { data: element } = await admin
        .from("measure_elementos")
        .select("ambiente:measure_ambientes(visita_id)")
        .eq("id", metadata.elementId)
        .maybeSingle();
      const environment = element?.ambiente as unknown as { visita_id: string } | null;
      if (!environment || environment.visita_id !== metadata.visitId)
        throw new MobileError("ENTITY_NOT_FOUND", 404);
    }

    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/heic" ? "heic" : "jpg";
    const storagePath = `${ctx.userId}/${metadata.visitId}/${metadata.id}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from("squadmeasure")
      .upload(storagePath, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const database = admin as any;
    const { error: photoError } = await database.from("measure_fotos").upsert({
      id: metadata.id,
      visita_id: metadata.visitId,
      ambiente_id: metadata.elementId ? null : metadata.environmentId ?? null,
      elemento_id: metadata.elementId ?? null,
      caminho_storage: storagePath,
      nome_arquivo: file.name || `${metadata.id}.${extension}`,
      mime_type: file.type,
      largura: metadata.width,
      altura: metadata.height,
      tamanho_bytes: file.size,
      capturada_em: metadata.capturedAt,
      criado_por: ctx.userId,
      atualizado_por: ctx.userId,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "id" });
    if (photoError) throw photoError;

    if (metadata.dimensions.length) {
      const { error: dimensionsError } = await database
        .from("measure_foto_cotas")
        .upsert(metadata.dimensions.map(dimension => ({
          id: dimension.id,
          foto_id: metadata.id,
          nome: dimension.name,
          valor: dimension.value,
          unidade: dimension.unit,
          x1: dimension.x1,
          y1: dimension.y1,
          x2: dimension.x2,
          y2: dimension.y2,
          cor: dimension.color,
          tipo: dimension.kind === "leader" ? "leader" : "cota",
          texto: dimension.kind === "leader" ? dimension.text : null,
          criado_por: ctx.userId,
          atualizado_por: ctx.userId,
          atualizado_em: new Date().toISOString(),
        })), { onConflict: "id" });
      if (dimensionsError) throw dimensionsError;
    }

    return ok({ id: metadata.id, remotePath: storagePath, version: 1 }, 201);
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return failure(new MobileError("VALIDATION_ERROR", 422));
    return failure(error);
  }
}

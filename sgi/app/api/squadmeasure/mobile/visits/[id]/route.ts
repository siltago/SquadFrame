import { NextRequest } from "next/server";
import * as service from "@/modules/squadmeasure/services";
import { createAdminClient } from "@/shared/database/supabase-admin";
import {
  authenticate,
  failure,
  ok,
  requirePermission,
  requireVisitAccess,
} from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await authenticate(request);
    requirePermission(ctx, "squadmeasure.visualizar");
    const { id } = await params;
    await requireVisitAccess(ctx, id);
    const visit = await service.getVisit(id);
    if (!visit) return failure(new Error("ENTITY_NOT_FOUND"));

    const admin = createAdminClient();
    const database = admin as any;
    const { data: photos, error } = await database
      .from("measure_fotos")
      .select(
        "id,visita_id,ambiente_id,elemento_id,caminho_storage,mime_type,largura,altura,tamanho_bytes,capturada_em,versao,cotas:measure_foto_cotas(id,nome,valor,unidade,x1,y1,x2,y2,cor,tipo,texto)",
      )
      .eq("visita_id", id)
      .is("excluido_em", null)
      .order("capturada_em");
    if (error) throw error;

    const paths = (photos ?? []).map((photo: any) => photo.caminho_storage);
    const signed = paths.length
      ? await admin.storage.from("squadmeasure").createSignedUrls(paths, 3600)
      : { data: [], error: null };
    if (signed.error) throw signed.error;
    const urls = new Map(
      (signed.data ?? []).map(item => [item.path, item.signedUrl]),
    );

    return ok({
      ...visit,
      fotos: (photos ?? []).map((photo: any) => ({
        ...photo,
        url: urls.get(photo.caminho_storage) ?? null,
      })),
    });
  } catch (error) {
    return failure(error);
  }
}

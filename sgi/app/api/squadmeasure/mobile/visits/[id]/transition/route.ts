import { NextRequest } from "next/server";
import { z } from "zod";
import * as service from "@/modules/squadmeasure/services";
import { authenticate,failure,MobileError,ok,parse,requirePermission,requireVisitAccess } from "../../../_lib/auth";
const schema=z.object({action:z.enum(["start","pause","resume","submit_review"]),expectedVersion:z.number().int().positive()});
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){try{const ctx=await authenticate(request);requirePermission(ctx,"squadmeasure.editar_visita");const {id}=await params;const visit=await requireVisitAccess(ctx,id);const body=parse(schema,await request.json());if(visit.versao!==body.expectedVersion)throw new MobileError("VERSION_CONFLICT",409);const target={start:"em_andamento",pause:"pausada",resume:"em_andamento",submit_review:"aguardando_revisao"}[body.action] as Parameters<typeof service.changeStatus>[1];await service.changeStatus(id,target,ctx.userId,null,null,body.expectedVersion);return ok({id,status:target,version:visit.versao+1});}catch(error){return failure(error);}}

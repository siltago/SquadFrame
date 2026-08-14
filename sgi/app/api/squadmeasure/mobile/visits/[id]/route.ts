import { NextRequest } from "next/server";
import * as service from "@/modules/squadmeasure/services";
import { authenticate,failure,ok,requirePermission,requireVisitAccess } from "../../_lib/auth";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){try{const ctx=await authenticate(request);requirePermission(ctx,"squadmeasure.visualizar");const {id}=await params;await requireVisitAccess(ctx,id);const visit=await service.getVisit(id);if(!visit)return failure(new Error("ENTITY_NOT_FOUND"));return ok(visit);}catch(error){return failure(error);}}

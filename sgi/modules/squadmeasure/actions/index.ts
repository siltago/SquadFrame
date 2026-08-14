"use server";
import { revalidatePath } from "next/cache";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { MEASURE_PERMISSIONS } from "../constants";
import { changeVisitStatusSchema, createElementSchema, createEnvironmentSchema, createMeasurementSchema, createObservationSchema, createVisitSchema, duplicateElementSchema, editElementSchema, editEnvironmentSchema, editVisitSchema, reorderElementSchema, reorderEnvironmentSchema, resolveObservationSchema, reviewVisitSchema } from "../schemas";
import * as service from "../services";
import type { ActionResult } from "../types";
import type { ZodType } from "zod";

async function context(permission:string){await verificarPermissao(permission);const user=await getUsuarioAtual();if(!user)throw new Error("Não autenticado.");return user;}
function errorResult(error:unknown):ActionResult { if(error&&typeof error==="object"&&"issues" in error){const z=error as {issues:Array<{path:PropertyKey[];message:string}>};return {ok:false,erro:"Revise os campos informados.",campos:Object.fromEntries(z.issues.map(i=>[String(i.path[0]??"form"),[i.message]]))};} return {ok:false,erro:error instanceof Error?error.message:"Erro inesperado."}; }
async function run<T>(schema:ZodType<T>,raw:unknown,permission:string,handler:(input:T,userId:string)=>Promise<void|string>):Promise<ActionResult<{id?:string}>>{try{const user=await context(permission);const input=schema.parse(raw);const result=await handler(input,user.id);revalidatePath("/squadmeasure");return {ok:true,data:typeof result==="string"?{id:result}:undefined};}catch(e){return errorResult(e);}}

export async function createVisitAction(raw:unknown){return run(createVisitSchema,raw,MEASURE_PERMISSIONS.CREATE_VISIT,async(i,u)=>{const id=await service.createVisit(i,u);revalidatePath("/squadmeasure/visitas");return id;});}
export async function editVisitAction(raw:unknown){return run(editVisitSchema,raw,MEASURE_PERMISSIONS.EDIT_VISIT,async({id,...i},u)=>service.editVisit(id,i,u));}
export async function changeStatusAction(raw:unknown){return run(changeVisitStatusSchema,raw,MEASURE_PERMISSIONS.EDIT_VISIT,async(i,u)=>service.changeStatus(i.id,i.status,u,i.comentario,i.justificativa));}
export async function createEnvironmentAction(raw:unknown){return run(createEnvironmentSchema,raw,MEASURE_PERMISSIONS.ENVIRONMENTS,async(i,u)=>service.addEnvironment(i,u));}
export async function editEnvironmentAction(raw:unknown){return run(editEnvironmentSchema,raw,MEASURE_PERMISSIONS.ENVIRONMENTS,async({id,visita_id,...i},u)=>service.editEnvironment(id,visita_id,i,u));}
export async function reorderEnvironmentsAction(raw:unknown){return run(reorderEnvironmentSchema,raw,MEASURE_PERMISSIONS.ENVIRONMENTS,async(i,u)=>service.reorderEnvironments(i.visita_id,i.ids,u));}
export async function archiveEnvironmentAction(raw:{id:string;visita_id:string;arquivado:boolean}){return run(editEnvironmentSchema.pick({id:true,visita_id:true}).extend({arquivado:resolveObservationSchema.shape.resolvida}),raw,MEASURE_PERMISSIONS.ENVIRONMENTS,async(i,u)=>service.archiveEnvironment(i.id,i.visita_id,i.arquivado,u));}
export async function createElementAction(raw:unknown){return run(createElementSchema,raw,MEASURE_PERMISSIONS.ELEMENTS,async(i,u)=>service.addElement(i,u));}
export async function editElementAction(raw:unknown){return run(editElementSchema,raw,MEASURE_PERMISSIONS.ELEMENTS,async({id,ambiente_id,...i},u)=>service.editElement(id,ambiente_id,i,u));}
export async function reorderElementsAction(raw:unknown){return run(reorderElementSchema,raw,MEASURE_PERMISSIONS.ELEMENTS,async(i,u)=>service.reorderElements(i.ambiente_id,i.ids,u));}
export async function duplicateElementAction(raw:unknown){return run(duplicateElementSchema,raw,MEASURE_PERMISSIONS.ELEMENTS,async(i,u)=>service.duplicateElement(i.id,u));}
export async function createMeasurementAction(raw:unknown){return run(createMeasurementSchema,raw,MEASURE_PERMISSIONS.MEASURE,async(i,u)=>service.addMeasurement(i,u));}
export async function createObservationAction(raw:unknown){return run(createObservationSchema,raw,MEASURE_PERMISSIONS.OBSERVATIONS,async(i,u)=>service.addObservation(i,u));}
export async function resolveObservationAction(raw:unknown){return run(resolveObservationSchema,raw,MEASURE_PERMISSIONS.OBSERVATIONS,async(i,u)=>service.resolveObservation(i.id,i.resolvida,u));}
export async function reviewVisitAction(raw:unknown){return run(reviewVisitSchema,raw,MEASURE_PERMISSIONS.REVIEW,async(i,u)=>service.review(i.id,i.decisao,i.comentario,u));}

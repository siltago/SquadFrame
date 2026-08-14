import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { createAdminClient } from "@/shared/database/supabase-admin";

export type MobileContext = { userId: string; permissions: string[]; isAdmin: boolean };
export class MobileError extends Error { constructor(public code:string,public status:number,public fields?:Record<string,string[]>){super(code);} }

export async function authenticate(request:NextRequest):Promise<MobileContext>{
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!token)throw new MobileError("AUTH_REQUIRED",401);
  const admin=createAdminClient();
  const {data:auth,error}=await admin.auth.getUser(token);
  if(error||!auth.user)throw new MobileError("AUTH_REQUIRED",401);
  const {data:user}=await admin.from("usuarios").select("id,cargo:cargos(id,is_admin)").eq("auth_id",auth.user.id).eq("ativo",true).maybeSingle();
  if(!user)throw new MobileError("USER_NOT_FOUND",403);
  const cargo=user.cargo as unknown as {id:string;is_admin:boolean}|null;
  const {data:rows}=cargo?await admin.from("cargo_permissoes").select("permissao:permissoes(chave)").eq("cargo_id",cargo.id):{data:[]};
  const permissions=cargo?.is_admin?["*"]:(rows??[]).map(r=>(r.permissao as unknown as {chave:string}|null)?.chave).filter((v):v is string=>Boolean(v));
  return {userId:user.id,permissions,isAdmin:Boolean(cargo?.is_admin)};
}
export function requirePermission(ctx:MobileContext,key:string){if(!ctx.permissions.includes("*")&&!ctx.permissions.includes(key))throw new MobileError("PERMISSION_DENIED",403);}
export async function requireVisitAccess(ctx:MobileContext,visitId:string){
  const admin=createAdminClient();const {data:visit}=await admin.from("measure_visitas").select("id,medidor_responsavel_id,status,versao").eq("id",visitId).is("excluido_em",null).maybeSingle();
  if(!visit)throw new MobileError("ENTITY_NOT_FOUND",404);
  if(!ctx.isAdmin&&visit.medidor_responsavel_id!==ctx.userId){const {data:member}=await admin.from("measure_visita_membros").select("visita_id").eq("visita_id",visitId).eq("usuario_id",ctx.userId).maybeSingle();if(!member)throw new MobileError("PERMISSION_DENIED",403);}
  return visit;
}
export async function visitForParent(kind:"environment"|"element",id:string){const admin=createAdminClient();if(kind==="environment"){const {data}=await admin.from("measure_ambientes").select("visita_id").eq("id",id).maybeSingle();if(!data)throw new MobileError("ENTITY_NOT_FOUND",404);return data.visita_id as string;}const {data}=await admin.from("measure_elementos").select("ambiente:measure_ambientes(visita_id)").eq("id",id).maybeSingle();const env=data?.ambiente as unknown as {visita_id:string}|null;if(!env)throw new MobileError("ENTITY_NOT_FOUND",404);return env.visita_id;}
export async function requireVersion(table:"measure_ambientes"|"measure_elementos"|"measure_medidas"|"measure_observacoes",id:string,expected?:number){if(expected===undefined)return;const {data}=await createAdminClient().from(table).select("versao").eq("id",id).maybeSingle();if(!data)throw new MobileError("ENTITY_NOT_FOUND",404);if(data.versao!==expected)throw new MobileError("VERSION_CONFLICT",409);}
export function parse<T>(schema:ZodType<T>,body:unknown):T{try{return schema.parse(body);}catch(error){if(error instanceof ZodError){const fields:Record<string,string[]>={};for(const issue of error.issues){const key=issue.path.join(".")||"form";(fields[key]??=[]).push(issue.message);}throw new MobileError("VALIDATION_ERROR",422,fields);}throw error;}}
export function ok(data:unknown,status=200){return NextResponse.json(data,{status});}
export function failure(error:unknown){if(error instanceof MobileError)return NextResponse.json({code:error.code,fields:error.fields},{status:error.status});const message=error instanceof Error?error.message:"";const code=/estado atual|encerrada/i.test(message)?"ENTITY_LOCKED":/duplicate key|vers[aã]o/i.test(message)?"VERSION_CONFLICT":"DATABASE_ERROR";return NextResponse.json({code},{status:code==="VERSION_CONFLICT"?409:code==="ENTITY_LOCKED"?423:500});}

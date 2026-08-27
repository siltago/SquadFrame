import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/shared/database/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  const admin = createAdminClient();
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  const { data: user } = await admin.from("usuarios").select("id,nome,email,foto_url,empresa,whatsapp,cargo:cargos(id,nome,cor,is_admin,setor:setores(id,nome,cor))").eq("auth_id", auth.user.id).eq("ativo", true).maybeSingle();
  if (!user) return NextResponse.json({ code: "USER_NOT_FOUND" }, { status: 403 });
  const cargo = user.cargo as unknown as { id: string; nome: string; cor: string; is_admin: boolean; setor: { id: string; nome: string; cor: string } | null } | null;
  const { data: rows } = cargo ? await admin.from("cargo_permissoes").select("permissao:permissoes(chave)").eq("cargo_id", cargo.id) : { data: [] };
  const permissions = cargo?.is_admin ? ["*"] : (rows ?? []).map((row) => (row.permissao as unknown as { chave: string } | null)?.chave).filter((key): key is string => Boolean(key));
  if (!permissions.includes("*") && !permissions.includes("squadmeasure.visualizar")) return NextResponse.json({ code: "PERMISSION_DENIED" }, { status: 403 });
  let query = admin.from("measure_visitas").select("id,obra_id,medidor_responsavel_id,status,prioridade,agendada_para,progresso,observacoes_gerais,versao,obra:obras(nome,endereco,cidade,cliente:clientes(nome)),medidor:usuarios!measure_visitas_medidor_responsavel_id_fkey(nome)").is("excluido_em", null).order("agendada_para", { ascending: true });
  if (!cargo?.is_admin) {
    const { data: memberships } = await admin.from("measure_visita_membros").select("visita_id").eq("usuario_id", user.id);
    const ids = (memberships ?? []).map((membership) => membership.visita_id);
    query = ids.length ? query.or(`medidor_responsavel_id.eq.${user.id},id.in.(${ids.join(",")})`) : query.eq("medidor_responsavel_id", user.id);
  }
  const { data: visits, error } = await query;
  if (error) return NextResponse.json({ code: "DATABASE_ERROR" }, { status: 503 });
  const { data: works, error: worksError } = await admin.from("obras").select("id,codigo,nome,endereco,cidade,estado,cliente:clientes(nome,razao_social)").is("deleted_at", null).order("nome");
  if (worksError) return NextResponse.json({ code: "DATABASE_ERROR" }, { status: 503 });
  return NextResponse.json({
    user: { id: user.id, name: user.nome, email: user.email, photoUrl: user.foto_url, company: user.empresa, whatsapp: user.whatsapp, cargo: cargo ? { id: cargo.id, name: cargo.nome, color: cargo.cor, isAdmin: cargo.is_admin } : null, sector: cargo?.setor ? { id: cargo.setor.id, name: cargo.setor.nome, color: cargo.setor.cor } : null }, permissions,
    works: (works ?? []).map((work) => { const client = work.cliente as unknown as { nome:string; razao_social:string|null } | null; return { id:work.id, code:work.codigo, name:work.nome, clientName:client?.nome ?? client?.razao_social ?? null, address:[work.endereco,work.cidade,work.estado].filter(Boolean).join(" · ") || null }; }),
    visits: (visits ?? []).map((visit) => { const work = visit.obra as unknown as { nome: string; endereco: string | null; cidade: string | null; cliente: { nome: string } | null } | null; const responsible = visit.medidor as unknown as { nome: string } | null; return { id: visit.id, workId: visit.obra_id, workName: work?.nome ?? "Obra", clientName: work?.cliente?.nome ?? null, address: [work?.endereco, work?.cidade].filter(Boolean).join(" · ") || null, responsibleName: responsible?.nome ?? null, status: visit.status, priority: visit.prioridade, scheduledAt: visit.agendada_para, progress: visit.progresso, notes: visit.observacoes_gerais, version: visit.versao }; }),
    minimumAppVersion: 1, features: { photos: false, videos: false, sketches: false, ar: false }
  });
}

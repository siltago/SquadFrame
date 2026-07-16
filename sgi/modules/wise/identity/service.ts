import "server-only";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/shared/database/supabase-admin";
import { registrarAuditoria } from "@/modules/wise/audit/service";
import * as repo from "./repository";
import type { WiseSetor, WiseCargo, WiseUsuario } from "./types";

export type ResultadoServico<T> = { ok: true; dados: T } | { ok: false; erro: string };

const CONVITE_VALIDADE_HORAS = 24;

export async function listarSetores(empresaId: string): Promise<WiseSetor[]> {
  return repo.listarSetores(empresaId);
}

export async function criarSetor(dados: {
  empresa_id: string;
  nome: string;
  cor?: string;
  ordem?: number;
}): Promise<ResultadoServico<WiseSetor>> {
  const nome = dados.nome.trim();
  if (!nome) return { ok: false, erro: "Nome do setor é obrigatório" };

  const setor = await repo.inserirSetor({
    empresa_id: dados.empresa_id,
    nome,
    cor: dados.cor ?? "#475569",
    ordem: dados.ordem ?? 0,
  });
  return { ok: true, dados: setor };
}

export async function listarCargos(empresaId: string): Promise<WiseCargo[]> {
  return repo.listarCargos(empresaId);
}

export async function criarCargo(dados: {
  empresa_id: string;
  setor_id?: string | null;
  nome: string;
  nivel?: number;
  cor?: string;
  ordem?: number;
}): Promise<ResultadoServico<WiseCargo>> {
  const nome = dados.nome.trim();
  if (!nome) return { ok: false, erro: "Nome do cargo é obrigatório" };

  const cargo = await repo.inserirCargo({
    empresa_id: dados.empresa_id,
    setor_id: dados.setor_id ?? null,
    nome,
    nivel: dados.nivel ?? 1,
    cor: dados.cor ?? "#475569",
    ordem: dados.ordem ?? 0,
  });
  return { ok: true, dados: cargo };
}

export async function listarUsuarios(empresaId: string): Promise<WiseUsuario[]> {
  return repo.listarUsuarios(empresaId);
}

export async function buscarUsuarioPorAuthId(authId: string): Promise<WiseUsuario | null> {
  return repo.buscarUsuarioPorAuthId(authId);
}

export async function trocarSetorCargo(
  usuarioId: string,
  dados: { setor_id: string | null; cargo_id: string | null },
  atorId: string | null,
): Promise<ResultadoServico<true>> {
  const antes = await repo.buscarUsuarioPorId(usuarioId);
  await repo.atualizarSetorCargoUsuario(usuarioId, dados);

  if (antes) {
    await registrarAuditoria({
      empresa_id: antes.empresa_id,
      usuario_id: atorId,
      entidade: "usuario",
      entidade_id: usuarioId,
      acao: "SETOR_CARGO_ALTERADO",
      dados_antes: { setor_id: antes.setor_id, cargo_id: antes.cargo_id },
      dados_depois: dados,
    });
  }

  return { ok: true, dados: true };
}

// Convite sem e-mail — gera um link com token que o admin copia e envia
// manualmente (decisão confirmada com o usuário). Ver seção 5 do
// documento de arquitetura.
export async function convidarUsuario(dados: {
  empresa_id: string;
  nome: string;
  email: string;
  setor_id?: string | null;
  cargo_id?: string | null;
  convidadoPor: string | null;
}): Promise<ResultadoServico<{ usuario: WiseUsuario; token: string }>> {
  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  if (!nome) return { ok: false, erro: "Nome é obrigatório" };
  if (!email || !email.includes("@")) return { ok: false, erro: "E-mail inválido" };

  const existente = await repo.buscarUsuarioPorEmail(dados.empresa_id, email);
  if (existente) return { ok: false, erro: "Já existe um usuário com esse e-mail nesta empresa" };

  const token = randomBytes(24).toString("base64url");
  const expiraEm = new Date(Date.now() + CONVITE_VALIDADE_HORAS * 60 * 60 * 1000).toISOString();

  const usuario = await repo.inserirConvite({
    empresa_id: dados.empresa_id,
    nome,
    email,
    setor_id: dados.setor_id ?? null,
    cargo_id: dados.cargo_id ?? null,
    convite_token: token,
    convite_expira_em: expiraEm,
  });

  await registrarAuditoria({
    empresa_id: dados.empresa_id,
    usuario_id: dados.convidadoPor,
    entidade: "usuario",
    entidade_id: usuario.id,
    acao: "CONVITE_CRIADO",
    dados_depois: { nome, email },
  });

  return { ok: true, dados: { usuario, token } };
}

export async function buscarConvitePorToken(token: string): Promise<ResultadoServico<WiseUsuario>> {
  const usuario = await repo.buscarUsuarioPorToken(token);
  if (!usuario) return { ok: false, erro: "Convite não encontrado ou já utilizado" };
  if (usuario.status !== "convidado") return { ok: false, erro: "Este convite já foi ativado" };
  if (!usuario.convite_expira_em || new Date(usuario.convite_expira_em) < new Date()) {
    return { ok: false, erro: "Este convite expirou — peça um novo link ao administrador" };
  }
  return { ok: true, dados: usuario };
}

export async function ativarConvite(token: string, senha: string): Promise<ResultadoServico<true>> {
  if (senha.length < 6) return { ok: false, erro: "A senha precisa ter pelo menos 6 caracteres" };

  const convite = await buscarConvitePorToken(token);
  if (!convite.ok) return convite;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: convite.dados.email,
    password: senha,
    email_confirm: true,
  });
  if (error || !data.user) return { ok: false, erro: error?.message ?? "Não foi possível criar o login" };

  await repo.ativarUsuarioConvidado(convite.dados.id, data.user.id);

  await registrarAuditoria({
    empresa_id: convite.dados.empresa_id,
    usuario_id: convite.dados.id,
    entidade: "usuario",
    entidade_id: convite.dados.id,
    acao: "USUARIO_ATIVADO",
  });

  return { ok: true, dados: true };
}

export async function bloquearUsuario(usuarioId: string, atorId: string | null): Promise<ResultadoServico<true>> {
  const antes = await repo.buscarUsuarioPorId(usuarioId);
  if (!antes) return { ok: false, erro: "Usuário não encontrado" };

  await repo.atualizarStatusUsuario(usuarioId, "bloqueado");
  await registrarAuditoria({
    empresa_id: antes.empresa_id,
    usuario_id: atorId,
    entidade: "usuario",
    entidade_id: usuarioId,
    acao: "USUARIO_BLOQUEADO",
    dados_antes: { status: antes.status },
    dados_depois: { status: "bloqueado" },
  });
  return { ok: true, dados: true };
}

export async function desbloquearUsuario(usuarioId: string, atorId: string | null): Promise<ResultadoServico<true>> {
  const antes = await repo.buscarUsuarioPorId(usuarioId);
  if (!antes) return { ok: false, erro: "Usuário não encontrado" };

  await repo.atualizarStatusUsuario(usuarioId, "ativo");
  await registrarAuditoria({
    empresa_id: antes.empresa_id,
    usuario_id: atorId,
    entidade: "usuario",
    entidade_id: usuarioId,
    acao: "USUARIO_DESBLOQUEADO",
    dados_antes: { status: antes.status },
    dados_depois: { status: "ativo" },
  });
  return { ok: true, dados: true };
}

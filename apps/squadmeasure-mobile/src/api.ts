import { env } from './config';
import { saveSession } from './storage';
import {
  AppError,
  Bootstrap,
  FieldPhoto,
  PendingMutation,
  Session,
} from './types';

const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Sua sessão expirou. Entre novamente.',
  USER_NOT_FOUND: 'Usuário não vinculado ao SquadSystem.',
  PERMISSION_DENIED: 'Você não possui permissão para esta ação.',
  ENTITY_NOT_FOUND: 'Registro não encontrado.',
  INVALID_STATUS_TRANSITION: 'Transição de status inválida.',
  ENTITY_LOCKED: 'O estado atual não permite esta alteração.',
  VERSION_CONFLICT: 'O registro foi alterado em outro dispositivo.',
  VALIDATION_ERROR: 'Revise os campos informados.',
  DATABASE_ERROR: 'O servidor não conseguiu salvar a alteração.',
  RLS_DENIED: 'A política de acesso recusou esta ação.',
  UNKNOWN_ERROR: 'Não foi possível concluir a operação.',
};
let sessionRenewal: Promise<Session> | null = null;

async function renewSession(session: Session) {
  if (!sessionRenewal) {
    sessionRenewal = refreshToken(session).finally(() => {
      sessionRenewal = null;
    });
  }
  const renewed = await sessionRenewal;
  Object.assign(session, renewed);
  await saveSession(session);
  return session;
}
async function decode<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = data.code ?? 'UNKNOWN_ERROR';
    throw new AppError(
      code,
      messages[code] ?? messages.UNKNOWN_ERROR,
      data.fields,
    );
  }
  return data as T;
}
export async function login(email: string, password: string): Promise<Session> {
  const response = await fetch(
    `${env.supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: { apikey: env.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
  );
  const data = await decode<{ access_token: string; refresh_token: string }>(
    response,
  );
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}
export async function refreshToken(session: Session): Promise<Session> {
  const response = await fetch(
    `${env.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: { apikey: env.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    },
  );
  const data = await decode<{ access_token: string; refresh_token: string }>(
    response,
  );
  return {
    ...session,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}
async function mobile<T>(
  session: Session,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const isMultipart = init.body instanceof FormData;
  const request = () =>
    fetch(`${env.apiUrl}/api/squadmeasure/mobile/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        ...(!isMultipart ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
  let response = await request();
  if (response.status === 401) {
    await renewSession(session);
    response = await request();
  }
  return decode<T>(response);
}
export function uploadPhoto(session: Session, photo: FieldPhoto) {
  const form = new FormData();
  form.append('id', photo.id);
  form.append('visitId', photo.visitId);
  if (photo.environmentId) form.append('environmentId', photo.environmentId);
  if (photo.elementId) form.append('elementId', photo.elementId);
  form.append('width', String(photo.width));
  form.append('height', String(photo.height));
  form.append('capturedAt', photo.capturedAt);
  form.append('dimensions', JSON.stringify(photo.dimensions));
  form.append('file', {
    uri: photo.localUri,
    type: photo.mimeType,
    name: `${photo.id}.${photo.mimeType.split('/')[1] || 'jpg'}`,
  } as any);
  return mobile<{ id: string; remotePath: string; version: number }>(
    session,
    'photos',
    { method: 'POST', body: form },
  );
}
export const bootstrap = (session: Session) =>
  mobile<Bootstrap>(session, 'bootstrap');
export const visitDetail = (session: Session, id: string) =>
  mobile<Record<string, any>>(session, `visits/${id}`);
export const createVisit = (session: Session, workId: string) =>
  mobile<{ id: string }>(session, 'visits', {
    method: 'POST',
    body: JSON.stringify({ workId, priority: 'normal' }),
  });
export const transitionVisit = (
  session: Session,
  id: string,
  action: string,
  expectedVersion: number,
) =>
  mobile<{ id: string; version: number }>(session, `visits/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ action, expectedVersion }),
  });
export async function sendMutation(session: Session, m: PendingMutation) {
  const path = {
    environment: 'environments',
    element: 'elements',
    measurement: 'measurements',
    observation: 'observations',
  }[m.entityType];
  return mobile<{ id: string; version: number }>(session, path, {
    method: m.operation === 'CREATE' ? 'POST' : 'PATCH',
    body: JSON.stringify(m.payload),
  });
}

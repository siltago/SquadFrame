import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import * as api from './api';
import { configurationErrors } from './config';
import {
  clearSession,
  discardPendingQueueOnce,
  discardCache,
  emptyCache,
  loadCache,
  loadSession,
  saveCache,
  saveSession,
} from './storage';
import {
  AppError,
  Cache,
  Element,
  Environment,
  FieldPhoto,
  Measurement,
  Observation,
  PendingMutation,
  PhotoDimension,
  Session,
  SyncFields,
  SyncState,
  Visit,
} from './types';

type Entity = Environment | Element | Measurement | Observation;
interface State {
  ready: boolean;
  busy: boolean;
  session: Session | null;
  cache: Cache;
  selectedVisitId?: string;
  selectedEnvironmentId?: string;
  selectedElementId?: string;
  online: boolean;
  error?: string;
  configErrors: string[];
  initialise(): Promise<void>;
  login(email: string, password: string): Promise<void>;
  logout(discard?: boolean): Promise<boolean>;
  setOnline(value: boolean): void;
  selectVisit(id?: string): Promise<void>;
  createVisit(workId: string): Promise<void>;
  selectEnvironment(id?: string): void;
  selectElement(id?: string): void;
  saveEnvironment(
    input: Partial<Environment> & { name: string },
  ): Promise<void>;
  saveElement(
    input: Partial<Element> & { name: string; type: string },
  ): Promise<void>;
  duplicateElement(id: string, copyStructure: boolean): Promise<void>;
  saveMeasurement(
    input: Omit<Partial<Measurement>, 'value'> & {
      name: string;
      type: string;
      value: string | number;
      unit: string;
    },
  ): Promise<void>;
  saveObservation(
    input: Partial<Observation> & { text: string; category: string },
  ): Promise<void>;
  savePhoto(photo: FieldPhoto): Promise<void>;
  addPhotoDimension(photoId: string, dimension: PhotoDimension): Promise<void>;
  archive(type: 'environment' | 'element', id: string): Promise<void>;
  restore(type: 'environment' | 'element', id: string): Promise<void>;
  sync(): Promise<void>;
  transition(action: string): Promise<void>;
  clearError(): void;
}

const now = () => new Date().toISOString();
const syncFields = (
  ownerId: string,
  visitId: string,
  existing?: SyncFields,
): SyncFields =>
  existing
    ? {
        ...existing,
        updatedAt: now(),
        syncState: 'PENDING',
        lastErrorCode: null,
        lastErrorMessage: null,
      }
    : {
        id: uuid(),
        ownerId,
        visitId,
        version: 0,
        createdAt: now(),
        updatedAt: now(),
        syncState: 'LOCAL_ONLY',
      };
const upsert = <T extends { id: string }>(rows: T[], row: T) => [
  ...rows.filter(x => x.id !== row.id),
  row,
];
const message = (error: unknown) =>
  error instanceof AppError
    ? error.message
    : error instanceof Error
    ? error.message
    : 'Não foi possível concluir a operação.';
const payloadFor = (type: string, row: any) =>
  type === 'environment'
    ? {
        id: row.id,
        visita_id: row.visitId,
        nome: row.name,
        codigo: row.code,
        pavimento: row.floor,
        descricao: row.description,
        sequencia: row.sequence,
        status: row.status,
        observacoes: row.notes,
        ...(row.version ? { expectedVersion: row.version } : {}),
        ...(row.deletedAt ? { arquivado: true } : {}),
      }
    : type === 'element'
    ? {
        id: row.id,
        ambiente_id: row.environmentId,
        nome: row.name,
        codigo: row.code,
        tipo: row.type,
        quantidade: row.quantity,
        descricao: row.description,
        sequencia: row.sequence,
        status: row.status,
        requer_atencao: row.attention,
        ...(row.version ? { expectedVersion: row.version } : {}),
        ...(row.deletedAt ? { arquivado: true } : {}),
      }
    : type === 'measurement'
    ? {
        id: row.id,
        elemento_id: row.elementId,
        grupo: row.group,
        tipo: row.type,
        nome: row.name,
        posicao: row.position,
        valor: row.value,
        unidade: row.unit,
        tolerancia: row.tolerance,
        estado: row.state,
        observacao: row.note,
        origem: row.origin,
        medida_em: row.measuredAt,
        ...(row.version ? { expectedVersion: row.version } : {}),
      }
    : {
        id: row.id,
        visita_id: row.visitId,
        ambiente_id: row.environmentId,
        elemento_id: row.elementId,
        medida_id: row.measurementId,
        categoria: row.category,
        texto: row.text,
        importante: row.important,
        resolvida: Boolean(row.resolvedAt),
        ...(row.version ? { expectedVersion: row.version } : {}),
      };
const enqueue = (
  cache: Cache,
  type: PendingMutation['entityType'],
  row: Entity,
  operation?: PendingMutation['operation'],
): Cache => {
  const mutation: PendingMutation = {
    id: uuid(),
    ownerId: cache.ownerId,
    visitId: row.visitId,
    entityType: type,
    entityId: row.id,
    operation: operation ?? (row.version ? 'UPDATE' : 'CREATE'),
    payload: payloadFor(type, row),
    expectedVersion: row.version || null,
    status: 'PENDING',
    attemptCount: 0,
    createdAt: now(),
  };
  return { ...cache, mutations: [...cache.mutations, mutation] };
};
const entityKey = (type: PendingMutation['entityType']) =>
  ({
    environment: 'environments',
    element: 'elements',
    measurement: 'measurements',
    observation: 'observations',
  }[type] as keyof Pick<
    Cache,
    'environments' | 'elements' | 'measurements' | 'observations'
  >);
const updateSync = (
  cache: Cache,
  m: PendingMutation,
  state: SyncState,
  version?: number,
  error?: AppError,
): Cache => {
  const key = entityKey(m.entityType);
  const rows = (cache[key] as Entity[]).map(row =>
    row.id === m.entityId
      ? {
          ...row,
          syncState: state,
          version: version ?? row.version,
          lastSyncAt: state === 'SYNCED' ? now() : row.lastSyncAt,
          lastErrorCode: error?.code ?? null,
          lastErrorMessage: error?.message ?? null,
        }
      : row,
  );
  return { ...cache, [key]: rows };
};

export const useMeasureStore = create<State>((set, get) => ({
  ready: false,
  busy: false,
  session: null,
  cache: emptyCache(''),
  online: true,
  configErrors: configurationErrors(),
  initialise: async () => {
    let session = await loadSession();
    if (!session) {
      set({ ready: true });
      return;
    }
    let cache = session.ownerId
      ? await loadCache(session.ownerId)
      : emptyCache('');
    cache = await discardPendingQueueOnce(cache);
    set({ session, cache, ready: true });
    try {
      let boot;
      try {
        boot = await api.bootstrap(session);
      } catch (error) {
        if (!(error instanceof AppError) || error.code !== 'AUTH_REQUIRED')
          throw error;
        session = await api.refreshToken(session);
        boot = await api.bootstrap(session);
      }
      session = { ...session, ownerId: boot.user.id, user: boot.user };
      cache = {
        ...(await loadCache(boot.user.id)),
        works: boot.works,
        visits: boot.visits,
      };
      await saveSession(session);
      await saveCache(cache);
      set({ session, cache });
    } catch (error) {
      set({ error: message(error) });
    }
  },
  login: async (email, password) => {
    set({ busy: true, error: undefined });
    try {
      let session = await api.login(email.trim(), password);
      const boot = await api.bootstrap(session);
      if (
        !boot.permissions.includes('*') &&
        !boot.permissions.includes('squadmeasure.visualizar')
      )
        throw new AppError(
          'PERMISSION_DENIED',
          'Você não possui permissão para acessar o SquadMeasure.',
        );
      session = { ...session, ownerId: boot.user.id, user: boot.user };
      await saveSession(session);
      const previous = await loadCache(boot.user.id);
      const cache = { ...previous, works: boot.works, visits: boot.visits };
      await saveCache(cache);
      set({ session, cache, busy: false });
    } catch (error) {
      set({ busy: false, error: message(error) });
    }
  },
  logout: async (discard = false) => {
    const { cache } = get();
    if (
      (cache.mutations.length ||
        cache.photos.some(photo => photo.syncState !== 'SYNCED')) &&
      !discard
    ) {
      set({
        error:
          'Existem alterações pendentes. Sincronize ou confirme o descarte antes de sair.',
      });
      return false;
    }
    await clearSession();
    if (discard && cache.ownerId) await discardCache(cache.ownerId);
    set({
      session: null,
      cache: emptyCache(''),
      selectedVisitId: undefined,
      selectedEnvironmentId: undefined,
      selectedElementId: undefined,
    });
    return true;
  },
  setOnline: online => {
    set({ online });
    if (online && get().session) get().sync();
  },
  selectVisit: async id => {
    set({
      selectedVisitId: id,
      selectedEnvironmentId: undefined,
      selectedElementId: undefined,
    });
    const session = get().session;
    if (!id || !session) return;
    try {
      const d = await api.visitDetail(session, id);
      const cache = mergeDetail(get().cache, d);
      await saveCache(cache);
      set({ cache });
    } catch (error) {
      set({ error: `Dados locais mantidos. ${message(error)}` });
    }
  },
  createVisit: async workId => {
    const s = get();
    if (!s.session || s.busy) return;
    set({ busy: true, error: undefined });
    try {
      const created = await api.createVisit(s.session, workId);
      const boot = await api.bootstrap(s.session);
      const session = { ...s.session, user: boot.user };
      const work = boot.works.find(item => item.id === workId);
      const provisional: Visit = {
        id: created.id,
        workId,
        workName: work?.name ?? 'Obra',
        clientName: work?.clientName,
        address: work?.address,
        responsibleName: boot.user.name,
        status: 'agendada',
        priority: 'normal',
        progress: 0,
        version: 1,
      };
      const visits = boot.visits.some(item => item.id === created.id)
        ? boot.visits
        : [provisional, ...boot.visits];
      const cache = { ...s.cache, works: boot.works, visits };
      await saveSession(session);
      await saveCache(cache);
      set({ session, cache, busy: false });
      await get().selectVisit(created.id);
    } catch (error) {
      set({ busy: false, error: message(error) });
    }
  },
  savePhoto: async photo => {
    const cache = { ...get().cache, photos: upsert(get().cache.photos, photo) };
    await commit(set, cache);
  },
  addPhotoDimension: async (photoId, dimension) => {
    const cache = {
      ...get().cache,
      photos: get().cache.photos.map(photo =>
        photo.id === photoId
          ? {
              ...photo,
              dimensions: [...photo.dimensions, dimension],
              syncState: 'PENDING' as SyncState,
            }
          : photo,
      ),
    };
    await commit(set, cache);
  },
  selectEnvironment: id =>
    set({ selectedEnvironmentId: id, selectedElementId: undefined }),
  selectElement: id => set({ selectedElementId: id }),
  saveEnvironment: async input => {
    const s = get();
    if (!s.session?.ownerId || !s.selectedVisitId) return;
    const existing = input.id
      ? s.cache.environments.find(x => x.id === input.id)
      : undefined;
    const row: Environment = {
      ...syncFields(s.session.ownerId, s.selectedVisitId, existing),
      name: input.name,
      code: input.code ?? existing?.code,
      floor: input.floor ?? existing?.floor,
      description: input.description ?? existing?.description,
      sequence:
        input.sequence ??
        existing?.sequence ??
        s.cache.environments.filter(x => x.visitId === s.selectedVisitId)
          .length,
      status: input.status ?? existing?.status ?? 'pendente',
      notes: input.notes ?? existing?.notes,
    };
    await commit(
      set,
      enqueue(
        { ...s.cache, environments: upsert(s.cache.environments, row) },
        'environment',
        row,
      ),
    );
  },
  saveElement: async input => {
    const s = get();
    if (!s.session?.ownerId || !s.selectedVisitId || !s.selectedEnvironmentId)
      return;
    const existing = input.id
      ? s.cache.elements.find(x => x.id === input.id)
      : undefined;
    const row: Element = {
      ...syncFields(s.session.ownerId, s.selectedVisitId, existing),
      environmentId: s.selectedEnvironmentId,
      name: input.name,
      type: input.type,
      code: input.code ?? existing?.code,
      quantity: input.quantity ?? existing?.quantity ?? 1,
      description: input.description ?? existing?.description,
      sequence:
        input.sequence ??
        existing?.sequence ??
        s.cache.elements.filter(
          x => x.environmentId === s.selectedEnvironmentId,
        ).length,
      status: input.status ?? existing?.status ?? 'pendente',
      attention: input.attention ?? existing?.attention ?? false,
    };
    await commit(
      set,
      enqueue(
        { ...s.cache, elements: upsert(s.cache.elements, row) },
        'element',
        row,
      ),
    );
  },
  duplicateElement: async (id, copy) => {
    const s = get();
    const source = s.cache.elements.find(x => x.id === id);
    if (!source) return;
    const row = {
      ...source,
      ...syncFields(source.ownerId, source.visitId),
      name: `${source.name} (cópia)`,
      sequence: source.sequence + 1,
    };
    let cache = enqueue(
      { ...s.cache, elements: upsert(s.cache.elements, row) },
      'element',
      row,
    );
    if (copy) {
      for (const m of s.cache.measurements.filter(x => x.elementId === id)) {
        const clone = {
          ...m,
          ...syncFields(m.ownerId, m.visitId),
          elementId: row.id,
          value: 0,
          state: 'provisoria',
        };
        cache = enqueue(
          { ...cache, measurements: upsert(cache.measurements, clone) },
          'measurement',
          clone,
        );
      }
    }
    await commit(set, cache);
  },
  saveMeasurement: async input => {
    const s = get();
    if (!s.session?.ownerId || !s.selectedVisitId || !s.selectedElementId)
      return;
    const raw = String(input.value).trim().replace(',', '.');
    const value = Number(raw);
    if (!Number.isFinite(value) || Math.abs(value) > 999999999) {
      set({ error: 'Informe uma medida válida.' });
      return;
    }
    if (value < 0 && !['nivel', 'prumo'].includes(input.type)) {
      set({ error: 'Valor negativo permitido apenas para nível ou prumo.' });
      return;
    }
    const existing = input.id
      ? s.cache.measurements.find(x => x.id === input.id)
      : undefined;
    const row: Measurement = {
      ...syncFields(s.session.ownerId, s.selectedVisitId, existing),
      elementId: s.selectedElementId,
      name: input.name,
      type: input.type,
      value,
      unit: input.unit,
      group: input.group ?? existing?.group,
      position: input.position ?? existing?.position,
      tolerance: input.tolerance ?? existing?.tolerance,
      state: input.state ?? existing?.state ?? 'provisoria',
      note: input.note ?? existing?.note,
      origin: input.origin ?? existing?.origin ?? 'manual',
      measuredAt: input.measuredAt ?? existing?.measuredAt ?? now(),
    };
    await commit(
      set,
      enqueue(
        { ...s.cache, measurements: upsert(s.cache.measurements, row) },
        'measurement',
        row,
      ),
    );
  },
  saveObservation: async input => {
    const s = get();
    if (!s.session?.ownerId || !s.selectedVisitId) return;
    const existing = input.id
      ? s.cache.observations.find(x => x.id === input.id)
      : undefined;
    const row: Observation = {
      ...syncFields(s.session.ownerId, s.selectedVisitId, existing),
      environmentId: input.environmentId ?? s.selectedEnvironmentId,
      elementId: input.elementId ?? s.selectedElementId,
      measurementId: input.measurementId,
      category: input.category,
      text: input.text,
      important: input.important ?? existing?.important ?? false,
      resolvedAt: input.resolvedAt ?? existing?.resolvedAt,
      responsibleName: existing?.responsibleName,
    };
    await commit(
      set,
      enqueue(
        { ...s.cache, observations: upsert(s.cache.observations, row) },
        'observation',
        row,
        row.resolvedAt
          ? 'RESOLVE'
          : existing?.resolvedAt
          ? 'REOPEN'
          : undefined,
      ),
    );
  },
  archive: async (type, id) => {
    const s = get();
    const key = type === 'environment' ? 'environments' : 'elements';
    const row = (s.cache[key] as (Environment | Element)[]).find(
      x => x.id === id,
    );
    if (!row) return;
    const changed = {
      ...row,
      deletedAt: now(),
      syncState: 'DELETED_PENDING' as SyncState,
      updatedAt: now(),
    };
    await commit(
      set,
      enqueue(
        { ...s.cache, [key]: upsert(s.cache[key] as any[], changed) },
        type,
        changed,
        'ARCHIVE',
      ),
    );
  },
  restore: async (type, id) => {
    const s = get();
    const key = type === 'environment' ? 'environments' : 'elements';
    const row = (s.cache[key] as (Environment | Element)[]).find(
      x => x.id === id,
    );
    if (!row) return;
    const changed = {
      ...row,
      deletedAt: null,
      syncState: 'PENDING' as SyncState,
      updatedAt: now(),
    };
    await commit(
      set,
      enqueue(
        { ...s.cache, [key]: upsert(s.cache[key] as any[], changed) },
        type,
        changed,
        'RESTORE',
      ),
    );
  },
  sync: async () => {
    const s = get();
    if (!s.session || !s.online || s.busy) return;
    set({ busy: true, error: undefined });
    let cache = get().cache;
    for (const mutation of cache.mutations
      .filter(item => item.status === 'PENDING')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      if (!parentReady(cache, mutation)) continue;
      cache = updateSync(cache, mutation, 'SYNCING');
      set({ cache });
      try {
        const result = await api.sendMutation(s.session, mutation);
        cache = updateSync(cache, mutation, 'SYNCED', result.version);
        cache = {
          ...cache,
          mutations: cache.mutations.filter(x => x.id !== mutation.id),
          lastSyncAt: now(),
        };
      } catch (error) {
        const appError =
          error instanceof AppError
            ? error
            : new AppError(
                'NETWORK_ERROR',
                'Não foi possível enviar agora. O dado permanece salvo no aparelho.',
              );
        const state =
          appError.code === 'VERSION_CONFLICT' ? 'CONFLICT' : 'ERROR';
        cache = updateSync(cache, mutation, state, undefined, appError);
        cache = {
          ...cache,
          mutations: cache.mutations.map(x =>
            x.id === mutation.id
              ? {
                  ...x,
                  status: state,
                  attemptCount: x.attemptCount + 1,
                  lastAttemptAt: now(),
                  lastErrorCode: appError.code,
                  lastErrorMessage: appError.message,
                }
              : x,
          ),
        };
        continue;
      }
      await saveCache(cache);
      set({ cache });
    }
    for (const photo of cache.photos.filter(
      item =>
        item.syncState === 'LOCAL_ONLY' ||
        item.syncState === 'PENDING' ||
        item.syncState === 'ERROR',
    )) {
      if (
        photo.elementId &&
        !cache.elements.some(
          element =>
            element.id === photo.elementId && element.syncState === 'SYNCED',
        )
      )
        continue;
      cache = {
        ...cache,
        photos: cache.photos.map(item =>
          item.id === photo.id
            ? { ...item, syncState: 'SYNCING' as SyncState }
            : item,
        ),
      };
      set({ cache });
      try {
        const result = await api.uploadPhoto(s.session, photo);
        cache = {
          ...cache,
          photos: cache.photos.map(item =>
            item.id === photo.id
              ? {
                  ...item,
                  remotePath: result.remotePath,
                  syncState: 'SYNCED' as SyncState,
                  lastSyncAt: now(),
                }
              : item,
          ),
          lastSyncAt: now(),
        };
      } catch (error) {
        const errorMessage = message(error);
        cache = {
          ...cache,
          photos: cache.photos.map(item =>
            item.id === photo.id
              ? {
                  ...item,
                  syncState: 'ERROR' as SyncState,
                  lastErrorCode:
                    error instanceof AppError ? error.code : 'NETWORK_ERROR',
                  lastErrorMessage: errorMessage,
                }
              : item,
          ),
        };
        set({ error: `${errorMessage} A foto permanece salva no aparelho.` });
        break;
      }
      await saveCache(cache);
      set({ cache });
    }
    await saveCache(cache);
    set({ cache, busy: false });
  },
  transition: async action => {
    const s = get();
    const visit = s.cache.visits.find(x => x.id === s.selectedVisitId);
    if (!s.session || !visit) return;
    if (s.cache.mutations.some(x => x.visitId === visit.id)) {
      set({
        error: 'Sincronize as alterações antes de mudar o status da visita.',
      });
      return;
    }
    try {
      const r = await api.transitionVisit(
        s.session,
        visit.id,
        action,
        visit.version,
      );
      const status =
        {
          start: 'em_andamento',
          pause: 'pausada',
          resume: 'em_andamento',
          submit_review: 'aguardando_revisao',
        }[action] ?? visit.status;
      const cache = {
        ...s.cache,
        visits: s.cache.visits.map(x =>
          x.id === visit.id ? { ...x, status, version: r.version } : x,
        ),
      };
      await commit(set, cache);
    } catch (error) {
      set({ error: message(error) });
    }
  },
  clearError: () => set({ error: undefined }),
}));

let automaticSyncTimer: ReturnType<typeof setTimeout> | undefined;
useMeasureStore.subscribe(state => {
  if (!state.online || !state.session || state.busy) return;
  const pendingMutations = state.cache.mutations
    .filter(mutation => mutation.status === 'PENDING')
    .map(mutation => mutation.id)
    .sort();
  const pendingPhotos = state.cache.photos
    .filter(
      photo =>
        photo.syncState === 'LOCAL_ONLY' || photo.syncState === 'PENDING',
    )
    .map(photo => photo.id)
    .sort();
  if (!pendingMutations.length && !pendingPhotos.length) return;
  if (automaticSyncTimer) clearTimeout(automaticSyncTimer);
  automaticSyncTimer = setTimeout(() => {
    automaticSyncTimer = undefined;
    const current = useMeasureStore.getState();
    if (current.online && current.session && !current.busy) current.sync();
  }, 350);
});

async function commit(set: (value: Partial<State>) => void, cache: Cache) {
  await saveCache(cache);
  set({ cache });
}
function parentReady(cache: Cache, m: PendingMutation) {
  if (m.entityType === 'element') {
    const id = m.payload.ambiente_id as string;
    return cache.environments.some(
      x => x.id === id && x.syncState === 'SYNCED',
    );
  }
  if (m.entityType === 'measurement') {
    const id = m.payload.elemento_id as string;
    return cache.elements.some(x => x.id === id && x.syncState === 'SYNCED');
  }
  return true;
}
function mergeDetail(cache: Cache, d: any): Cache {
  const synced = (id: string, visitId: string): SyncFields => ({
    id,
    ownerId: cache.ownerId,
    visitId,
    version: 1,
    createdAt: now(),
    updatedAt: now(),
    syncState: 'SYNCED',
    lastSyncAt: now(),
  });
  const visitId = d.id;
  const environments: Environment[] = (d.ambientes ?? []).map((x: any) => ({
    ...synced(x.id, visitId),
    name: x.nome,
    code: x.codigo,
    floor: x.pavimento,
    description: x.descricao,
    sequence: x.sequencia,
    status: x.status,
    notes: x.observacoes,
    deletedAt: x.arquivado_em,
  }));
  const elements: Element[] = (d.ambientes ?? []).flatMap((a: any) =>
    (a.elementos ?? []).map((x: any) => ({
      ...synced(x.id, visitId),
      environmentId: a.id,
      name: x.nome,
      code: x.codigo,
      type: x.tipo,
      quantity: x.quantidade,
      description: x.descricao,
      sequence: x.sequencia,
      status: x.status,
      attention: x.requer_atencao,
      deletedAt: x.arquivado_em,
    })),
  );
  const measurements: Measurement[] = (d.ambientes ?? []).flatMap((a: any) =>
    (a.elementos ?? []).flatMap((e: any) =>
      (e.medidas ?? []).map((x: any) => ({
        ...synced(x.id, visitId),
        elementId: e.id,
        group: x.grupo,
        type: x.tipo,
        name: x.nome,
        position: x.posicao,
        value: Number(x.valor),
        unit: x.unidade,
        tolerance: x.tolerancia,
        state: x.estado,
        note: x.observacao,
        origin: x.origem,
        measuredAt: x.medida_em,
      })),
    ),
  );
  const observations: Observation[] = (d.observacoes ?? []).map((x: any) => ({
    ...synced(x.id, visitId),
    environmentId: x.ambiente_id,
    elementId: x.elemento_id,
    measurementId: x.medida_id,
    category: x.categoria,
    text: x.texto,
    important: x.importante,
    resolvedAt: x.resolvida_em,
    responsibleName: x.responsavel?.nome,
  }));
  const photos: FieldPhoto[] = (d.fotos ?? [])
    .filter((x: any) => Boolean(x.url))
    .map((x: any) => ({
      id: x.id,
      ownerId: cache.ownerId,
      visitId,
      environmentId: x.ambiente_id ?? undefined,
      elementId: x.elemento_id ?? undefined,
      localUri: x.url,
      remotePath: x.caminho_storage,
      width: x.largura,
      height: x.altura,
      mimeType: x.mime_type,
      fileSize: x.tamanho_bytes ?? undefined,
      capturedAt: x.capturada_em,
      syncState: 'SYNCED',
      dimensions: (x.cotas ?? []).map((dimension: any) => ({
        id: dimension.id,
        kind: dimension.tipo === 'leader' ? 'leader' : 'dimension',
        text: dimension.texto ?? undefined,
        name: dimension.nome,
        value: Number(dimension.valor),
        unit: dimension.unidade,
        x1: Number(dimension.x1),
        y1: Number(dimension.y1),
        x2: Number(dimension.x2),
        y2: Number(dimension.y2),
        color: dimension.cor,
      })),
    }));
  const keep = <T extends SyncFields>(rows: T[]) =>
    rows.filter(x => x.visitId !== visitId || x.syncState !== 'SYNCED');
  return {
    ...cache,
    environments: [...keep(cache.environments), ...environments],
    elements: [...keep(cache.elements), ...elements],
    measurements: [...keep(cache.measurements), ...measurements],
    observations: [...keep(cache.observations), ...observations],
    photos: [
      ...cache.photos.filter(
        photo => photo.visitId !== visitId || photo.syncState !== 'SYNCED',
      ),
      ...photos,
    ],
    lastSyncAt: now(),
  };
}

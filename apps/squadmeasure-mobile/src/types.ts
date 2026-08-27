export type SyncState =
  | 'LOCAL_ONLY'
  | 'PENDING'
  | 'SYNCING'
  | 'SYNCED'
  | 'ERROR'
  | 'CONFLICT'
  | 'DELETED_PENDING';
export type EntityType =
  | 'environment'
  | 'element'
  | 'measurement'
  | 'observation';
export type MutationOperation =
  | 'CREATE'
  | 'UPDATE'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'REORDER'
  | 'RESOLVE'
  | 'REOPEN'
  | 'STATUS_CHANGE';

export interface Visit {
  id: string;
  workId: string;
  workName: string;
  clientName?: string | null;
  address?: string | null;
  responsibleName?: string | null;
  status: string;
  priority: string;
  scheduledAt?: string | null;
  progress: number;
  notes?: string | null;
  version: number;
}
export interface Work {
  id: string;
  code: string;
  name: string;
  clientName?: string | null;
  address?: string | null;
}
export interface SyncFields {
  id: string;
  ownerId: string;
  visitId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncState: SyncState;
  lastSyncAt?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
}
export interface Environment extends SyncFields {
  name: string;
  code?: string | null;
  floor?: string | null;
  description?: string | null;
  sequence: number;
  status: string;
  notes?: string | null;
}
export interface Element extends SyncFields {
  environmentId: string;
  name: string;
  code?: string | null;
  type: string;
  quantity: number;
  description?: string | null;
  sequence: number;
  status: string;
  attention: boolean;
}
export interface Measurement extends SyncFields {
  elementId: string;
  group?: string | null;
  type: string;
  name: string;
  position?: string | null;
  value: number;
  unit: string;
  tolerance?: number | null;
  state: string;
  note?: string | null;
  origin: 'manual' | 'importada';
  measuredAt: string;
}
export interface Observation extends SyncFields {
  environmentId?: string | null;
  elementId?: string | null;
  measurementId?: string | null;
  category: string;
  text: string;
  important: boolean;
  resolvedAt?: string | null;
  responsibleName?: string | null;
}
export interface PhotoDimension {
  id: string;
  kind?: 'dimension' | 'leader';
  text?: string;
  name: string;
  value: number;
  unit: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}
export interface FieldPhoto {
  id: string;
  ownerId: string;
  visitId: string;
  environmentId?: string;
  elementId?: string;
  localUri: string;
  remotePath?: string | null;
  width: number;
  height: number;
  mimeType: string;
  fileSize?: number;
  capturedAt: string;
  syncState: SyncState;
  dimensions: PhotoDimension[];
}
export interface PendingMutation {
  id: string;
  ownerId: string;
  visitId: string;
  entityType: EntityType;
  entityId: string;
  operation: MutationOperation;
  payload: Record<string, unknown>;
  expectedVersion?: number | null;
  status: 'PENDING' | 'SYNCING' | 'ERROR' | 'CONFLICT';
  attemptCount: number;
  createdAt: string;
  lastAttemptAt?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
}
export interface Cache {
  ownerId: string;
  works: Work[];
  visits: Visit[];
  environments: Environment[];
  elements: Element[];
  measurements: Measurement[];
  observations: Observation[];
  photos: FieldPhoto[];
  mutations: PendingMutation[];
  lastSyncAt?: string | null;
}
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  company?: string | null;
  whatsapp?: string | null;
  cargo?: { id: string; name: string; color: string; isAdmin: boolean } | null;
  sector?: { id: string; name: string; color: string } | null;
}
export interface Session {
  accessToken: string;
  refreshToken: string;
  ownerId?: string;
  user?: UserProfile;
}
export interface Bootstrap {
  user: UserProfile;
  permissions: string[];
  works: Work[];
  visits: Visit[];
  minimumAppVersion: number;
  features: Record<string, boolean>;
}
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

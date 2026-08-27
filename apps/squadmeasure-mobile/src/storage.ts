import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { Cache, Session } from './types';

const SERVICE = 'com.squadsystem.squadmeasure.session';
const QUEUE_RESET_KEY = '@squadmeasure/queue-reset/20260814-2';
const cacheKey = (ownerId: string) => `@squadmeasure/cache/${ownerId}`;
export const emptyCache = (ownerId: string): Cache => ({
  ownerId,
  works: [],
  visits: [],
  environments: [],
  elements: [],
  measurements: [],
  observations: [],
  photos: [],
  mutations: [],
});
export async function loadSession(): Promise<Session | null> {
  const value = await Keychain.getGenericPassword({ service: SERVICE });
  if (!value) return null;
  try {
    return JSON.parse(value.password) as Session;
  } catch {
    return null;
  }
}
export async function saveSession(session: Session) {
  await Keychain.setGenericPassword('session', JSON.stringify(session), {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
export async function clearSession() {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
export async function loadCache(ownerId: string): Promise<Cache> {
  const raw = await AsyncStorage.getItem(cacheKey(ownerId));
  if (!raw) return emptyCache(ownerId);
  try {
    return { ...emptyCache(ownerId), ...JSON.parse(raw), ownerId };
  } catch {
    return emptyCache(ownerId);
  }
}
export async function saveCache(cache: Cache) {
  await AsyncStorage.setItem(cacheKey(cache.ownerId), JSON.stringify(cache));
}
export async function discardPendingQueueOnce(cache: Cache): Promise<Cache> {
  if (!cache.ownerId || (await AsyncStorage.getItem(QUEUE_RESET_KEY)))
    return cache;
  const synced = <T extends { syncState: string }>(rows: T[]) =>
    rows.filter(row => row.syncState === 'SYNCED');
  const cleaned: Cache = {
    ...cache,
    environments: synced(cache.environments),
    elements: synced(cache.elements),
    measurements: synced(cache.measurements),
    observations: synced(cache.observations),
    photos: synced(cache.photos),
    mutations: [],
  };
  await saveCache(cleaned);
  await AsyncStorage.setItem(QUEUE_RESET_KEY, new Date().toISOString());
  return cleaned;
}
export async function discardCache(ownerId: string) {
  await AsyncStorage.removeItem(cacheKey(ownerId));
}

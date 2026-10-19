import { SavedMatchRecord } from '../types/sports';

const STORAGE_KEY = 'marcador_bt_saved_matches';

export function getSavedMatches(): SavedMatchRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMatchRecord(record: SavedMatchRecord) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedMatches();
    const updated = [record, ...existing.slice(0, 49)]; // keep latest 50 matches
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function deleteMatchRecord(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedMatches();
    const filtered = existing.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

export function clearAllMatches() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

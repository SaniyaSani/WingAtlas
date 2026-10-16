/*
 * localStorage helpers that never throw. Browser storage can be unavailable
 * (private windows, blocked site data, quota exceeded); EntoWing must keep
 * working without it.
 */

export const STORAGE_KEYS = {
  theme: "entowing-visual-theme-v1",
  customTemplates: "entowing-custom-templates-v1",
  compareSession: "entowing-compare-session-v1",
  atlasSelection: "entowing-atlas-selection-v1",
  mapperAutosave: "entowing-mapper-autosave-v1",
} as const;

export function readStoredJson<T = unknown>(key: string): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Returns false when the value could not be stored (e.g. quota exceeded). */
export function writeStoredJson(key: string, value: unknown): boolean {
  try {
    if (typeof window === "undefined") return false;
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readStoredString(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredString(key: string, value: string): boolean {
  try {
    if (typeof window === "undefined") return false;
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key: string) {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

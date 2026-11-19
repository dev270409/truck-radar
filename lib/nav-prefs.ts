export const SIDEBAR_PREFS_KEY = "truck-radar:sidebar-hidden";
export const SIDEBAR_PREFS_EVENT = "truck-radar:sidebar-prefs";

export function readHiddenSidebarItems(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SIDEBAR_PREFS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function writeHiddenSidebarItems(items: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify(Array.from(new Set(items))));
  window.dispatchEvent(new Event(SIDEBAR_PREFS_EVENT));
}

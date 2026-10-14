/**
 * OFFLINE + UPDATES. Registers the service worker (public/sw.js) so the game launches from the Home Screen
 * with no signal, and checks version.json (written by the build) to notice when a newer build is live, so
 * the title screen and pause menu can offer a reload. Everything here fails quietly: no service workers
 * (old Safari, private mode), no network, or a local dev server just means no offline cache or no prompt.
 */
let updateReady = false;
const listeners = new Set<() => void>();

/** Build id this page is running (matches version.json's "version"). */
const RUNNING = __APP_VERSION__;

export function registerOffline(): void {
  const params = new URLSearchParams(location.search);
  // Automated test browsers skip it (so tests always see the newest files) unless a test asks for it with ?sw
  if (!('serviceWorker' in navigator) || (navigator.webdriver && !params.has('sw'))) return;
  navigator.serviceWorker.register(`./sw.js?v=${encodeURIComponent(RUNNING)}`, { scope: './' }).catch(() => undefined);
}

/**
 * Hands the service worker every file this page has loaded so far, so the next launch works offline even
 * if this is the first visit (those files came in before the worker was running). Called once the game
 * has booted (title screen); files already cached are skipped.
 */
export function offerFilesToCache(): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistration().then((reg) => {
    const urls = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin));
    reg?.active?.postMessage({ type: 'cache', urls: [location.href.split('?')[0], ...urls] });
  }).catch(() => undefined);
}

/** Asks the server which build is live. Resolves true (and tells listeners) if it's newer than this one. */
export async function checkForUpdate(): Promise<boolean> {
  if (updateReady) return true;
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return false;
    const { version } = (await res.json()) as { version?: string };
    if (typeof version === 'string' && version !== RUNNING) {
      updateReady = true;
      for (const fn of listeners) fn();
    }
  } catch {
    // Offline or no version file: nothing to say
  }
  return updateReady;
}

export function isUpdateReady(): boolean {
  return updateReady;
}

/** Calls `fn` once an update is found (right away if one already was). Returns an unsubscribe. */
export function onUpdateReady(fn: () => void): () => void {
  listeners.add(fn);
  if (updateReady) fn();
  return () => listeners.delete(fn);
}

/** Reloads into the new build. */
export function applyUpdate(): void {
  location.reload();
}

/** Checks now, and again whenever the app comes back to the foreground. */
export function watchForUpdates(): void {
  void checkForUpdate();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  });
}

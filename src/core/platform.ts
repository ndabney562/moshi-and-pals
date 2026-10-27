/** Capability checks shared by the browser game and the bundled iOS host. */
interface NativeWindow {
  location: Pick<Location, 'search' | 'protocol'>;
  webkit?: { messageHandlers?: { moshi?: { postMessage?: (message: unknown) => void } } };
}

export function hasNativeHost(host: NativeWindow | undefined = typeof window === 'undefined' ? undefined : window): boolean {
  return !!host && new URLSearchParams(host.location.search).has('native')
    && typeof host.webkit?.messageHandlers?.moshi?.postMessage === 'function';
}

export function postNativeMessage(message: unknown): boolean {
  try {
    const handler = (window as unknown as NativeWindow).webkit?.messageHandlers?.moshi;
    if (typeof handler?.postMessage !== 'function') return false;
    handler.postMessage(message);
    return true;
  } catch { return false; }
}

/** Custom app schemes have their own offline bundle and must never register a service worker. */
export function supportsWebUpdates(): boolean {
  return typeof location !== 'undefined' && ['http:', 'https:'].includes(location.protocol) && !hasNativeHost();
}

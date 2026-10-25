export const CHUNK_RELOAD_KEY = "qlh.chunk-reload-attempted";

const CHUNK_ERROR = /failed to fetch dynamically imported module|failed to load module script|loading chunk .* failed|unable to preload css/i;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return CHUNK_ERROR.test(message);
}

export function clearChunkReloadAttempt(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(CHUNK_RELOAD_KEY);
}

export async function reloadForChunkLoadError(
  error: unknown,
  options: {
    storage: Pick<Storage, "getItem" | "setItem">;
    updateServiceWorker: () => Promise<void>;
    reload: () => void;
    wait?: (milliseconds: number) => Promise<void>;
  },
): Promise<boolean> {
  if (!isChunkLoadError(error) || options.storage.getItem(CHUNK_RELOAD_KEY)) return false;

  options.storage.setItem(CHUNK_RELOAD_KEY, "1");
  const wait = options.wait ?? ((milliseconds) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds)));
  await Promise.race([options.updateServiceWorker().catch(() => undefined), wait(2500)]);
  options.reload();
  return true;
}

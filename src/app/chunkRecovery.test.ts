import { describe, expect, it, vi } from "vitest";
import { CHUNK_RELOAD_KEY, clearChunkReloadAttempt, reloadForChunkLoadError } from "./chunkRecovery";

describe("recovery from stale lazy chunks", () => {
  it("updates the service worker before reloading once for a module fetch failure", async () => {
    const storage = window.sessionStorage;
    storage.removeItem(CHUNK_RELOAD_KEY);
    const updateServiceWorker = vi.fn(async () => undefined);
    const reload = vi.fn();
    const error = new TypeError("Failed to fetch dynamically imported module");

    await expect(reloadForChunkLoadError(error, { storage, updateServiceWorker, reload, wait: async () => undefined })).resolves.toBe(true);
    await expect(reloadForChunkLoadError(error, { storage, updateServiceWorker, reload, wait: async () => undefined })).resolves.toBe(false);

    expect(updateServiceWorker).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
    expect(storage.getItem(CHUNK_RELOAD_KEY)).toBe("1");
    clearChunkReloadAttempt(storage);
  });

  it("does not retry unrelated route errors and clears the guard after a successful app load", async () => {
    const storage = window.sessionStorage;
    storage.setItem(CHUNK_RELOAD_KEY, "1");
    const reload = vi.fn();
    const updateServiceWorker = vi.fn(async () => undefined);

    await expect(reloadForChunkLoadError(new Error("bad route data"), { storage, updateServiceWorker, reload, wait: async () => undefined })).resolves.toBe(false);
    clearChunkReloadAttempt(storage);

    expect(reload).not.toHaveBeenCalled();
    expect(updateServiceWorker).not.toHaveBeenCalled();
    expect(storage.getItem(CHUNK_RELOAD_KEY)).toBeNull();
  });
});

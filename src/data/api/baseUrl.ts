const STAGING_API_BASE = "https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1";
const DEV_API_BASE = "https://qlh-dev-api.tolaphamnhuphong.workers.dev/v1";
export const DEFAULT_API_BASE = import.meta.env.MODE === "dev" ? DEV_API_BASE : STAGING_API_BASE;

export function resolveApiBase(configuredBase?: string): string {
  return configuredBase?.trim() || DEFAULT_API_BASE;
}

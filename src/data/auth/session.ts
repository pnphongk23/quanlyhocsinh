import type { MeResponse } from "../api/types";
import { ApiError } from "../api/client";
import { getCacheIdentity, identityKey } from "../db";
import { hydrateStore, setCacheIdentity } from "../store";
import { api, clearMembershipCache, syncNow } from "../sync";

const KEY = "qlh.session.v1";
const LEGACY_KEY = KEY;
export interface WebSession { token: string; user: MeResponse["user"]; me: MeResponse; activeMembershipId: string | null; guardianAccount?: boolean; }
const listeners = new Set<() => void>();
const ME_CHECK_INTERVAL = 60_000;
/** Bumped on login, logout, role change and refresh so a late /me response can never overwrite a newer choice. */
let generation = 0;

function read(): WebSession | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY) ?? (typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(LEGACY_KEY));
    if (!raw) return null;
    const value = JSON.parse(raw) as WebSession;
    localStorage.setItem(KEY, JSON.stringify(value));
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(LEGACY_KEY);
    return value;
  } catch { return null; }
}

let session: WebSession | null = read();
function persist(): void {
  if (typeof localStorage !== "undefined") session ? localStorage.setItem(KEY, JSON.stringify(session)) : localStorage.removeItem(KEY);
  listeners.forEach((fn) => fn());
}
export const getSession = (): WebSession | null => session;
export const getToken = (): string | null => session?.token ?? null;
export function subscribeSession(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }
export async function activateSession(token: string, user: WebSession["user"], me: MeResponse, activeMembershipId: string | null, guardianAccount = false): Promise<void> {
  generation++;
  session = { token, user, me, activeMembershipId, guardianAccount: guardianAccount || me.memberships.length === 0 }; persist(); await activateMembershipCache(activeMembershipId);
}
export async function updateMe(me: MeResponse): Promise<void> {
  if (!session) return;
  generation++;
  const active = me.memberships.find((membership) => membership.id === me.active_membership_id && membership.status === "active");
  session = { ...session, me: { ...me, active_membership_id: active?.id ?? null }, user: me.user, activeMembershipId: active?.id ?? null, guardianAccount: me.memberships.length === 0 || session.guardianAccount };
  persist(); await activateMembershipCache(active?.id ?? null);
}
export async function activateMembershipCache(membershipId: string | null): Promise<void> {
  const membership = session?.me.memberships.find((m) => m.id === membershipId && m.status === "active");
  if (!session || !membership) { setCacheIdentity(null); await hydrateStore(); return; }
  const next = { userId: session.user.id, workspaceId: membership.workspace.id, membershipId: membership.id };
  if (identityKey(next) === identityKey(getCacheIdentity())) return;
  setCacheIdentity(next);
  await hydrateStore(); void syncNow();
}
export async function clearSession(): Promise<void> {
  generation++;
  session = null; persist(); setCacheIdentity(null); await hydrateStore();
}
export function setActiveMembershipId(membershipId: string): void { if (!session) return; generation++; session = { ...session, activeMembershipId: membershipId, me: { ...session.me, active_membership_id: membershipId } }; persist(); }

export async function invalidateActiveMembership(): Promise<void> {
  if (!session) return;
  const previous = session;
  const mine = ++generation;
  session = { ...session, activeMembershipId: null, me: { ...session.me, active_membership_id: null } };
  persist();
  setCacheIdentity(null);
  await hydrateStore();
  try {
    const me = await api.request("GET /me");
    if (!session || mine !== generation || session.user.id !== previous.user.id || session.token !== previous.token) return;
    if (me.memberships.length === 0) { await clearSession(); return; }
    const active = me.memberships.find((membership) => membership.id === me.active_membership_id && membership.status === "active");
    session = { ...session, me: { ...me, active_membership_id: active?.id ?? null }, user: me.user, activeMembershipId: active?.id ?? null };
    persist();
    if (!active) return;
    setCacheIdentity({ userId: session.user.id, workspaceId: active.workspace.id, membershipId: active.id });
    await hydrateStore();
  } catch (error) {
    if (mine === generation && error instanceof ApiError && error.status === 401) await clearSession();
  }
}

let meCheck: Promise<void> | null = null;
let meCheckedAt = 0;
/** Confirms the stored session with GET /me without blocking anyone; at most one check at a time, one per minute. */
export function checkSessionInBackground(): Promise<void> {
  if (meCheck) return meCheck;
  if (!session || Date.now() - meCheckedAt < ME_CHECK_INTERVAL) return Promise.resolve();
  meCheckedAt = Date.now();
  meCheck = confirmSession().catch(() => undefined).finally(() => { meCheck = null; });
  return meCheck;
}
async function confirmSession(): Promise<void> {
  const mine = generation;
  const stale = () => mine !== generation || !session;
  try {
    const me = await api.request("GET /me");
    if (stale()) return;
    const current = session!;
    const previousId = current.activeMembershipId;
    const previousMembership = current.me.memberships.find((membership) => membership.id === previousId);
    const active = me.memberships.find((membership) => membership.id === me.active_membership_id && membership.status === "active");
    if (previousId && active?.id !== previousId && previousMembership) {
      await clearMembershipCache(`${current.user.id}:${previousMembership.workspace.id}:${previousId}`);
      if (stale()) return;
    }
    session = { ...current, me: { ...me, active_membership_id: active?.id ?? null }, user: me.user, activeMembershipId: active?.id ?? null, guardianAccount: me.memberships.length === 0 || current.guardianAccount };
    persist();
    await activateMembershipCache(active?.id ?? null);
  } catch (error) {
    if (stale()) return;
    if (error instanceof ApiError && (error.status === 401 || (error.status === 403 && error.error.code === "account_disabled"))) { await clearSession(); return; }
    if (error instanceof ApiError && (error.status === 403 || error.status === 404) && session!.activeMembershipId) {
      const previousId = session!.activeMembershipId;
      const previous = session!.me.memberships.find((membership) => membership.id === previousId);
      if (previous) await clearMembershipCache(`${session!.user.id}:${previous.workspace.id}:${previousId}`);
      await invalidateActiveMembership();
    }
    // A network, timeout, or server error keeps the last known session for offline use.
  }
}
/** Paints from the stored session and local cache at once; /me runs in the background. */
export async function initializeSession(): Promise<void> {
  if (!session) return;
  await activateMembershipCache(session.activeMembershipId);
  void checkSessionInBackground();
}
if (typeof window !== "undefined") {
  const onForeground = () => { if (document.visibilityState === "visible") void checkSessionInBackground(); };
  window.addEventListener("focus", onForeground);
  window.addEventListener("pageshow", onForeground);
  document.addEventListener("visibilitychange", onForeground);
}

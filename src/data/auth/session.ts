import type { MeResponse } from "../api/types";
import { ApiError } from "../api/client";
import { hydrateStore, setCacheIdentity } from "../store";
import { api, clearMembershipCache, syncNow } from "../sync";

const KEY = "qlh.session.v1";
const LEGACY_KEY = KEY;
export interface WebSession { token: string; user: MeResponse["user"]; me: MeResponse; activeMembershipId: string | null; guardianAccount?: boolean; }
const listeners = new Set<() => void>();

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
  session = { token, user, me, activeMembershipId, guardianAccount: guardianAccount || me.memberships.length === 0 }; persist(); await activateMembershipCache(activeMembershipId);
}
export async function updateMe(me: MeResponse): Promise<void> {
  if (!session) return;
  const active = me.memberships.find((membership) => membership.id === me.active_membership_id && membership.status === "active");
  session = { ...session, me: { ...me, active_membership_id: active?.id ?? null }, user: me.user, activeMembershipId: active?.id ?? null, guardianAccount: me.memberships.length === 0 || session.guardianAccount };
  persist(); await activateMembershipCache(active?.id ?? null);
}
export async function activateMembershipCache(membershipId: string | null): Promise<void> {
  const membership = session?.me.memberships.find((m) => m.id === membershipId && m.status === "active");
  if (!session || !membership) { setCacheIdentity(null); await hydrateStore(); return; }
  setCacheIdentity({ userId: session.user.id, workspaceId: membership.workspace.id, membershipId: membership.id });
  await hydrateStore(); void syncNow();
}
export async function clearSession(): Promise<void> {
  session = null; persist(); setCacheIdentity(null); await hydrateStore();
}
export function setActiveMembershipId(membershipId: string): void { if (!session) return; session = { ...session, activeMembershipId: membershipId, me: { ...session.me, active_membership_id: membershipId } }; persist(); }

export async function invalidateActiveMembership(): Promise<void> {
  if (!session) return;
  const previous = session;
  session = { ...session, activeMembershipId: null, me: { ...session.me, active_membership_id: null } };
  persist();
  setCacheIdentity(null);
  await hydrateStore();
  try {
    const me = await api.request("GET /me");
    if (!session || session.user.id !== previous.user.id || session.token !== previous.token) return;
    if (me.memberships.length === 0) { await clearSession(); return; }
    const active = me.memberships.find((membership) => membership.id === me.active_membership_id && membership.status === "active");
    session = { ...session, me: { ...me, active_membership_id: active?.id ?? null }, user: me.user, activeMembershipId: active?.id ?? null };
    persist();
    if (!active) return;
    setCacheIdentity({ userId: session.user.id, workspaceId: active.workspace.id, membershipId: active.id });
    await hydrateStore();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) await clearSession();
  }
}

let initialization: Promise<void> | null = null;
export function initializeSession(): Promise<void> {
  if (initialization) return initialization;
  initialization = (async () => {
    if (!session) return;
    try {
      const me = await api.request("GET /me");
      const previousId = session.activeMembershipId;
      const previousMembership = session.me.memberships.find((membership) => membership.id === previousId);
      const active = me.memberships.find((membership) => membership.id === me.active_membership_id && membership.status === "active");
        if (previousId && (!active || active.id !== previousId) && previousMembership) {
          await clearMembershipCache(`${session.user.id}:${previousMembership.workspace.id}:${previousId}`);
        }
        session = { ...session, me: { ...me, active_membership_id: active?.id ?? null }, user: me.user, activeMembershipId: active?.id ?? null, guardianAccount: me.memberships.length === 0 || session.guardianAccount };
      persist();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearSession();
        return;
      }
        if (error instanceof ApiError && error.status === 403 && error.error.code === "account_disabled") {
          await clearSession();
          return;
        }
        if (error instanceof ApiError && (error.status === 403 || error.status === 404) && session.activeMembershipId) {
        const previousId = session.activeMembershipId;
        const previous = session.me.memberships.find((membership) => membership.id === previousId);
        if (previous) {
          await clearMembershipCache(`${session.user.id}:${previous.workspace.id}:${previousId}`);
        }
        await invalidateActiveMembership();
        return;
      }
      // A network, timeout, or server error keeps the last known session for offline use.
    }
    await activateMembershipCache(session?.activeMembershipId ?? null);
  })().finally(() => { initialization = null; });
  return initialization;
}

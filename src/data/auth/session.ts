import type { MeResponse } from "../api/types";
import { hydrateStore, setCacheIdentity } from "../store";
import { syncNow } from "../sync";
const KEY = "qlh.session.v1";
export interface WebSession { token: string; user: MeResponse["user"]; me: MeResponse; activeMembershipId: string | null; }
let session: WebSession | null = read();
const listeners = new Set<() => void>();
function read(): WebSession | null {
  if (typeof sessionStorage === "undefined") return null;
  try { const raw = sessionStorage.getItem(KEY); return raw ? JSON.parse(raw) as WebSession : null; } catch { return null; }
}
function persist(): void { if (typeof sessionStorage !== "undefined") session ? sessionStorage.setItem(KEY, JSON.stringify(session)) : sessionStorage.removeItem(KEY); listeners.forEach((fn) => fn()); }
export const getSession = (): WebSession | null => session;
export const getToken = (): string | null => session?.token ?? null;
export function subscribeSession(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }
export async function activateSession(token: string, user: WebSession["user"], me: MeResponse, activeMembershipId: string | null): Promise<void> {
  session = { token, user, me, activeMembershipId }; persist(); await activateMembershipCache(activeMembershipId);
}
export async function updateMe(me: MeResponse): Promise<void> { if (!session) return; session = { ...session, me, user: me.user, activeMembershipId: me.active_membership_id }; persist(); await activateMembershipCache(me.active_membership_id); }
export async function activateMembershipCache(membershipId: string | null): Promise<void> {
  const membership = session?.me.memberships.find((m) => m.id === membershipId && m.status === "active");
  if (!session || !membership) { setCacheIdentity(null); await hydrateStore(); return; }
  setCacheIdentity({ userId: session.user.id, workspaceId: membership.workspace.id, membershipId: membership.id });
  await hydrateStore(); void syncNow();
}
export async function clearSession(): Promise<void> { session = null; persist(); setCacheIdentity(null); await hydrateStore(); }
export function setActiveMembershipId(membershipId: string): void { if (!session) return; session = { ...session, activeMembershipId: membershipId, me: { ...session.me, active_membership_id: membershipId } }; persist(); }

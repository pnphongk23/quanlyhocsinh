import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import Dexie from "dexie";
import { vi } from "vitest";
import type { MeResponse } from "../../data/api/types";
import { createFakeServer } from "./fake-sync-server";

type Server = ReturnType<typeof createFakeServer>;
export const staffMembership = (id = "m-staff", workspaceId = "ws-1"): MeResponse["memberships"][number] => ({
  id, status: "active", scope_epoch: 1, workspace: { id: workspaceId, name: workspaceId },
  role: { id: `role-${id}`, name: id, system_key: null, scope_kind: "workspace" }, permissions: {} as never,
});
export const guardianMembership = (id: string, workspaceId = "ws-1"): MeResponse["memberships"][number] => ({
  ...staffMembership(id, workspaceId), role: { id: `role-${id}`, name: "Phụ huynh", system_key: null, scope_kind: "linked_students" },
});
export const meFor = (userId: string, memberships: MeResponse["memberships"], active: string | null = memberships[0]?.id ?? null): MeResponse =>
  ({ user: { id: userId, phone: "", display_name: userId, must_change_password: false }, active_membership_id: active, memberships });

/** Loads a fresh copy of the data layer with its own IndexedDB, as a separate browser profile would. */
export async function bootDevice(server: Server, token: string, me: MeResponse) {
  vi.resetModules();
  Dexie.dependencies.indexedDB = new IDBFactory();
  vi.stubGlobal("fetch", server.fetch);
  localStorage.setItem("qlh.session.v1", JSON.stringify({ token, user: me.user, me, activeMembershipId: me.active_membership_id }));
  const [dbModule, sync, session, store] = await Promise.all([import("../../data/db"), import("../../data/sync"), import("../../data/auth/session"), import("../../data/store")]);
  const active = me.memberships.find((m) => m.id === me.active_membership_id && m.status === "active");
  const identity = active ? `${me.user.id}:${active.workspace.id}:${active.id}` : "anonymous";
  dbModule.setCacheIdentity(active ? { userId: me.user.id, workspaceId: active.workspace.id, membershipId: active.id } : null);
  return { ...dbModule, ...sync, ...session, ...store, identity };
}
export const flush = () => vi.waitFor(() => undefined);

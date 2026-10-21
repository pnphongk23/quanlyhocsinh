import { useSyncExternalStore } from "react";
import type { StoreState } from "./types";
/** Empty read facade for copied screens. Phase B hydrates it from scoped IndexedDB. */
const state: StoreState = {
  classes: [], students: [], sessions: [], attendance: [], tests: [], scores: [],
  comments: [], homeworkSections: [], homeworkGrades: [], reports: [],
  changeLogs: [], pending: [], auth: null, currentClassId: null, roles: [], members: [], activeMemberId: null,
};
Object.values(state).forEach((value) => { if (Array.isArray(value)) Object.freeze(value); });
Object.freeze(state);
export const getStore = (): StoreState => state;
export function subscribe(_listener: () => void): () => void { return () => {}; }
export const useStore = (): StoreState => useSyncExternalStore(subscribe, getStore, getStore);

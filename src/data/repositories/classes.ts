/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "../foundation";
import type { Class } from "../types";

export const listClasses: () => Class[] = () => [];

export const getClass: (id: string) => Class | undefined = () => undefined;

export const hasClass: (id: string) => boolean = () => false;

export function createClass(input: Omit<Class, "id" | "status">): Class { return foundationUnavailable(); }

export function updateClass(id: string, patch: Partial<Pick<Class, "name" | "weekdays" | "time">>): void { return foundationUnavailable(); }

export function archiveClass(id: string): void { return foundationUnavailable(); }

export const getCurrentClassId: () => string | null = () => null;

export function setCurrentClass(id: string): void { return foundationUnavailable(); }

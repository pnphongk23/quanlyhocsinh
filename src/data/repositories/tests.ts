/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "../foundation";
import type { Test } from "../types";

export const DEFAULT_TEST_MAX = 15;

export const TEST_MAX_MIN = 1;

export const TEST_MAX_MAX = 1000;

export function validateTestMax(max: number): number { return 0; }

export const listTests: (classId: string) => Test[] = () => [];

export type TestInput = Omit<Test, "id" | "max" | "archived"> & {
    max?: number;
};

export function createTest(input: TestInput): Test { return foundationUnavailable(); }

export function updateTest(id: string, patch: Partial<Pick<Test, "name" | "date" | "max">>): Test { return foundationUnavailable(); }

export function deleteTest(id: string): "deleted" | "archived" { return foundationUnavailable(); }

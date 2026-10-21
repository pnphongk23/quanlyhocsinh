/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "../foundation";
import type { Score } from "../types";

export const listScores: (testId: string) => Score[] = () => [];

export function saveScore(input: Omit<Score, "id">): Score { return foundationUnavailable(); }

/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "../foundation";
import type { HomeworkGrade, HomeworkKind, HomeworkLevel, HomeworkSection } from "../types";

export function listHomeworkSections(sessionId: string): HomeworkSection[] { return []; }

export function listHomeworkGrades(sectionId: string): HomeworkGrade[] { return []; }

export function saveHomeworkSection(input: {
    id?: string;
    sessionId: string;
    kind: HomeworkKind;
    title: string;
    description?: string;
}): HomeworkSection { return foundationUnavailable(); }

export function deleteHomeworkSection(id: string): void { return foundationUnavailable(); }

export function setHomeworkGrade(sectionId: string, studentId: string, level: HomeworkLevel | null): HomeworkGrade | null { return foundationUnavailable(); }

export function setHomeworkGradeForAll(sectionId: string, level: HomeworkLevel): number { return foundationUnavailable(); }

/** Phase A contract; persistence and sync are implemented in Phase B. */
import { foundationUnavailable } from "../foundation";
import type { Report } from "../types";

export const listReports: (classId: string) => Report[] = () => [];

export function saveReport(input: Pick<Report, "classId" | "studentId" | "month">): Report { return foundationUnavailable(); }

export function publishReport(id: string): void { return foundationUnavailable(); }

export function saveReportComment(id: string, generalComment: string): Report { return foundationUnavailable(); }

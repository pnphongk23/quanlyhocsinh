const deletedBatches = new Map<string, Set<string>>();
const deletedReports = new Map<string, Set<string>>();

export function markReportBatchDeleted(identity: string, batchId: string, reportIds: Iterable<string>): void {
  const batches = deletedBatches.get(identity) ?? new Set<string>();
  batches.add(batchId);
  deletedBatches.set(identity, batches);
  const reports = deletedReports.get(identity) ?? new Set<string>();
  for (const reportId of reportIds) reports.add(reportId);
  deletedReports.set(identity, reports);
}

export function isReportBatchDeleted(identity: string, batchId: unknown): boolean {
  return typeof batchId === "string" && Boolean(deletedBatches.get(identity)?.has(batchId));
}

export function isReportDeleted(identity: string, reportId: unknown): boolean {
  return typeof reportId === "string" && Boolean(deletedReports.get(identity)?.has(reportId));
}

export function clearReportBatchTombstones(identity: string): void {
  deletedBatches.delete(identity);
  deletedReports.delete(identity);
}

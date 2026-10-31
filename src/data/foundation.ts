import { setSaveStatus } from "./saveStatus";
export class FoundationUnavailableError extends Error {
  readonly code = "foundation_not_ready";
  constructor() { super("Thao tác dữ liệu sẽ được kết nối ở Đợt B."); }
}
/** Fail explicitly until the real cache/outbox adapter is installed. Never fake a save. */
export function foundationUnavailable(): never {
  setSaveStatus("error");
  throw new FoundationUnavailableError();
}

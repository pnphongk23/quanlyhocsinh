import { EmptyState } from "./EmptyState";

export function NoAccess({ what = "mục này" }: { what?: string }) {
  return (
    <EmptyState title={`Bạn không có quyền xem ${what}`}>
      <p>Liên hệ Admin nếu bạn cần quyền truy cập.</p>
    </EmptyState>
  );
}
export default NoAccess;

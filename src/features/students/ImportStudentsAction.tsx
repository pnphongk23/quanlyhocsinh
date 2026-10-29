import { canAccessClass } from "../../data/repositories/access";
import { Button } from "../../shared/ui";

export default function ImportStudentsAction({ classId, canWrite, onClick }: { classId: string; canWrite: boolean; onClick: () => void }) {
  if (!canWrite || !canAccessClass(classId)) return null;
  return <Button size="md" variant="secondary" onClick={onClick}>Nhập danh sách</Button>;
}

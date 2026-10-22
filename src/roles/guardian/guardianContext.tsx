import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "../../data/store";
import { getActiveMember } from "../../data/repositories/access";
import {
  listMyChildren,
  type GuardianChild,
} from "../../data/repositories/guardian";

/**
 * Con đang chọn của màn phụ huynh (chip chuyển giữa các con ở ảnh 15).
 * Nhớ trong `sessionStorage` để đổi tab hoặc tải lại vẫn đúng con đang xem.
 * Không có quyền ghi: chỉ đọc danh sách con được liên kết.
 */
const CHILD_KEY = "guardian-selected-child-v1";

export interface GuardianContextValue {
  /** Con được liên kết với membership phụ huynh đang dùng. */
  children: GuardianChild[];
  /** Con đang xem; null khi chưa liên kết con nào. */
  child: GuardianChild | null;
  selectChild: (studentId: string) => void;
  /** Lỗi quyền khi đọc danh sách con ("" khi bình thường). */
  error: string;
}

const GuardianContext = createContext<GuardianContextValue | null>(null);

function readStoredChild(): string | null {
  try {
    return globalThis.sessionStorage?.getItem(CHILD_KEY) ?? null;
  } catch {
    return null;
  }
}

function storeChild(studentId: string): void {
  try {
    globalThis.sessionStorage?.setItem(CHILD_KEY, studentId);
  } catch {
    // Trình duyệt chặn lưu trữ (chế độ riêng tư): vẫn chọn được trong phiên này.
  }
}

export function GuardianProvider({ children }: { children: ReactNode }) {
  // Theo dõi store để provider render lại khi dữ liệu trên máy thay đổi.
  useStore();
  const [selectedId, setSelectedId] = useState<string | null>(readStoredChild);
  let linked: GuardianChild[] = [];
  let error = "";
  try {
    linked = listMyChildren();
    // Giữ thứ tự con theo thứ tự liên kết (Member.studentIds) để chip chọn con
    // đứng cùng thứ tự với hồ sơ; repository vốn sắp theo tên.
    const linkedIds = getActiveMember()?.studentIds ?? [];
    if (linkedIds.length > 1)
      linked = [...linked].sort(
        (a, b) =>
          linkedIds.indexOf(a.student.id) - linkedIds.indexOf(b.student.id),
      );
  } catch (cause) {
    error =
      cause instanceof Error
        ? cause.message
        : "Không đọc được dữ liệu của con.";
  }
  const child =
    linked.find((item) => item.student.id === selectedId) ?? linked[0] ?? null;
  const selectChild = useCallback((studentId: string) => {
    setSelectedId(studentId);
    storeChild(studentId);
  }, []);
  return (
    <GuardianContext.Provider
      value={{ children: linked, child, selectChild, error }}
    >
      {children}
    </GuardianContext.Provider>
  );
}

export function useGuardianContext(): GuardianContextValue {
  const value = useContext(GuardianContext);
  if (!value) throw new Error("Thiếu GuardianProvider cho màn phụ huynh.");
  return value;
}

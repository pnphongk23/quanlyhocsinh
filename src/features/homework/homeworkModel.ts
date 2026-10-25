import {
  HOMEWORK_KINDS,
  HOMEWORK_KIND_LABELS,
} from "../../data/homework";
import type { HomeworkKind, HomeworkLevel } from "../../data/types";

/** Hai phần của tab Bài tập về nhà (ảnh 50/51). */
export type HomeworkView = "previous" | "today";

/** Hai chữ cái đầu của hai từ cuối, cùng quy ước với avatar ở Điểm danh. */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi-VN");
}

/**
 * Chạm lại đúng mức đang chọn thì bỏ chấm: trả null để dòng chấm bị xoá và
 * em trở về "Chưa chấm".
 */
export function nextGrade(
  current: HomeworkLevel | null,
  clicked: HomeworkLevel,
): HomeworkLevel | null {
  return current === clicked ? null : clicked;
}

/** Chỉ xoá được phần chưa chấm cho em nào (spec mục 4). */
export function canDeleteSection(gradeCount: number): boolean {
  return gradeCount === 0;
}

export function deleteBlockedMessage(gradeCount: number): string {
  return `Đã chấm cho ${gradeCount} em nên không xoá được. Vẫn sửa được tiêu đề và mô tả.`;
}

export const DELETE_ALLOWED_MESSAGE = "Chưa chấm cho em nào nên xoá được.";

/** Nhãn phụ của nút "Thêm phần"; null = đã đủ bốn loại nên ẩn nút. */
export function addPartLabel(missingKinds: HomeworkKind[]): string | null {
  return missingKinds.length ? `còn ${missingKinds.length} loại` : null;
}

/** "3/4 phần" — số phần đã giao trên tối đa bốn loại. */
export function partsCountLabel(count: number): string {
  return `${count}/${HOMEWORK_KINDS.length} phần`;
}

/** Nhãn trạng thái chấm của một phần trong sheet sửa (ảnh 53/54). */
export function gradePillLabel(gradeCount: number, total: number): string {
  return gradeCount > 0 ? `Đã chấm ${gradeCount}/${total}` : "Chưa chấm";
}

export function kindLabel(kind: HomeworkKind): string {
  return HOMEWORK_KIND_LABELS[kind];
}

/** Đọc `?part=<HomeworkKind>`; giá trị lạ bị bỏ qua. */
export function parseHomeworkKind(value: string | null): HomeworkKind | null {
  return HOMEWORK_KINDS.includes(value as HomeworkKind)
    ? (value as HomeworkKind)
    : null;
}

/**
 * Query khi bấm "Quay lại nhận xét …": mở tab Nhận xét đúng em, giữ các tham
 * số khác (đường dẫn buổi, bộ lọc…) và bỏ `from`/`part` của tab BTVN.
 */
export function commentsSearch(
  parameters: URLSearchParams,
  studentId: string,
): string {
  const next = new URLSearchParams(parameters);
  next.set("tab", "nhan-xet");
  next.set("student", studentId);
  next.delete("from");
  next.delete("part");
  return next.toString();
}

/** Câu chữ của hai trạng thái rỗng ở phần bài tập buổi trước. */
export function previousEmptyCopy(state: "first" | "none-given"): {
  title: string;
  body: string;
} {
  return state === "first"
    ? {
        title: "Bài tập buổi trước",
        body: "Lớp chưa giao bài nào nên chưa có gì để chấm.",
      }
    : {
        title: "Buổi trước không giao BTVN",
        body: "Không có phần nào để chấm hôm nay. Phiếu vẫn gửi bình thường.",
      };
}

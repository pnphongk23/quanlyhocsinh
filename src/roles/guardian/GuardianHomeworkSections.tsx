import type {
  ChildHomework,
  ChildHomeworkSection,
} from "../../data/repositories/guardian";
import { formatDayMonth } from "../../shared/format";
import GuardianIcon, { homeworkIcon } from "./GuardianIcon";
import {
  homeworkLevelLabel,
  homeworkLevelTone,
} from "./guardianFormat";
import { GuardianPill } from "./guardianUi";
import g from "./guardian.module.css";

/**
 * Danh sách phần BTVN của một buổi (ảnh 08/09).
 *
 * - Đề bài luôn hiện ngay khi giáo viên lưu.
 * - Kết quả chấm chỉ hiện khi phiếu của buổi chấm đã gửi (`graded`); phần chưa
 *   chấm xong vẫn hiện nhãn "Chưa chấm" kèm lời nhắc như ảnh.
 * - Danh sách kết quả (buổi trước) không lặp lại mô tả để gọn như ảnh.
 */
export function HomeworkSections({
  sections,
  showResults,
  showDescriptions = false,
}: {
  sections: ChildHomeworkSection[];
  showResults: boolean;
  showDescriptions?: boolean;
}) {
  return (
    <ul className={g.hwList}>
      {sections.map((section) => {
        const showResult = showResults && section.graded;
        return (
          <li key={section.section.id} className={g.hwRow}>
            <span className={g.hwIcon} aria-hidden="true">
              <GuardianIcon name={homeworkIcon[section.kind]} size={18} />
            </span>
            <div className={g.hwText}>
              <span className={g.hwKind}>{section.kindLabel}</span>
              <span className={g.hwTitle}>{section.section.title}</span>
              {showDescriptions && section.section.description && (
                <span className={g.hwDesc}>
                  {section.section.description}
                </span>
              )}
              {showResult && section.level === null && (
                <span className={g.hint}>Cô chấm xong là hiện ngay.</span>
              )}
            </div>
            {showResult && (
              <span className={g.hwResult}>
                <GuardianPill tone={homeworkLevelTone(section.level)}>
                  {homeworkLevelLabel(section.level)}
                </GuardianPill>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** "Cô chấm ngày 21/10" hoặc "Chưa có buổi chấm" (ảnh 09/34/35). */
export function gradingLine(item: ChildHomework): string {
  if (item.grading.state === "none" || !item.grading.session) {
    return "Chưa có buổi chấm";
  }
  return `Cô chấm ngày ${formatDayMonth(item.grading.session.date)}`;
}

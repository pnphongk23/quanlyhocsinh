import { useEffect, useRef, useState } from "react";
import type { TicketRow } from "../../data/homework";
import { toggleSlipCriterionDurable } from "../../data/repositories/comments";
import { defaultSlipCriteria } from "../../data/slip";
import type { HomeworkGrade } from "../../data/types";
import { EmptyState, Pill, Segmented } from "../../shared/ui";
import { canToggleCriterion, criteriaForEditingRow, criteriaForRow, rowHasCustomComment, SLIP_CRITERIA } from "./criteriaModel";
import s from "./CriteriaMode.module.css";

const expandedCriteriaBySession = new Map<string, number[]>();

export interface CriteriaPreview {
  banner?: string;
  summary?: string;
  criteriaByStudent?: Record<string, number>;
  includeSent?: boolean;
  onToggle?: (studentId: string, criterionIndex: number) => void;
}

export function CriteriaModeToggle({ mode, onChange }: { mode: "student" | "criteria"; onChange: (mode: "student" | "criteria") => void }) {
  return (
    <Segmented
      label="Cách xem nhận xét"
      value={mode}
      onChange={(value) => onChange(value as "student" | "criteria")}
      options={[
        { value: "student", label: "Theo học sinh" },
        { value: "criteria", label: "Theo tiêu chí" },
      ]}
    />
  );
}

export default function CriteriaMode({
  rows,
  sessionId,
  canWrite,
  selectedStudentId,
  onSelectStudent,
  previousGrades = () => [],
  preview,
}: {
  rows: TicketRow[];
  sessionId: string;
  canWrite: boolean;
  selectedStudentId?: string | null;
  onSelectStudent?: (studentId: string) => void;
  previousGrades?: (studentId: string) => readonly HomeworkGrade[] | null;
  preview?: CriteriaPreview;
}) {
  const [error, setError] = useState("");
  const [showCustomWarning, setShowCustomWarning] = useState(false);
  const [expandedBySession, setExpandedBySession] = useState<Record<string, number[]>>({});
  const customWarningShown = useRef(false);
  const sentConfirmShown = useRef(false);
  const initialCriteria = (row: TicketRow) => defaultSlipCriteria(previousGrades(row.student.id));

  useEffect(() => {
    customWarningShown.current = false;
    sentConfirmShown.current = false;
    setShowCustomWarning(false);
    setError("");
  }, [sessionId]);

  async function toggle(row: TicketRow, index: number) {
    if (!canWrite || !canToggleCriterion(row)) return;
    if (!confirmSent(row)) return;
    warnCustomComment(row);
    onSelectStudent?.(row.student.id);
    setError("");
    try {
      await toggleSlipCriterionDurable(sessionId, row.student.id, index);
    } catch {
      setError("Không lưu được thay đổi. Hãy thử lại.");
    }
  }

  function confirmSent(row: TicketRow): boolean {
    if ((row.status === "sent" || row.status === "queued") && !sentConfirmShown.current) {
      if (!window.confirm("Phiếu đã gửi hoặc đang chờ gửi. Bạn vẫn muốn sửa?")) return false;
      sentConfirmShown.current = true;
    }
    return true;
  }

  function warnCustomComment(row: TicketRow) {
    if (rowHasCustomComment(row) && !customWarningShown.current) {
      customWarningShown.current = true;
      setShowCustomWarning(true);
    }
  }

  if (!rows.length) return <EmptyState title="Chưa có học sinh trong buổi học này" />;
  const orderedRows = [...rows.filter((row) => row.attended), ...rows.filter((row) => !row.attended)];

  return (
      <div className={s.root}>
          {preview?.banner && <p className={s.previewBanner}>{preview.banner}</p>}
          {preview?.summary && <p className={s.previewSummary}>{preview.summary}</p>}
          {showCustomWarning && <p className={s.warning}>Câu nhận xét đã được sửa tay; lần chạm này sẽ thay bằng câu tự sinh theo tiêu chí.</p>}
      {error && <p className={s.error} role="alert">{error}</p>}
        {SLIP_CRITERIA.map((criterion, index) => {
            const expanded = (expandedBySession[sessionId] ?? expandedCriteriaBySession.get(sessionId) ?? [0]).includes(index);
          const achieved = rows.filter((row) => {
            if (!row.attended) return false;
              const criteria = preview?.criteriaByStudent?.[row.student.id] ?? (row.comment ? criteriaForRow(row) : initialCriteria(row));
            return (criteria & (1 << index)) !== 0;
          }).length;
          return (
          <section className={s.group} key={criterion}>
            <button
              type="button"
              className={s.groupHead}
              aria-expanded={expanded}
                onClick={() => setExpandedBySession((current) => {
                  const opened = current[sessionId] ?? expandedCriteriaBySession.get(sessionId) ?? [0];
                  const next = opened.includes(index) ? opened.filter((item) => item !== index) : [...opened, index];
                  expandedCriteriaBySession.set(sessionId, next);
                  return { ...current, [sessionId]: next };
                })}
            >
              <span className={s.groupTitle}>{index === 4 ? "Hoàn thành BTVN" : criterion}</span>
            <span className={s.count}>đạt {achieved}/{rows.filter((row) => row.attended).length}</span>
              <span className={`${s.chevron}${expanded ? ` ${s.chevronOpen}` : ""}`} aria-hidden="true">⌄</span>
            </button>
            <div className={`${s.content}${expanded ? ` ${s.contentOpen}` : ""}`} aria-hidden={!expanded} inert={!expanded}>
              <div className={s.contentInner}>
            {index === 4 && <Pill tone="neutral">Theo chấm BTVN</Pill>}
            <p className={s.hint}>Chạm để bỏ chọn em chưa đạt</p>
            <div className={s.chips}>
              {orderedRows.map((row) => {
              const legacy = !canToggleCriterion(row);
                  const criteria = preview?.criteriaByStudent?.[row.student.id] ?? (row.comment ? criteriaForEditingRow(row) : row.attended ? initialCriteria(row) : 0);
              const unachieved = (criteria & (1 << index)) === 0;
                // Tô màu = em đạt; em chưa có phiếu tô nhạt (sẽ đạt khi tạo phiếu).
                const selected = !unachieved;
                const provisional = !row.comment && preview?.criteriaByStudent?.[row.student.id] === undefined;
                const chipTone = provisional ? s.provisional : selected ? s.selected : "";
                const sent = row.status === "sent" || row.status === "queued";
                const blockedSentPreview = !!preview && sent && !preview.includeSent;
                  const label = `${row.student.name}${!row.attended ? " · Vắng" : ""}${sent ? " · Đã gửi" : ""}${legacy ? " · Phiếu thang cũ" : ""}`;
                return canWrite && !legacy && !blockedSentPreview ? (
                <button
                  key={row.student.id}
                  type="button"
                    className={`${s.chip}${chipTone ? ` ${chipTone}` : ""}`}
                  aria-pressed={selected}
                  aria-label={label}
                  aria-current={row.student.id === selectedStudentId ? "true" : undefined}
                      onClick={() => {
                        if (preview?.onToggle) {
                          if (!confirmSent(row)) return;
                          warnCustomComment(row);
                          preview.onToggle(row.student.id, index);
                        } else void toggle(row, index);
                      }}
                >
                    {row.student.name}{!row.attended && <small className={s.absenceLabel}>Vắng</small>}{sent && <small>Đã gửi</small>}
                </button>
              ) : (
                    <span key={row.student.id} aria-disabled="true" aria-current={row.student.id === selectedStudentId ? "true" : undefined} className={`${s.chip}${chipTone ? ` ${chipTone}` : ""}${legacy ? ` ${s.legacy}` : ""} ${s.disabled}`}>
                    {row.student.name}{!row.attended && <small className={s.absenceLabel}>Vắng</small>}{sent && <small>Đã gửi</small>}{legacy && <small>Phiếu thang cũ</small>}
                </span>
              );
            })}
            </div>
              </div>
            </div>
          </section>
          );
        })}
    </div>
  );
}

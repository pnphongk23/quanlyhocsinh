import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { teachingEntries, type TeachingEntry } from "../../data/teaching";
import { useAccess } from "../../data/repositories/access";
import { useStore } from "../../data/store";
import type { StaffPosition } from "../../data/types";
import { formatWeekdayDate, todayISO } from "../../shared/format";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { EmptyState, Icon, NoAccess, PageHeader, Pill } from "../../shared/ui";
import {
  activeStaffMembers,
  addDays,
  defaultMemberIdFor,
  groupEntriesByDate,
  memberHasTeaching,
  startOfWeek,
  weekCounts,
  weekDates,
  weekRangeLabel,
  weekdayShort,
  type TeachingCounts,
} from "./teachingScheduleModel";
import s from "./teachingSchedule.module.css";

/**
 * Dữ liệu mẫu nằm trong tuần 12–18/10/2026 nên mặc định mở đúng tuần đó.
 * (SchedulePage dùng ngày thật; ở đây neo vào tuần có dữ liệu mẫu để bản demo
 * luôn có nội dung, còn "Về tuần này" đưa về tuần hiện tại.)
 */
const DEFAULT_WEEK_START = "2026-10-12";
const WORKSPACE_NAME = "Lớp của cô Lan";

const POSITION_BADGE: Record<
  StaffPosition,
  { label: string; tone: "primary" | "neutral" }
> = {
  main: { label: "Dạy chính", tone: "primary" },
  assistant: { label: "Trợ giảng", tone: "neutral" },
};

/** Biểu tượng người cho hộp chọn nhân sự. */
function PersonIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function TeachingCard({
  entry,
  className,
  nameOf,
  compact = false,
}: {
  entry: TeachingEntry;
  className: string;
  nameOf: (memberId: string) => string;
  compact?: boolean;
}) {
  const cancelled = entry.session.status === "cancelled";
  const replaced = entry.kind === "replaced";
  const substitute = entry.kind === "substitute";
  const struck = cancelled || replaced;
  const note = cancelled
    ? "Buổi đã huỷ"
    : replaced && entry.otherMemberId
      ? `Được thay bởi ${nameOf(entry.otherMemberId)}`
      : substitute
        ? entry.otherMemberId
          ? `Thay ${nameOf(entry.otherMemberId)}`
          : "Dạy thay buổi lẻ/học bù"
        : null;
  return (
    <Link
      className={[s.card, compact ? s.cardCompact : "", cancelled ? s.cardCancelled : ""]
        .filter(Boolean)
        .join(" ")}
      to={`/lop/${entry.classId}/buoi-hoc/${entry.session.id}`}
      title={className}
    >
      <span className={`${s.cardLead} ${struck ? s.struck : ""}`.trim()}>
        {entry.session.time ?? "--:--"}
      </span>
      <span className={s.cardBody}>
        <span className={`${s.cardTitle} ${struck ? s.struck : ""}`.trim()}>
          {className}
        </span>
        {note && <span className={s.cardNote}>{note}</span>}
        <span className={s.cardTags}>
          {cancelled ? (
            <Pill tone="error">Đã huỷ</Pill>
          ) : substitute ? (
            <Pill tone="warning">Dạy thay</Pill>
          ) : (
            <Pill tone={POSITION_BADGE[entry.position].tone}>
              {POSITION_BADGE[entry.position].label}
            </Pill>
          )}
          {entry.session.makeup && !cancelled && (
            <Pill tone="primary">Học bù</Pill>
          )}
        </span>
      </span>
    </Link>
  );
}

function SummaryLine({ counts }: { counts: TeachingCounts }) {
  if (!counts.taught && !counts.replaced && !counts.cancelled)
    return <p className={s.summaryLine}>0 buổi</p>;
  const parts: ReactNode[] = [
    <>
      <strong>{counts.taught}</strong> buổi dạy
    </>,
  ];
  if (counts.substitutes)
    parts.push(
      <>
        gồm <strong>{counts.substitutes}</strong> dạy thay
      </>,
    );
  if (counts.replaced)
    parts.push(
      <>
        <strong>{counts.replaced}</strong> bị thay
      </>,
    );
  if (counts.cancelled)
    parts.push(
      <>
        <strong>{counts.cancelled}</strong> đã huỷ
      </>,
    );
  return (
    <p className={s.summaryLine}>
      {parts.map((part, index) => (
        <span key={index}>
          {index ? " · " : ""}
          {part}
        </span>
      ))}
    </p>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={s.summaryCard}>
      <span className={s.summaryCardLabel}>{label}</span>
      <span className={s.summaryCardValue}>{value}</span>
    </div>
  );
}

/** Ba thẻ tóm tắt của bản desktop. */
export function SummaryCards({ counts }: { counts: TeachingCounts }) {
  return (
    <div className={s.summaryCards}>
      <SummaryCard label="Buổi dạy" value={counts.taught} />
      <SummaryCard label="Bị thay" value={counts.replaced} />
      <SummaryCard label="Đã huỷ" value={counts.cancelled} />
    </div>
  );
}

/** Lưới 7 cột Thứ Hai → Chủ nhật của bản desktop. */
export function WeekGrid({
  dates,
  byDate,
  classNameOf,
  nameOf,
}: {
  dates: string[];
  byDate: Map<string, TeachingEntry[]>;
  classNameOf: (classId: string) => string;
  nameOf: (memberId: string) => string;
}) {
  return (
    <div className={s.weekGrid}>
      {dates.map((date) => {
        const dayEntries = byDate.get(date) ?? [];
        return (
          <div className={s.dayColumn} key={date}>
            <h2 className={s.dayLabel}>{weekdayShort(date)}</h2>
            {dayEntries.length === 0 ? (
              <p className={s.dayEmpty}>Không có buổi</p>
            ) : (
              dayEntries.map((entry) => (
                <TeachingCard
                  key={entry.session.id}
                  entry={entry}
                  className={classNameOf(entry.classId)}
                  nameOf={nameOf}
                  compact
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TeachingSchedulePage() {
  const state = useStore();
  const access = useAccess();
  const desktop = useIsDesktop();
  const today = todayISO();

  const roleById = useMemo(
    () => new Map(state.roles.map((role) => [role.id, role] as const)),
    [state.roles],
  );
  const staff = useMemo(
    () =>
      activeStaffMembers(
        state.members,
        (roleId) => roleById.get(roleId)?.kind === "staff",
      ),
    [state.members, roleById],
  );
  const memberNameById = useMemo(
    () =>
      new Map(state.members.map((member) => [member.id, member.name] as const)),
    [state.members],
  );
  const classById = useMemo(
    () => new Map(state.classes.map((klass) => [klass.id, klass] as const)),
    [state.classes],
  );
  const defaultId = useMemo(
    () => defaultMemberIdFor(staff, state.classStaff, state.sessionSubstitutes),
    [staff, state.classStaff, state.sessionSubstitutes],
  );

  const [pickedId, setPickedId] = useState("");
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(DEFAULT_WEEK_START),
  );

  const selectedId = staff.some((member) => member.id === pickedId)
    ? pickedId
    : (defaultId ?? staff[0]?.id ?? "");
  // Nhân sự chỉ xem lịch của mình; Admin xem được mọi người.
  const viewMemberId = access.isAdmin ? selectedId : (access.member?.id ?? "");

  const entries = useMemo(
    () =>
      viewMemberId
        ? teachingEntries(state, viewMemberId, weekStart, addDays(weekStart, 6))
        : [],
    [state, viewMemberId, weekStart],
  );
  const groups = useMemo(() => groupEntriesByDate(entries), [entries]);
  const dates = useMemo(() => weekDates(weekStart), [weekStart]);
  const byDate = useMemo(() => {
    const map = new Map<string, TeachingEntry[]>();
    for (const group of groups) map.set(group.date, group.entries);
    return map;
  }, [groups]);
  const counts = weekCounts(entries);
  const hasTeaching = viewMemberId
    ? memberHasTeaching(state, viewMemberId)
    : false;

  if (access.role?.kind !== "staff" || !access.member) {
    return (
      <section className={s.page}>
        <PageHeader compact backTo="/cai-dat" title="Lịch dạy" />
        <NoAccess what="lịch dạy" />
      </section>
    );
  }

  const startOfToday = startOfWeek(today);
  const isThisWeek = weekStart === startOfToday;
  const nameOf = (memberId: string) => memberNameById.get(memberId) ?? "Không rõ";
  const classNameOf = (classId: string) =>
    classById.get(classId)?.name ?? "Lớp đã xoá";
  const shiftWeek = (delta: number) =>
    setWeekStart((start) => addDays(start, delta * 7));

  const title = access.isAdmin ? "Lịch dạy" : "Lịch của tôi";
  const subtitle = access.isAdmin ? "Xem lịch của mọi nhân sự" : access.member.name;
  const emptyTitle = hasTeaching
    ? "Không có buổi dạy trong tuần này"
    : "Bạn chưa có buổi dạy";
  const emptyText = hasTeaching
    ? "Chọn tuần khác để xem lịch."
    : "Khi Admin phân công lớp hoặc nhờ dạy thay, buổi sẽ hiện ở đây.";

  const picker = access.isAdmin ? (
    <div className={s.picker}>
      <span className={s.pickerIcon} aria-hidden="true">
        <PersonIcon />
      </span>
      {staff.length === 0 ? (
        <span className={s.pickerHint}>
          Chưa có nhân sự đang hoạt động để xem lịch.
        </span>
      ) : (
        <select
          id="teaching-member"
          className={s.select}
          value={selectedId}
          aria-label="Xem lịch của"
          onChange={(event) => setPickedId(event.target.value)}
        >
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      )}
      <span className={s.pickerChevron} aria-hidden="true">
        <Icon name="chevron-down" size={18} />
      </span>
    </div>
  ) : null;

  const weekBar = (
    <section className={s.weekBar} aria-label="Chọn tuần">
      <button
        type="button"
        className={s.navButton}
        aria-label="Tuần trước"
        onClick={() => shiftWeek(-1)}
      >
        <Icon name="back" />
      </button>
      <div className={s.weekBarCenter}>
        <span className={s.weekLabel}>{weekRangeLabel(weekStart)}</span>
        {isThisWeek ? (
          <span className={s.weekHint}>Tuần này</span>
        ) : (
          <button
            type="button"
            className={s.weekJump}
            onClick={() => setWeekStart(startOfToday)}
          >
            Về tuần này
          </button>
        )}
      </div>
      <button
        type="button"
        className={s.navButton}
        aria-label="Tuần sau"
        onClick={() => shiftWeek(1)}
      >
        <Icon name="chevron-right" />
      </button>
    </section>
  );

  return (
    <main className={s.page}>
      <PageHeader
        compact={!desktop}
        backTo={desktop ? undefined : "/cai-dat"}
        eyebrow={desktop ? `Workspace ${WORKSPACE_NAME} · ${subtitle}` : undefined}
        title={title}
        overlay={desktop ? undefined : <p className={s.subtitle}>{subtitle}</p>}
        actions={
          desktop ? (
            <div className={s.headActions}>
              {picker}
              {weekBar}
            </div>
          ) : undefined
        }
      />

      {!desktop && picker}
      {!desktop && weekBar}

      {entries.length === 0 ? (
        desktop ? (
          <div className={s.emptyCard}>
            <EmptyState title={emptyTitle}>
              <p>{emptyText}</p>
            </EmptyState>
          </div>
        ) : (
          <>
            <SummaryLine counts={counts} />
            <EmptyState title={emptyTitle}>
              <p>{emptyText}</p>
            </EmptyState>
          </>
        )
      ) : desktop ? (
        <>
          <SummaryCards counts={counts} />
          <WeekGrid
            dates={dates}
            byDate={byDate}
            classNameOf={classNameOf}
            nameOf={nameOf}
          />
        </>
      ) : (
        <>
          <SummaryLine counts={counts} />
          {groups.map((group) => (
            <section
              className={s.group}
              key={group.date}
              aria-label={formatWeekdayDate(group.date)}
            >
              <h2
                className={`${s.groupLabel} ${
                  group.date === today ? s.groupLabelToday : ""
                }`.trim()}
              >
                {formatWeekdayDate(group.date)}
                {group.date === today ? " · Hôm nay" : ""}
              </h2>
              <div className={s.cards}>
                {group.entries.map((entry) => (
                  <TeachingCard
                    key={entry.session.id}
                    entry={entry}
                    className={classNameOf(entry.classId)}
                    nameOf={nameOf}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </main>
  );
}

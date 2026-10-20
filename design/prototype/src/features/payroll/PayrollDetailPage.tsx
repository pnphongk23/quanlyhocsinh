import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import {
  addPayAdjustment,
  canViewPayroll,
  readMemberPayroll,
  removePayAdjustment,
  setPayRate,
} from "../../data/repositories/payroll";
import { useStore } from "../../data/store";
import { formatDayMonth } from "../../shared/format";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import {
  Button,
  Card,
  EmptyState,
  Fab,
  Icon,
  Input,
  NoAccess,
  PageHeader,
  Pill,
  Segmented,
  Sheet,
  type PillTone,
} from "../../shared/ui";
import {
  formatVnd,
  monthLabel,
  monthPhrase,
  monthTitle,
  normalizeMonth,
  positionLabel,
  shiftMonth,
  positionShortLabel,
  signedVnd,
  unpricedPositions,
  unpricedSubstituteLines,
} from "./payrollModel";
import s from "./payroll.module.css";

const SESSION_PREVIEW = 3;

/**
 * Chi tiết lương một người trong tháng. Admin sửa được đơn giá và điều chỉnh;
 * nhân sự chỉ xem được bảng lương của chính mình ở chế độ chỉ đọc.
 */
export default function PayrollDetailPage() {
  const state = useStore();
  const access = useAccess();
  const desktop = useIsDesktop();
  const { memberId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [rateOpen, setRateOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [plannedOpen, setPlannedOpen] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [mainRate, setMainRate] = useState("0");
  const [assistantRate, setAssistantRate] = useState("0");
  const [adjustMode, setAdjustMode] = useState<"bonus" | "deduction">("bonus");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [notice, setNotice] = useState("");

  const month = normalizeMonth(params.get("thang"));
  const changeMonth = (delta: number) => {
    const next = new URLSearchParams(params);
    next.set("thang", shiftMonth(month, delta));
    setParams(next, { replace: true });
  };

  if (!canViewPayroll(memberId)) {
    return (
      <section className={s.pageNarrow}>
        <PageHeader
          compact
          backTo={access.isAdmin ? "/luong" : "/cai-dat"}
          title="Bảng lương"
        />
        <NoAccess what="bảng lương này" />
      </section>
    );
  }

  const member = state.members.find((item) => item.id === memberId);
  if (!member) {
    return (
      <section className={s.pageNarrow}>
        <PageHeader compact backTo="/luong" title="Bảng lương" />
        <EmptyState title="Không tìm thấy thành viên">
          <p>Thành viên có thể đã bị vô hiệu hoá hoặc không còn trong workspace.</p>
        </EmptyState>
      </section>
    );
  }

  const summary = readMemberPayroll(memberId, month);
  const locked = summary.status === "locked";
  const heldLines = summary.lines.filter((line) => !line.planned);
  const plannedLines = summary.lines.filter((line) => line.planned);
  const sessions = showAllSessions
    ? heldLines
    : heldLines.slice(0, SESSION_PREVIEW);
  const hiddenSessions = heldLines.length - sessions.length;
  const payRate = state.payRates.find((item) => item.memberId === memberId);
  const classById = new Map(state.classes.map((item) => [item.id, item.name]));
  const classOf = (classId: string): string =>
    classById.get(classId) ?? "Lớp không còn";
  const positions = unpricedPositions(summary);
  const unpricedSubs = unpricedSubstituteLines(summary);
  const unpricedSubDates = [
    ...new Set(unpricedSubs.map((line) => formatDayMonth(line.entry.session.date))),
  ].join(", ");
  const adjustmentTone: PillTone = locked ? "success" : "warning";

  function openRate() {
    setMainRate(String(payRate?.mainRate ?? 0));
    setAssistantRate(String(payRate?.assistantRate ?? 0));
    setModalError("");
    setRateOpen(true);
  }

  function saveRate() {
    const main = Number(mainRate);
    const assistant = Number(assistantRate);
    if (
      !Number.isInteger(main) ||
      main < 0 ||
      !Number.isInteger(assistant) ||
      assistant < 0
    ) {
      setModalError("Đơn giá phải là số nguyên không âm.");
      return;
    }
    try {
      setPayRate(memberId, main, assistant);
      setRateOpen(false);
      setModalError("");
      setError("");
      setNotice("Đã lưu đơn giá.");
    } catch (cause) {
      setModalError(
        cause instanceof Error ? cause.message : "Không lưu được đơn giá.",
      );
    }
  }

  function openAdjust() {
    setAdjustMode("bonus");
    setAdjustAmount("");
    setAdjustNote("");
    setModalError("");
    setAdjustOpen(true);
  }

  function saveAdjust() {
    const value = Number(adjustAmount);
    if (!Number.isInteger(value) || value <= 0) {
      setModalError("Số tiền phải là số nguyên lớn hơn 0.");
      return;
    }
    if (!adjustNote.trim()) {
      setModalError("Nhập ghi chú cho khoản điều chỉnh.");
      return;
    }
    try {
      addPayAdjustment({
        memberId,
        month,
        amount: adjustMode === "bonus" ? value : -value,
        note: adjustNote,
      });
      setAdjustOpen(false);
      setModalError("");
      setError("");
      setNotice("Đã thêm khoản điều chỉnh.");
    } catch (cause) {
      setModalError(
        cause instanceof Error
          ? cause.message
          : "Không thêm được khoản điều chỉnh.",
      );
    }
  }

  function removeAdjustment(id: string) {
    try {
      removePayAdjustment(id);
      setError("");
      setNotice("Đã xoá khoản điều chỉnh.");
    } catch (cause) {
      setNotice("");
      setError(
        cause instanceof Error
          ? cause.message
          : "Không xoá được khoản điều chỉnh.",
      );
    }
  }

  const renderLine = (line: (typeof summary.lines)[number]) => {
    const { entry, rate, amount } = line;
    return (
      <li
        key={`${entry.session.id}-${entry.position}`}
        className={s.sessionRow}
      >
        <span className={s.sessionDate}>
          {formatDayMonth(entry.session.date)}
        </span>
        <span className={s.sessionClass}>{classOf(entry.classId)}</span>
        <span className={s.lineTags}>
          <Pill tone="primary">{positionShortLabel(entry.position)}</Pill>
          {entry.kind === "substitute" && <Pill tone="primary">Dạy thay</Pill>}
          {entry.session.makeup && <Pill tone="neutral">Học bù</Pill>}
        </span>
        <span className={rate === 0 ? s.unpriced : s.sessionAmount}>
          {rate === 0 ? "Chưa tính" : formatVnd(amount)}
        </span>
      </li>
    );
  };

  return (
    <main className={s.pageNarrow}>
      <PageHeader
        compact
        backTo={desktop ? undefined : access.isAdmin ? "/luong" : "/cai-dat"}
        eyebrow={`Lương ${monthPhrase(month)}`}
        title={member.name}
        actions={
          desktop ? (
            <div className={s.headerNav}>
              <Button
                variant="secondary"
                size="md"
                aria-label="Tháng trước"
                onClick={() => changeMonth(-1)}
              >
                <Icon name="back" />
              </Button>
              <strong className={s.headerMonth}>{monthTitle(month)}</strong>
              <Button
                variant="secondary"
                size="md"
                aria-label="Tháng sau"
                onClick={() => changeMonth(1)}
              >
                <Icon name="chevron-right" />
              </Button>
            </div>
          ) : undefined
        }
      />

      {!desktop && (
        <Card className={s.monthCard}>
          <div className={s.monthHead}>
            <Button
              variant="secondary"
              size="md"
              aria-label="Tháng trước"
              onClick={() => changeMonth(-1)}
            >
              <Icon name="back" />
            </Button>
            <strong className={s.monthTitle}>{monthTitle(month)}</strong>
            <Button
              variant="secondary"
              size="md"
              aria-label="Tháng sau"
              onClick={() => changeMonth(1)}
            >
              <Icon name="chevron-right" />
            </Button>
          </div>
        </Card>
      )}

      {notice && (
        <p role="status" className={s.notice + " " + s.noticeSuccess}>
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}

      <Card className={s.totalCard}>
        <div className={s.totalHead}>
          <span className={s.statLabel}>Tổng lương</span>
          <Pill tone={adjustmentTone}>
            {locked ? "Đã chốt" : "Nháp · tạm tính"}
          </Pill>
        </div>
        <strong className={s.totalAmount}>{formatVnd(summary.total)}</strong>
        {!locked && (
          <p className={s.meta}>
            {formatVnd(summary.sessionAmount)} buổi
            {summary.adjustmentTotal !== 0
              ? ` ${summary.adjustmentTotal > 0 ? "+" : "−"} ${formatVnd(
                  Math.abs(summary.adjustmentTotal),
                )} điều chỉnh`
              : " · chưa có điều chỉnh"}
          </p>
        )}
      </Card>

      {!access.isAdmin && (
        <Card className={s.block}>
          <h2 className={s.sectionTitle}>Số buổi theo vị trí</h2>
          <ul className={s.rateRows}>
            <li className={s.rateRow}>
              <span className={s.rateText}>
                Dạy chính · {summary.mainCount} buổi ×{" "}
                {formatVnd(payRate?.mainRate ?? 0)}
              </span>
              <strong>{formatVnd(summary.mainCount * (payRate?.mainRate ?? 0))}</strong>
            </li>
            <li className={s.rateRow}>
              <span className={s.rateText}>
                Trợ giảng · {summary.assistantCount} buổi ×{" "}
                {formatVnd(payRate?.assistantRate ?? 0)}
              </span>
              <strong>
                {formatVnd(summary.assistantCount * (payRate?.assistantRate ?? 0))}
              </strong>
            </li>
          </ul>
        </Card>
      )}

      {summary.missingRate && (
        <p className={s.bannerWarning}>
          <span>
            <strong>
              Chưa đặt đơn giá{" "}
              {positions
                .map((position) => (position === "main" ? "chính" : "trợ giảng"))
                .join(", ")}
              .
            </strong>{" "}
            {unpricedSubs.length > 0
              ? `Buổi dạy thay ${unpricedSubDates} chưa được tính.`
              : "Các buổi đó chưa được tính tiền."}
          </span>
        </p>
      )}

      <Card className={s.block}>
        <div className={s.blockHead}>
          <h2 className={s.sectionTitle}>Đơn giá</h2>
          {access.isAdmin && !locked && (
            <Button variant="secondary" size="sm" onClick={openRate}>
              Sửa đơn giá
            </Button>
          )}
        </div>
        <ul className={s.rateRows}>
          <li className={s.rateRow}>
            <span className={s.rateText}>Dạy chính</span>
            <strong className={(payRate?.mainRate ?? 0) === 0 ? s.unpriced : ""}>
              {(payRate?.mainRate ?? 0) === 0
                ? "Chưa đặt đơn giá"
                : `${formatVnd(payRate?.mainRate ?? 0)}/buổi`}
            </strong>
          </li>
          <li className={s.rateRow}>
            <span className={s.rateText}>Trợ giảng</span>
            <strong
              className={(payRate?.assistantRate ?? 0) === 0 ? s.unpriced : ""}
            >
              {(payRate?.assistantRate ?? 0) === 0
                ? "Chưa đặt đơn giá"
                : `${formatVnd(payRate?.assistantRate ?? 0)}/buổi`}
            </strong>
          </li>
        </ul>
      </Card>

      <Card className={s.block}>
        <h2 className={s.sectionTitle}>Buổi đã tính · {heldLines.length}</h2>
        {heldLines.length === 0 ? (
          <p className={s.note}>Chưa có buổi nào được tính trong tháng.</p>
        ) : (
          <>
            <ul className={s.sessionList}>{sessions.map(renderLine)}</ul>
            {hiddenSessions > 0 ? (
              <button
                type="button"
                className={s.moreLink}
                onClick={() => setShowAllSessions(true)}
              >
                Xem thêm {hiddenSessions} buổi
              </button>
            ) : heldLines.length > SESSION_PREVIEW ? (
              <button
                type="button"
                className={s.moreLink}
                onClick={() => setShowAllSessions(false)}
              >
                Thu gọn
              </button>
            ) : null}
          </>
        )}
      </Card>

      {!locked && plannedLines.length > 0 && (
        <Card className={s.block}>
          <button
            type="button"
            className={s.collapseHead}
            aria-expanded={plannedOpen}
            onClick={() => setPlannedOpen((open) => !open)}
          >
            <span className={s.collapseText}>
              <strong>Buổi dự kiến · {plannedLines.length}</strong>
              <span className={s.meta}>
                Chưa diễn ra · {formatVnd(summary.plannedAmount)}
              </span>
            </span>
            <Pill tone="neutral">Dự kiến</Pill>
            <Icon name={plannedOpen ? "chevron-down" : "chevron-right"} />
          </button>
          {plannedOpen && (
            <ul className={s.sessionList}>{plannedLines.map(renderLine)}</ul>
          )}
        </Card>
      )}

      <Card className={s.block}>
        <div className={s.blockHead}>
          <h2 className={s.sectionTitle}>Điều chỉnh</h2>
          {access.isAdmin && !locked && desktop && (
            <Button variant="secondary" size="sm" onClick={openAdjust}>
              Thêm điều chỉnh
            </Button>
          )}
        </div>
        {summary.adjustments.length === 0 ? (
          <p className={s.note}>Không có điều chỉnh.</p>
        ) : (
          <ul className={s.adjustList}>
            {summary.adjustments.map((item) => {
              const positive = item.amount > 0;
              return (
                <li key={item.id} className={s.adjustRow}>
                  <span className={s.adjustText}>
                    <strong>{positive ? "Thưởng" : "Trừ"}</strong>
                    <span className={s.meta}>{item.note}</span>
                  </span>
                  <span
                    className={
                      s.adjustAmount + (positive ? "" : " " + s.adjustAmountNegative)
                    }
                  >
                    {signedVnd(item.amount)}
                  </span>
                  {access.isAdmin && !locked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAdjustment(item.id)}
                      aria-label={`Xoá khoản điều chỉnh: ${item.note}`}
                    >
                      Xoá
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {locked && (
        <p className={s.lockNote}>
          Bảng lương {monthLabel(month)} đã chốt, chỉ xem.
        </p>
      )}

      {access.isAdmin && !locked && (
        <Fab label="Thêm điều chỉnh" onClick={openAdjust} />
      )}

      <Sheet
        title={`Sửa đơn giá · ${member.name}`}
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        footer={
          <Button size="lg" onClick={saveRate}>
            Lưu đơn giá
          </Button>
        }
      >
        <div className={s.form}>
          <div className={s.moneyField}>
            <Input
              label="Dạy chính"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              className={s.moneyInput}
              value={mainRate}
              onChange={(event) => setMainRate(event.target.value)}
            />
            <span className={s.suffix}>đ/buổi</span>
          </div>
          <div className={s.moneyField}>
            <Input
              label="Trợ giảng"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              className={s.moneyInput}
              value={assistantRate}
              onChange={(event) => setAssistantRate(event.target.value)}
            />
            <span className={s.suffix}>đ/buổi</span>
          </div>
          <p className={s.note}>Đơn giá áp dụng cho các buổi chưa chốt lương.</p>
          {modalError && (
            <p role="alert" className={s.error}>
              {modalError}
            </p>
          )}
        </div>
      </Sheet>

      <Sheet
        title="Thêm điều chỉnh"
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        footer={
          <Button size="lg" onClick={saveAdjust}>
            Lưu điều chỉnh
          </Button>
        }
      >
        <div className={s.form}>
          <Segmented
            label="Loại điều chỉnh"
            value={adjustMode}
            onChange={(value) =>
              setAdjustMode(value === "deduction" ? "deduction" : "bonus")
            }
            options={[
              { value: "bonus", label: "Thưởng" },
              { value: "deduction", label: "Trừ" },
            ]}
          />
          <div className={s.moneyField}>
            <Input
              label="Số tiền"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              className={s.moneyInput}
              value={adjustAmount}
              onChange={(event) => setAdjustAmount(event.target.value)}
            />
            <span className={s.suffix}>đ</span>
          </div>
          <Input
            label="Ghi chú"
            type="text"
            placeholder="Ví dụ: Dạy thay kịp thời 15/10"
            value={adjustNote}
            onChange={(event) => setAdjustNote(event.target.value)}
          />
          {modalError && (
            <p role="alert" className={s.error}>
              {modalError}
            </p>
          )}
        </div>
      </Sheet>
    </main>
  );
}

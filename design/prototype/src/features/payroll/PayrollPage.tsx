import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import {
  getPayrollStatus,
  lockPayroll,
  readMonthPayroll,
} from "../../data/repositories/payroll";
import { useStore } from "../../data/store";
import { formatDayMonth } from "../../shared/format";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import {
  Button,
  Card,
  EmptyState,
  Icon,
  Modal,
  NoAccess,
  PageHeader,
  Pill,
  type PillTone,
} from "../../shared/ui";
import {
  formatVnd,
  initials,
  lastHeldDate,
  monthPhrase,
  monthTitle,
  normalizeMonth,
  shiftMonth,
  signedVnd,
  substituteCount,
  unpricedPositions,
  unpricedSubstituteLines,
} from "./payrollModel";
import s from "./payroll.module.css";

/**
 * Bảng lương theo tháng (Admin). Nhân sự không phải Admin được chuyển thẳng
 * sang bảng lương của chính mình; phụ huynh hoặc không có vai trò thì bị chặn.
 */
export default function PayrollPage() {
  const state = useStore();
  const access = useAccess();
  const desktop = useIsDesktop();
  const [params, setParams] = useSearchParams();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");

  const month = normalizeMonth(params.get("thang"));
  const changeMonth = (delta: number) => {
    const next = new URLSearchParams(params);
    next.set("thang", shiftMonth(month, delta));
    setParams(next, { replace: true });
  };

  if (!access.isAdmin) {
    if (access.role?.kind === "staff" && state.activeMemberId) {
      return (
        <Navigate
          to={`/luong/${state.activeMemberId}?thang=${month}`}
          replace
        />
      );
    }
    return (
      <section className={s.page}>
        <PageHeader compact backTo="/cai-dat" title="Bảng lương" />
        <NoAccess what="bảng lương" />
      </section>
    );
  }

  const summaries = readMonthPayroll(month);
  const status = getPayrollStatus(month);
  const locked = status === "locked";
  const total = summaries.reduce((sum, summary) => sum + summary.total, 0);
  const plannedTotal = summaries.reduce(
    (sum, summary) => sum + summary.plannedCount,
    0,
  );
  const latestHeld = lastHeldDate(summaries);
  const missing = summaries.filter((summary) => summary.missingRate);
  const missingNames = missing.map((summary) => summary.memberName).join(", ");
  const unpricedSubstitutes = missing.flatMap((summary) =>
    unpricedSubstituteLines(summary).map((line) => ({ summary, line })),
  );

  function lock() {
    try {
      lockPayroll(month);
      setError("");
      setConfirmOpen(false);
    } catch (cause) {
      setConfirmOpen(false);
      setError(
        cause instanceof Error
          ? cause.message
          : "Không chốt được bảng lương, vui lòng thử lại.",
      );
    }
  }

  const statusLabel = locked ? "Đã chốt" : "Nháp · tạm tính";
  const statusTone: PillTone = locked ? "success" : "warning";

  return (
    <main className={s.page}>
      <PageHeader
        compact={!desktop}
        backTo={desktop ? undefined : "/cai-dat"}
        eyebrow="Quản trị workspace"
        title="Bảng lương"
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
              {!locked && summaries.length > 0 && (
                <Button
                  size="md"
                  onClick={() => {
                    setError("");
                    setConfirmOpen(true);
                  }}
                >
                  Chốt bảng lương
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {error && (
        <div role="alert" className={s.bannerError}>
          <span>{error}</span>
          <Button variant="danger" size="md" onClick={lock}>
            Thử lại
          </Button>
        </div>
      )}

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

      {summaries.length === 0 ? (
        <EmptyState title="Chưa có buổi nào trong tháng" mascot="cho">
          <p>Bảng lương sẽ có khi tháng này có buổi dạy.</p>
        </EmptyState>
      ) : (
        <>
          {desktop ? (
            <div className={s.statRow}>
              <Card className={s.statCard}>
                <span className={s.statLabel}>Tổng chi tháng</span>
                <strong className={s.statAmount}>{formatVnd(total)}</strong>
              </Card>
              <Card className={s.statCard}>
                <span className={s.statLabel}>Trạng thái</span>
                <Pill tone={statusTone}>{statusLabel}</Pill>
              </Card>
              <Card className={s.statCard}>
                <span className={s.statLabel}>Buổi dự kiến</span>
                <strong className={s.statAmount}>{plannedTotal} buổi</strong>
              </Card>
            </div>
          ) : (
            <Card className={s.totalCard}>
              <div className={s.totalHead}>
                <span className={s.statLabel}>Tổng chi tháng</span>
                <Pill tone={statusTone}>{statusLabel}</Pill>
              </div>
              <strong className={s.totalAmount}>{formatVnd(total)}</strong>
              <p className={s.meta}>
                {locked
                  ? `Bảng lương ${monthPhrase(month)} đã chốt · không sửa được`
                  : `Tạm tính${latestHeld ? ` đến ${formatDayMonth(latestHeld)}` : ""} · còn ${plannedTotal} buổi dự kiến`}
              </p>
            </Card>
          )}

          {missing.length > 0 && (
            <p className={s.bannerWarning}>
              <span>
                <strong>{missing.length} người chưa đặt đơn giá.</strong>{" "}
                {unpricedSubstitutes.length > 0
                  ? `Các buổi dạy thay của ${missingNames} chưa được tính.`
                  : `Các buổi của ${missingNames} chưa được tính tiền.`}
              </span>
            </p>
          )}

          {desktop ? (
            <Card className={s.tableWrap}>
              <table className={s.table} aria-label={`Bảng lương ${monthTitle(month)}`}>
                <thead>
                  <tr>
                    <th scope="col">Nhân sự</th>
                    <th scope="col">Buổi chính</th>
                    <th scope="col">Trợ giảng</th>
                    <th scope="col">Dạy thay</th>
                    <th scope="col">Điều chỉnh</th>
                    <th scope="col">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((summary) => {
                    const name = summary.memberName;
                    const adjustment = summary.adjustmentTotal;
                    const positions = unpricedPositions(summary);
                    return (
                      <tr key={summary.memberId}>
                        <td>
                          <Link
                            className={s.tableLink}
                            to={`/luong/${summary.memberId}?thang=${month}`}
                          >
                            {name}
                          </Link>
                          {positions.length > 0 && (
                            <span className={s.tableTags}>
                              {positions.map((position) => (
                                <Pill key={position} tone="warning">
                                  Chưa đặt đơn giá{" "}
                                  {position === "main" ? "chính" : "trợ giảng"}
                                </Pill>
                              ))}
                            </span>
                          )}
                        </td>
                        <td>{summary.mainCount}</td>
                        <td>{summary.assistantCount}</td>
                        <td>{substituteCount(summary)}</td>
                        <td
                          className={
                            adjustment > 0
                              ? s.adjPositive
                              : adjustment < 0
                                ? s.adjNegative
                                : s.adjNone
                          }
                        >
                          {adjustment === 0 ? "–" : signedVnd(adjustment)}
                        </td>
                        <td className={s.tableTotal}>
                          {formatVnd(summary.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ) : (
            <div className={s.list}>
              {summaries.map((summary) => {
                const name = summary.memberName;
                const adjustment = summary.adjustmentTotal;
                const positions = unpricedPositions(summary);
                return (
                  <Link
                    key={summary.memberId}
                    to={`/luong/${summary.memberId}?thang=${month}`}
                    className={s.rowLink}
                    aria-label={`Bảng lương ${name}, ${monthTitle(month)}, ${formatVnd(summary.total)}`}
                  >
                    <Card className={s.summaryCard}>
                      <span className={s.avatar} aria-hidden="true">
                        {initials(name)}
                      </span>
                      <div className={s.summaryMain}>
                        <strong className={s.summaryName}>{name}</strong>
                        <span className={s.meta}>
                          {summary.mainCount} chính · {summary.assistantCount} trợ
                          giảng · {substituteCount(summary)} dạy thay
                        </span>
                        {adjustment !== 0 && (
                          <span
                            className={
                              adjustment > 0 ? s.adjPositive : s.adjNegative
                            }
                          >
                            {signedVnd(adjustment)} điều chỉnh
                          </span>
                        )}
                        {positions.map((position) => (
                          <Pill key={position} tone="warning">
                            Chưa đặt đơn giá{" "}
                            {position === "main" ? "chính" : "trợ giảng"}
                          </Pill>
                        ))}
                      </div>
                      <span className={s.amountBox}>
                        <strong>{formatVnd(summary.total)}</strong>
                      </span>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {!desktop && !locked && summaries.length > 0 && (
        <div className={s.stickyBar}>
          <Button
            size="lg"
            onClick={() => {
              setError("");
              setConfirmOpen(true);
            }}
          >
            Chốt bảng lương
          </Button>
        </div>
      )}

      <Modal
        title={`Chốt bảng lương ${monthPhrase(month)}?`}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
      >
        <div className={s.form}>
          <p className={s.note}>
            Sau khi chốt, bảng lương {monthPhrase(month)} bị khoá: không sửa được
            đơn giá, buổi hay điều chỉnh.
            {missing.length > 0
              ? ` ${missingNames} vẫn chưa có đơn giá.`
              : ""}
          </p>
          <div className={s.modalActions}>
            <Button size="lg" onClick={lock}>
              Chốt bảng lương
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setConfirmOpen(false)}>
              Huỷ
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

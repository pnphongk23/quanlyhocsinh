import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import {
  sendTuitionNoticeBatch,
  setClassFee,
} from "../../data/repositories/tuition";
import { useStore } from "../../data/store";
import { classTotals, invoicesForClass, type TuitionInvoice } from "../../data/tuition";
import { todayISO } from "../../shared/format";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { useOnline } from "../../shared/hooks/useOnline";
import { SaveStatus, useSaveStatus } from "../../shared/SaveStatus";
import {
  Button,
  Card,
  EmptyState,
  Icon,
  Input,
  Modal,
  NoAccess,
  PageHeader,
  Pill,
  Segmented,
} from "../../shared/ui";
import {
  TUITION_FILTERS,
  TUITION_STATUS_LABEL as STATUS_LABEL,
  TUITION_STATUS_TONE as STATUS_TONE,
  filterInvoices,
  formatMoney,
  initials,
  monthLabel,
  readFilter,
  readMonth,
  shiftMonth,
  shortMonthLabel,
} from "./tuitionFormat";
import s from "./tuition.module.css";

/** Công tắc bật/tắt kiểu dùng ở trang điểm (TestScoresPage). */
function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className={s.switchRow}>
      <label className={s.switchText} htmlFor={id}>
        <strong>{label}</strong>
        <span className={s.hint}>{hint}</span>
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={s.switch + (checked ? " " + s.switchOn : "")}
        onClick={() => onChange(!checked)}
      >
        <span className={s.switchKnob} />
      </button>
    </div>
  );
}

/** Màn Học phí (Admin): chọn tháng + lớp, tổng thu, lọc trạng thái, danh sách. */
export default function TuitionPage() {
  const state = useStore();
  const access = useAccess();
  const desktop = useIsDesktop();
  const online = useOnline();
  const save = useSaveStatus();
  const [params, setParams] = useSearchParams();
  const month = readMonth(params.get("thang"));
  const filter = readFilter(params.get("loc"));
  const classes = state.classes.filter((item) => item.status === "active");
  const [classChoice, setClassChoice] = useState(classes[0]?.id ?? "");
  const [feeOpen, setFeeOpen] = useState(false);
  const [feeInput, setFeeInput] = useState("");
  const [chargeAbsent, setChargeAbsent] = useState(true);
  const [chargeMakeup, setChargeMakeup] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [message, setMessage] = useState("");

  const classId = classes.some((item) => item.id === classChoice)
    ? classChoice
    : (classes[0]?.id ?? "");
  const klass = classes.find((item) => item.id === classId);

  if (!access.isAdmin) {
    return (
      <section className={s.page}>
        <PageHeader compact backTo="/cai-dat" title="Học phí" />
        <NoAccess what="học phí" />
      </section>
    );
  }

  const studentById = new Map(state.students.map((item) => [item.id, item]));
  const invoices = classId ? invoicesForClass(state, classId, month) : [];
  const visible = filterInvoices(invoices, filter);
  const totals = classTotals(invoices);
  const debtBefore = invoices.reduce((sum, invoice) => sum + invoice.debtBefore, 0);
  const fee = state.classFees.find((item) => item.classId === classId);
  const hasStudents = state.students.some((item) => item.classId === classId);
  const needNotice = invoices.filter(
    (invoice) =>
      invoice.status !== "nofee" &&
      (invoice.remaining > 0 || !invoice.notice || invoice.changedSinceNotice),
  );

  function changeMonth(offset: number) {
    setParams(
      { thang: shiftMonth(month, offset), loc: filter },
      { replace: true },
    );
  }

  function goCurrentMonth() {
    setParams({ thang: todayISO().slice(0, 7), loc: filter }, { replace: true });
  }

  function changeFilter(next: string) {
    setParams({ thang: month, loc: next }, { replace: true });
  }

  function openFeeModal() {
    setFeeInput(fee ? String(fee.feePerSession) : "");
    setChargeAbsent(fee?.chargeAbsent ?? true);
    setChargeMakeup(fee?.chargeMakeup ?? true);
    setModalError("");
    setFeeOpen(true);
  }

  function saveFee() {
    if (!feeInput.trim()) {
      setModalError("Nhập học phí mỗi buổi của lớp.");
      save.setStatus("error");
      return;
    }
    const value = Number(feeInput.replace(/[.\s]/g, ""));
    if (!Number.isInteger(value) || value < 0) {
      setModalError("Học phí mỗi buổi phải là số không âm.");
      save.setStatus("error");
      return;
    }
    try {
      setClassFee(classId, value, chargeAbsent, chargeMakeup);
      setFeeOpen(false);
      setModalError("");
      setError("");
      setMessage("Đã lưu học phí của lớp.");
      save.clearStatus();
    } catch (cause) {
      setModalError(
        cause instanceof Error ? cause.message : "Không lưu được học phí lớp.",
      );
      save.setStatus("error");
    }
  }

  function requestSend() {
    setSendError("");
    if (!online) {
      setSendError("Không gửi được, cần kết nối mạng.");
      return;
    }
    if (needNotice.length === 0) return;
    setConfirmOpen(true);
  }

  function sendAll() {
    try {
      // Một commit cho cả lớp: lỗi lưu thì không học sinh nào bị đổi.
      sendTuitionNoticeBatch(
        needNotice.map((invoice) => ({
          studentId: invoice.studentId,
          month,
          amount: invoice.due,
        })),
      );
      setConfirmOpen(false);
      setError("");
      setSendError("");
      setMessage(`Đã gửi thông báo học phí cho ${needNotice.length} học sinh.`);
      save.clearStatus();
    } catch (cause) {
      setConfirmOpen(false);
      setMessage("");
      setSendError(
        cause instanceof Error
          ? cause.message
          : "Không gửi được, cần kết nối mạng.",
      );
      save.setStatus("error");
    }
  }

  const tags = (invoice: TuitionInvoice) => (
    <div className={s.tags}>
      <Pill tone={STATUS_TONE[invoice.status]}>
        {STATUS_LABEL[invoice.status]}
      </Pill>
      {invoice.changedSinceNotice && <Pill tone="warning">Cần gửi lại</Pill>}
    </div>
  );

  const desktopToolbar = (
    <div className={s.toolbar}>
      <div className={s.toolbarClass}>
        <select
          className={s.classSelect}
          aria-label="Chọn lớp"
          value={classId}
          onChange={(event) => setClassChoice(event.target.value)}
        >
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={18} />
      </div>
      <button
        type="button"
        className={s.toolbarNav}
        aria-label="Tháng trước"
        onClick={() => changeMonth(-1)}
      >
        <Icon name="back" size={20} />
      </button>
      <strong className={s.toolbarMonth}>{monthLabel(month)}</strong>
      <button
        type="button"
        className={s.toolbarNav}
        aria-label="Tháng sau"
        onClick={() => changeMonth(1)}
      >
        <Icon name="chevron-right" size={20} />
      </button>
      {fee && (
        <Button variant="secondary" size="md" onClick={openFeeModal}>
          Sửa học phí
        </Button>
      )}
      <Button
        size="md"
        disabled={needNotice.length === 0}
        onClick={requestSend}
      >
        Gửi thông báo cả lớp
      </Button>
    </div>
  );

  return (
    <main className={s.page}>
      <PageHeader
        compact={!desktop}
        backTo={desktop ? undefined : "/cai-dat"}
        eyebrow="Quản trị workspace"
        title="Học phí"
        actions={desktop && classes.length > 0 ? desktopToolbar : undefined}
      />

      {message && (
        <p role="status" className={s.notice + " " + s.noticeSuccess}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {sendError && (
        <div role="alert" className={s.bannerError}>
          <span>{sendError}</span>
          <Button variant="danger" size="md" onClick={requestSend}>
            Thử lại
          </Button>
        </div>
      )}
      <SaveStatus status={save.status} />

      {!desktop && (
        <Card className={s.monthCard}>
          <div className={s.monthHead}>
            <button
              type="button"
              className={s.navButton}
              aria-label="Tháng trước"
              onClick={() => changeMonth(-1)}
            >
              <Icon name="back" />
            </button>
            <h2 className={s.monthTitle}>{monthLabel(month)}</h2>
            <button
              type="button"
              className={s.navButton}
              aria-label="Tháng sau"
              onClick={() => changeMonth(1)}
            >
              <Icon name="chevron-right" />
            </button>
        </div>
        {month !== todayISO().slice(0, 7) && (
            <button type="button" className={s.monthJump} onClick={goCurrentMonth}>
              Về tháng này
            </button>
          )}
        </Card>
      )}

      {classes.length === 0 ? (
        <EmptyState title="Chưa có lớp đang hoạt động" mascot="cho">
          <p>Mở một lớp đang hoạt động để bắt đầu tính học phí.</p>
        </EmptyState>
      ) : (
        <>
          {!desktop && (
            <div className={s.classList}>
              <label className={s.classLabel} htmlFor="tuition-class">
                Lớp
              </label>
              <div className={s.classSelectWrap}>
                <select
                  id="tuition-class"
                  className={s.classSelect}
                  value={classId}
                  onChange={(event) => setClassChoice(event.target.value)}
                >
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <Icon name="chevron-down" size={20} />
              </div>
            </div>
          )}

          {!fee ? (
            <EmptyState title="Lớp chưa đặt học phí" mascot="cho">
              <p>Đặt học phí mỗi buổi để tính phiếu học phí cho học sinh.</p>
              <Button size="md" onClick={openFeeModal}>
                Đặt học phí
              </Button>
            </EmptyState>
          ) : (
            <>
              {!desktop && (
                <Card className={s.feeCard}>
                  <div className={s.feeMain}>
                    <strong>{formatMoney(fee.feePerSession)}/buổi</strong>
                    <span className={s.hint}>
                      Tính phí vắng không phép:{" "}
                      {fee.chargeAbsent ? "có" : "không"} · Tính phí học bù:{" "}
                      {fee.chargeMakeup ? "có" : "không"}
                    </span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={openFeeModal}>
                    Sửa
                  </Button>
                </Card>
              )}

              {desktop ? (
                <>
                  <div className={s.statRow}>
                    <Card className={s.statCard}>
                      <span className={s.statLabel}>Phải thu</span>
                      <strong className={s.statAmount}>
                        {formatMoney(totals.due)}
                      </strong>
                    </Card>
                    <Card className={s.statCard}>
                      <span className={s.statLabel}>Đã thu</span>
                      <strong className={s.statAmount}>
                        {formatMoney(totals.paid)}
                      </strong>
                    </Card>
                    <Card className={s.statCard}>
                      <span className={s.statLabel}>Còn nợ</span>
                      <strong
                        className={
                          totals.remaining > 0 ? s.statDue : s.statAmount
                        }
                      >
                        {formatMoney(totals.remaining)}
                      </strong>
                    </Card>
                    <Card className={s.statCard}>
                      <span className={s.statLabel}>Học phí lớp</span>
                      <strong className={s.statAmount}>
                        {formatMoney(fee.feePerSession)}/buổi
                      </strong>
                      <span className={s.feePolicy}>
                        Vắng không phép:{" "}
                        {fee.chargeAbsent ? "tính phí" : "không tính"} · Học bù:{" "}
                        {fee.chargeMakeup ? "tính phí" : "không tính"}
                      </span>
                    </Card>
                  </div>
                  <p className={s.debtNote}>
                    Nợ tháng trước: <strong>{formatMoney(debtBefore)}</strong> —
                    không gồm trong Còn nợ của tháng này.
                  </p>
                </>
              ) : (
                <Card className={s.totals}>
                  <div className={s.totalsHead}>
                    <h2 className={s.totalTitle}>Học phí {monthLabel(month)}</h2>
                    {invoices.some((invoice) => invoice.provisional) && (
                      <Pill tone="primary">Tạm tính</Pill>
                    )}
                  </div>
                  <div className={s.totalGrid}>
                    <div className={s.totalItem}>
                      <span>Phải thu</span>
                      <strong>{formatMoney(totals.due)}</strong>
                    </div>
                    <div className={s.totalItem}>
                      <span>Đã thu</span>
                      <strong>{formatMoney(totals.paid)}</strong>
                    </div>
                    <div className={s.totalItem}>
                      <span>Còn nợ</span>
                      <strong className={totals.remaining > 0 ? s.totalDue : ""}>
                        {formatMoney(totals.remaining)}
                      </strong>
                    </div>
                  </div>
                  <p className={s.debtNote}>
                    Nợ tháng trước (riêng):{" "}
                    <strong>{formatMoney(debtBefore)}</strong>
                  </p>
                  {invoices.some((invoice) => invoice.provisional) && (
                    <p className={s.hint}>
                      Tháng chưa hết, số tiền có thể đổi.
                    </p>
                  )}
                </Card>
              )}

              {desktop && invoices.some((invoice) => invoice.provisional) && (
                <p className={s.provisionalLine}>
                  <Pill tone="primary">Tạm tính</Pill>
                  <span>Tháng chưa hết, số tiền có thể đổi.</span>
                </p>
              )}

              <div className={s.filters} role="group" aria-label="Lọc trạng thái">
                <Segmented
                  label="Lọc theo trạng thái"
                  value={filter}
                  onChange={changeFilter}
                  options={TUITION_FILTERS}
                />
              </div>

              {!hasStudents ? (
                <EmptyState title="Lớp chưa có học sinh" mascot="cho">
                  <p>Thêm học sinh vào lớp để tính học phí.</p>
                </EmptyState>
              ) : invoices.length === 0 ? (
                <EmptyState title="Tháng này chưa có học phí" mascot="cho">
                  <p>Chưa có buổi tính phí hoặc lần thu nào của lớp trong tháng.</p>
                </EmptyState>
              ) : visible.length === 0 ? (
                <EmptyState title="Không có học sinh trong nhóm này">
                  <p>Chọn “Tất cả” để xem cả lớp.</p>
                </EmptyState>
              ) : desktop ? (
                <Card className={s.tableWrap}>
                  <table
                    className={s.table}
                    aria-label={`Học phí ${klass?.name ?? "lớp"}, ${monthLabel(month)}`}
                  >
                    <thead>
                      <tr>
                        <th scope="col">Học sinh</th>
                        <th scope="col">Buổi tính phí</th>
                        <th scope="col">Phải thu</th>
                        <th scope="col">Đã thu</th>
                        <th scope="col">Còn lại</th>
                        <th scope="col">Nợ tháng trước</th>
                        <th scope="col">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((invoice) => {
                        const student = studentById.get(invoice.studentId);
                        return (
                          <tr key={invoice.studentId}>
                            <td>
                              <Link
                                className={s.tableLink}
                                to={`/hoc-phi/${invoice.studentId}?thang=${month}`}
                              >
                                {student?.name ?? "Học sinh"}
                              </Link>
                            </td>
                            <td>{invoice.chargedCount}</td>
                            <td>{formatMoney(invoice.due)}</td>
                            <td>{formatMoney(invoice.paid)}</td>
                            <td>{formatMoney(invoice.remaining)}</td>
                            <td
                              className={
                                invoice.debtBefore > 0 ? s.debtCell : s.debtNone
                              }
                            >
                              {invoice.debtBefore > 0
                                ? formatMoney(invoice.debtBefore)
                                : "–"}
                            </td>
                            <td>{tags(invoice)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              ) : (
                <div className={s.list}>
                  {visible.map((invoice) => {
                    const student = studentById.get(invoice.studentId);
                    return (
                      <Link
                        key={invoice.studentId}
                        to={`/hoc-phi/${invoice.studentId}?thang=${month}`}
                        className={s.rowLink}
                        aria-label={`${student?.name ?? "Học sinh"}, ${STATUS_LABEL[invoice.status]}, phải thu ${formatMoney(invoice.due)}`}
                      >
                        <Card className={s.row}>
                          <span className={s.avatar} aria-hidden="true">
                            {initials(student?.name ?? "?")}
                          </span>
                          <div className={s.rowMain}>
                            <strong>{student?.name ?? "Học sinh"}</strong>
                            <span>
                              {invoice.chargedCount} buổi tính phí ·{" "}
                              {formatMoney(invoice.due)}
                            </span>
                            {invoice.debtBefore > 0 && (
                              <span className={s.debt}>
                                Nợ {shortMonthLabel(shiftMonth(month, -1))}:{" "}
                                {formatMoney(invoice.debtBefore)}
                              </span>
                            )}
                            {tags(invoice)}
                          </div>
                          <Icon name="chevron-right" size={18} />
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}

              {!desktop && (
                <div className={s.stickyBar}>
                  <Button
                    size="lg"
                    disabled={needNotice.length === 0}
                    onClick={requestSend}
                  >
                    Gửi thông báo cả lớp
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <Modal
        title="Sửa học phí lớp"
        open={feeOpen}
        onClose={() => setFeeOpen(false)}
        sheet={!desktop}
        footer={
          <Button size="lg" onClick={saveFee}>
            Lưu học phí lớp
          </Button>
        }
      >
        <div className={s.form}>
          <p className={s.note}>
            Học phí lớp · {klass?.name ?? "lớp đã chọn"}. Áp dụng cho các tháng
            chưa gửi thông báo. Phải thu làm tròn đến 1.000 đ.
          </p>
          <div className={s.moneyField}>
            <Input
              label="Học phí mỗi buổi"
              inputMode="numeric"
              className={s.moneyInput}
              value={feeInput}
              onChange={(event) => setFeeInput(event.target.value)}
            />
            <span className={s.suffix}>đ/buổi</span>
          </div>
          <div className={s.switchList}>
            <SwitchRow
              id="class-fee-absent"
              label="Tính phí buổi vắng không phép"
              hint="Vắng có phép luôn không tính"
              checked={chargeAbsent}
              onChange={setChargeAbsent}
            />
            <SwitchRow
              id="class-fee-makeup"
              label="Tính phí buổi học bù"
              hint="Lớp tắt thì buổi học bù miễn phí"
              checked={chargeMakeup}
              onChange={setChargeMakeup}
            />
          </div>
          <SaveStatus status={save.status} />
          {modalError && (
            <p role="alert" className={s.error}>
              {modalError}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        title="Gửi thông báo học phí?"
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
      >
        <div className={s.form}>
          <p className={s.note}>
            Gửi phiếu học phí {monthLabel(month)} cho phụ huynh của{" "}
            {needNotice.length} học sinh. Cần kết nối mạng.
          </p>
          <div className={s.formActions}>
            <Button size="lg" onClick={sendAll}>
              Gửi thông báo
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setConfirmOpen(false)}
            >
              Huỷ
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

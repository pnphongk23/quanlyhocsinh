import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import {
  recordTuitionPayment,
  removeTuitionPayment,
  sendTuitionNotice,
  setStudentDiscount,
} from "../../data/repositories/tuition";
import { useStore } from "../../data/store";
import { invoiceFor } from "../../data/tuition";
import { formatDate, formatDayMonth, formatTime, todayISO } from "../../shared/format";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { useOnline } from "../../shared/hooks/useOnline";
import { SaveStatus, useSaveStatus } from "../../shared/SaveStatus";
import {
  Button,
  Card,
  EmptyState,
  Input,
  LinkButton,
  Modal,
  NoAccess,
  PageHeader,
  Pill,
  Segmented,
} from "../../shared/ui";
import {
  TUITION_STATUS_LABEL as STATUS_LABEL,
  TUITION_STATUS_TONE as STATUS_TONE,
  formatMoney,
  monthLabel,
  monthPhrase,
  readMonth,
} from "./tuitionFormat";
import { tuitionMonthRows } from "./tuitionMonth";
import s from "./tuition.module.css";

const METHOD_LABEL = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
} as const;

/** Phiếu học phí một học sinh trong tháng: buổi, giảm giá, các lần thu, thông báo. */
export default function TuitionDetailPage() {
  const state = useStore();
  const access = useAccess();
  const desktop = useIsDesktop();
  const online = useOnline();
  const save = useSaveStatus();
  const { studentId = "" } = useParams();
  const [params] = useSearchParams();
  const month = readMonth(params.get("thang"));
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO);
  const [payMethod, setPayMethod] = useState<"cash" | "transfer">("cash");
  const [payNote, setPayNote] = useState("");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [modalError, setModalError] = useState("");
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [message, setMessage] = useState("");

  const student = state.students.find((item) => item.id === studentId);
  const klass = state.classes.find((item) => item.id === student?.classId);

  if (!access.isAdmin) {
    return (
      <section className={s.page}>
        <PageHeader compact backTo="/hoc-phi" title="Phiếu học phí" />
        <NoAccess what="học phí" />
      </section>
    );
  }

  if (!student) {
    return (
      <section className={s.page}>
        <PageHeader compact backTo="/hoc-phi" title="Phiếu học phí" />
        <EmptyState title="Không tìm thấy học sinh">
          <p>Học sinh có thể đã bị xoá hoặc không còn trong lớp.</p>
          <LinkButton to="/hoc-phi">Về danh sách học phí</LinkButton>
        </EmptyState>
      </section>
    );
  }

  const invoice = invoiceFor(state, student.id, month);
  const studentKey = student.id;
  const rows = tuitionMonthRows(state, student.id, month);
  const payments = state.tuitionPayments
    .filter((item) => item.studentId === student.id && item.month === month)
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt) || a.id.localeCompare(b.id));
  const exactDue = (invoice.gross * (100 - invoice.discountPercent)) / 100;

  function openPayModal() {
    setPayAmount(invoice.remaining > 0 ? String(invoice.remaining) : "");
    setPayDate(todayISO());
    setPayMethod("cash");
    setPayNote("");
    setModalError("");
    setPayOpen(true);
  }

  function submitPayment() {
    const amount = Number(payAmount.replace(/[.\s]/g, ""));
    if (!Number.isInteger(amount) || amount <= 0) {
      setModalError("Số tiền thu phải là số lớn hơn 0.");
      save.setStatus("error");
      return;
    }
    if (amount > invoice.remaining) {
      setModalError(
        `Số tiền vượt quá còn lại (${formatMoney(invoice.remaining)}).`,
      );
      save.setStatus("error");
      return;
    }
    try {
      recordTuitionPayment({
        studentId: studentKey,
        month,
        amount,
        paidAt: payDate,
        method: payMethod,
        note: payNote.trim(),
      });
      setPayOpen(false);
      setModalError("");
      setError("");
      setMessage("Đã ghi nhận thu học phí.");
      save.clearStatus();
    } catch (cause) {
      setModalError(
        cause instanceof Error ? cause.message : "Không ghi nhận được lần thu.",
      );
      save.setStatus("error");
    }
  }

  function openDiscountModal() {
    setDiscountInput(String(invoice.discountPercent));
    setModalError("");
    setDiscountOpen(true);
  }

  function saveDiscount() {
    const percent = Number(discountInput.replace(/[.\s]/g, ""));
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
      setModalError("Phần trăm giảm phải là số từ 0 đến 100.");
      save.setStatus("error");
      return;
    }
    try {
      setStudentDiscount(studentKey, percent);
      setDiscountOpen(false);
      setModalError("");
      setError("");
      setMessage(percent > 0 ? `Đã giảm ${percent}% học phí.` : "Đã bỏ giảm học phí.");
      save.clearStatus();
    } catch (cause) {
      setModalError(
        cause instanceof Error ? cause.message : "Không lưu được mức giảm.",
      );
      save.setStatus("error");
    }
  }

  function confirmRemove() {
    if (!removingId) return;
    try {
      removeTuitionPayment(removingId);
      setRemovingId(null);
      setError("");
      setMessage("Đã xoá lần thu.");
      save.clearStatus();
    } catch (cause) {
      setRemovingId(null);
      setMessage("");
      setError(cause instanceof Error ? cause.message : "Không xoá được lần thu.");
      save.setStatus("error");
    }
  }

  function requestSend() {
    setSendError("");
    if (!online) {
      setSendError("Không gửi được, cần kết nối mạng.");
      return;
    }
    try {
      sendTuitionNotice(studentKey, month, invoice.due);
      setError("");
      setMessage("Đã gửi thông báo học phí cho phụ huynh.");
      save.clearStatus();
    } catch (cause) {
      setMessage("");
      setSendError(
        cause instanceof Error
          ? cause.message
          : "Không gửi được, cần kết nối mạng.",
      );
      save.setStatus("error");
    }
  }

  return (
    <main className={s.page}>
      <PageHeader
        compact
        backTo={`/hoc-phi?thang=${month}`}
        eyebrow={`${klass?.name ?? "Lớp"} · Học phí ${monthPhrase(month)}`}
        title={student.name}
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

      <Card className={s.summary}>
        <div className={s.summaryHead}>
          <span className={s.summaryLabel}>
            Phải thu · {invoice.chargedCount} buổi ×{" "}
            {formatMoney(invoice.feePerSession)}
          </span>
          <Pill tone={STATUS_TONE[invoice.status]}>
            {STATUS_LABEL[invoice.status]}
          </Pill>
        </div>
        <strong className={s.summaryAmount}>{formatMoney(invoice.due)}</strong>
        <dl className={s.summaryRows}>
          <div className={s.summaryRow}>
            <dt>Đã thu</dt>
            <dd>{formatMoney(invoice.paid)}</dd>
          </div>
          <div className={s.summaryRow}>
            <dt>Còn lại</dt>
            <dd className={invoice.remaining > 0 ? s.totalDue : ""}>
              {formatMoney(invoice.remaining)}
            </dd>
          </div>
          <div className={s.summaryRow}>
            <dt>Công nợ tháng trước</dt>
            <dd>{formatMoney(invoice.debtBefore)}</dd>
          </div>
        </dl>
        {invoice.provisional && (
          <p className={s.provisional}>
            <Pill tone="primary">Tạm tính</Pill>
            <span>Tháng chưa hết, số buổi có thể đổi.</span>
          </p>
        )}
        {invoice.changedSinceNotice && (
          <p className={s.noticeWarning}>Số tiền đã thay đổi, cần gửi lại.</p>
        )}
        <p className={s.formula}>
          {invoice.chargedCount} × {formatMoney(invoice.feePerSession)}
          {invoice.discountPercent > 0
            ? ` × (1 − ${invoice.discountPercent}%)`
            : ""}{" "}
          = {formatMoney(invoice.due)}
        </p>
        <p className={s.hint}>
          Phải thu làm tròn đến 1.000 đ
          {invoice.discountPercent > 0
            ? ` — trước làm tròn ${formatMoney(exactDue)}`
            : ""}
          . Công nợ tháng trước không gồm trong số phải thu này.
        </p>
        {invoice.notice && (
          <p className={s.hint}>
            Đã gửi thông báo {formatDate(invoice.notice.sentAt)}{" "}
            {formatTime(invoice.notice.sentAt)} với số tiền{" "}
            {formatMoney(invoice.notice.amount)}.
          </p>
        )}
        {invoice.feePerSession === 0 && (
          <p className={s.notice}>
            Lớp chưa đặt học phí mỗi buổi nên tháng này không tính phí.
          </p>
        )}
      </Card>

      <Card className={s.discountCard}>
        <h2 className={s.sectionTitle}>Giảm học phí</h2>
        <span className={s.discountValue}>{invoice.discountPercent}%</span>
        <Button variant="secondary" size="sm" onClick={openDiscountModal}>
          Sửa
        </Button>
      </Card>

      <Card className={s.block}>
        <h2 className={s.sectionTitle}>Buổi trong tháng</h2>
        {rows.length === 0 ? (
          <p className={s.note}>Tháng này chưa có buổi học nào của lớp.</p>
        ) : (
          <ul className={s.sessionList}>
            {rows.map((row) => (
              <li key={row.session.id} className={s.sessionRow}>
                <span className={s.sessionDate}>
                  {formatDayMonth(row.session.date)}
                </span>
                <span className={s.tags}>
                  <Pill tone={row.tone}>{row.label}</Pill>
                  {row.makeup && <Pill tone="primary">Học bù</Pill>}
                </span>
                <span
                  className={row.charged ? s.sessionAmount : s.sessionZero}
                >
                  {row.charged ? formatMoney(invoice.feePerSession) : "0 đ"}
                </span>
                <span className={s.sessionNote}>{row.note}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className={s.block}>
        <h2 className={s.sectionTitle}>Các lần thu</h2>
        {payments.length === 0 ? (
          <p className={s.note}>Chưa ghi nhận lần thu nào trong tháng này.</p>
        ) : (
          <ul className={s.payments}>
            {payments.map((payment) => (
              <li key={payment.id} className={s.payment}>
                <div className={s.paymentMain}>
                  <div className={s.paymentTop}>
                    <strong>
                      {formatDate(payment.paidAt)} · {METHOD_LABEL[payment.method]}
                    </strong>
                    <span className={s.paymentAmount}>
                      {formatMoney(payment.amount)}
                    </span>
                  </div>
                  {payment.note && (
                    <span className={s.paymentNote}>{payment.note}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemovingId(payment.id)}
                  aria-label={`Xoá lần thu ${formatMoney(payment.amount)}`}
                >
                  Xoá
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className={s.stickyBar}>
        <div
          className={
            s.footerActions +
            (invoice.remaining > 0 ? "" : " " + s.footerActionsSingle)
          }
        >
          {invoice.remaining > 0 && (
            <Button size="lg" onClick={openPayModal}>
              Ghi nhận thu
            </Button>
          )}
          <Button
            variant={invoice.remaining > 0 ? "secondary" : "primary"}
            size="lg"
            onClick={requestSend}
          >
            Gửi thông báo
          </Button>
        </div>
      </div>

      <Modal
        title="Ghi nhận thu"
        open={payOpen}
        onClose={() => setPayOpen(false)}
        sheet={!desktop}
        footer={
          <Button size="lg" onClick={submitPayment}>
            Lưu khoản thu
          </Button>
        }
      >
        <div className={s.form}>
          <p className={s.note}>
            {student.name} · {monthLabel(month)} · còn thiếu{" "}
            {formatMoney(invoice.remaining)}
          </p>
          <div className={s.moneyField}>
            <Input
              label="Số tiền"
              inputMode="numeric"
              className={s.moneyInput}
              value={payAmount}
              onChange={(event) => setPayAmount(event.target.value)}
            />
            <span className={s.suffix}>đ</span>
          </div>
          <Input
            label="Ngày thu"
            type="date"
            value={payDate}
            onChange={(event) => setPayDate(event.target.value)}
          />
          <div className={s.field}>
            <span className={s.label}>Hình thức</span>
            <Segmented
              label="Hình thức thu"
              value={payMethod}
              onChange={(value) =>
                setPayMethod(value === "transfer" ? "transfer" : "cash")
              }
              options={[
                { value: "cash", label: METHOD_LABEL.cash },
                { value: "transfer", label: METHOD_LABEL.transfer },
              ]}
            />
          </div>
          <Input
            label="Ghi chú"
            placeholder="Không bắt buộc"
            value={payNote}
            onChange={(event) => setPayNote(event.target.value)}
          />
          <SaveStatus status={save.status} />
          {modalError && (
            <p role="alert" className={s.error}>
              {modalError}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        title="Giảm học phí"
        open={discountOpen}
        onClose={() => setDiscountOpen(false)}
        sheet={!desktop}
        footer={
          <Button size="lg" onClick={saveDiscount}>
            Lưu giảm học phí
          </Button>
        }
      >
        <div className={s.form}>
          <p className={s.note}>
            Giảm theo % học phí của {student.name}. Nhập 0 để bỏ giảm.
          </p>
          <div className={s.moneyField}>
            <Input
              label="Phần trăm giảm"
              inputMode="numeric"
              className={s.moneyInput}
              value={discountInput}
              onChange={(event) => setDiscountInput(event.target.value)}
            />
            <span className={s.suffix}>%</span>
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
        title="Xoá lần thu?"
        open={Boolean(removingId)}
        onClose={() => setRemovingId(null)}
      >
        <div className={s.form}>
          <p className={s.note}>
            Bản ghi thu này sẽ bị xoá khỏi phiếu {monthLabel(month)} của{" "}
            {student.name}. Bạn có thể ghi nhận lại sau.
          </p>
          <div className={s.formActions}>
            <Button variant="danger" size="lg" onClick={confirmRemove}>
              Xoá lần thu
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setRemovingId(null)}
            >
              Giữ nguyên
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

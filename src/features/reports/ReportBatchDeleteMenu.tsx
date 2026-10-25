import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ReportBatch } from "../../data/types";
import { deleteReportBatch } from "../../data/repositories/reports";
import { useOnline } from "../../shared/hooks/useOnline";
import { Icon } from "../../shared/ui";
import { ConfirmDialog } from "../classes/ConfirmDialog";
import { ClassOptionsMenu } from "../classes/ClassOptionsMenu";
import styles from "./ReportsPage.module.css";

export function reportBatchDeleteMessage(hasPublished: boolean): string {
  return hasPublished
    ? "Phụ huynh sẽ không còn thấy báo cáo đã phát hành trong đợt này. Dữ liệu vẫn được giữ."
    : "Bản nháp của tất cả học sinh trong đợt này sẽ bị ẩn. Dữ liệu vẫn được giữ.";
}

export function ReportBatchDeleteMenu({ batch, hasPublished }: { batch: ReportBatch; hasPublished: boolean }) {
  const online = useOnline();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete() {
    if (busy || !online) return;
    setBusy(true);
    setError("");
    try {
      await deleteReportBatch(batch.id);
      setConfirmOpen(false);
      if (new URLSearchParams(location.search).get("dot") === batch.id) {
        navigate(location.pathname, { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xoá báo cáo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.batchActions}>
      <button
        type="button"
        className={styles.batchMenuButton}
        aria-label="Thêm tùy chọn báo cáo"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <Icon name="more" size={20} />
      </button>
      <ClassOptionsMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[{
          label: "Xoá báo cáo",
          icon: "archive",
          danger: true,
            disabled: !online,
          onSelect: () => {
            setMenuOpen(false);
            setError("");
            setConfirmOpen(true);
          },
        }]}
      />
      {!online && <span role="status" className={styles.offlineHint}>Cần mạng để xoá</span>}
      <ConfirmDialog
        open={confirmOpen}
        title="Xoá báo cáo?"
        message={reportBatchDeleteMessage(hasPublished)}
        error={error}
        actions={[
          { label: "Xoá báo cáo", variant: "danger", busy, onClick: () => void confirmDelete() },
          { label: "Huỷ", variant: "neutral", disabled: busy, onClick: () => setConfirmOpen(false) },
        ]}
        onDismiss={() => { if (!busy) setConfirmOpen(false); }}
      />
    </div>
  );
}

export default ReportBatchDeleteMenu;

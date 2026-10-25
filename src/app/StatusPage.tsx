import { Button, EmptyState, LinkButton } from "../shared/ui";
import styles from "./shell.module.css";

/** Trang trạng thái toàn màn (không tìm thấy, lỗi mở màn) có khung, token và nút về trang đầu. */
export function StatusPage({ title, onReload }: { title: string; onReload?: () => void }) {
  return (
    <main className={styles.statusPage}>
      <EmptyState title={title}>
        {onReload && <Button onClick={onReload}>Tải lại</Button>}
        <LinkButton to="/">Về trang đầu</LinkButton>
      </EmptyState>
    </main>
  );
}
export default StatusPage;

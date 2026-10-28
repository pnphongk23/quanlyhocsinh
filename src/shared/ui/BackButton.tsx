import s from "./ui.module.css";
import { Icon } from "./Icon";

/** Nút quay lại dạng chevron, cùng kiểu với PageHeader (dùng khi quay lại không phải điều hướng route). */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={s.backButton} aria-label="Quay lại" onClick={onClick}>
      <Icon name="back" />
    </button>
  );
}
export default BackButton;

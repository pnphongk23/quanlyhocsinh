import s from "./ui.module.css";
export function Spinner() {
  return <span role="status" aria-label="Đang tải" className={s.spinner} />;
}
export default Spinner;

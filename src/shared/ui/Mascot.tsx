import s from "./ui.module.css";

export type MascotPose =
  | "main"
  | "vui"
  | "dong-vien"
  | "cho"
  | "chao"
  | "sao-1"
  | "sao-2"
  | "sao-3";

/** Tư thế theo mức sao nhận xét; chưa chọn sao thì Mít đang chờ. */
export function starPose(level: 1 | 2 | 3 | null): MascotPose {
  return level === null ? "cho" : (`sao-${level}` as MascotPose);
}

/** Mít, gà con mascot. Ảnh trang trí nên bỏ qua với trình đọc màn hình. */
export function Mascot({
  pose = "main",
  size = 96,
  className,
}: {
  pose?: MascotPose;
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={className ? `${s.mascot} ${className}` : s.mascot}
      src={`${import.meta.env.BASE_URL}mascot/mit-${pose}.png`}
      alt=""
      aria-hidden="true"
      height={size}
      style={{ height: size }}
      draggable={false}
    />
  );
}
export default Mascot;

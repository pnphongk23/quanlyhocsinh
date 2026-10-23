import s from "./ui.module.css";

export type MascotPose =
  | "main"
  | "vui"
  | "dong-vien"
  | "cho"
  | "chao"
  | "dang-tai"
  | "avatar"
  | "sao-1"
  | "sao-2"
  | "sao-3";

/** Tên file SVG của từng tư thế (khen = tư thế vui/thành công). */
const FILES: Record<MascotPose, string> = {
  main: "main",
  vui: "khen",
  "dong-vien": "dong-vien",
  cho: "cho",
  chao: "chao",
  "dang-tai": "dang-tai",
  avatar: "avatar",
  "sao-1": "sao-1",
  "sao-2": "sao-2",
  "sao-3": "sao-3",
};

/** Tư thế theo mức sao nhận xét; chưa chọn sao thì Mít đang chờ. */
export function starPose(level: 1 | 2 | 3 | null): MascotPose {
  return level === null ? "cho" : (`sao-${level}` as MascotPose);
}

/** Tỉ lệ rộng/cao của ảnh 1x (256 px cạnh dài), để chừa chỗ trước khi ảnh tải xong. */
const RATIO: Record<MascotPose, number> = {
  main: 182 / 256,
  vui: 235 / 256,
  "dong-vien": 180 / 256,
  cho: 165 / 256,
  chao: 204 / 256,
  "dang-tai": 199 / 256,
  avatar: 225 / 256,
  "sao-1": 193 / 256,
  "sao-2": 227 / 256,
  "sao-3": 190 / 256,
};

/** Mít, gà con mascot (WebP có alpha, 1x/2x). Ảnh trang trí nên bỏ qua với trình đọc màn hình. */
export function Mascot({
  pose = "main",
  size = 96,
  cssSize,
  className,
}: {
  pose?: MascotPose;
  /** Cỡ px của ảnh; bị bỏ qua khi có `cssSize`. */
  size?: number;
  /** Chiều cao theo token, vd `var(--empty-mascot)`; chỗ chừa lấy từ tỉ lệ ảnh. Bỏ trống thì dùng `size`. */
  cssSize?: string;
  className?: string;
}) {
  const base = `${import.meta.env.BASE_URL}mascot/mit-${FILES[pose]}`;
  return (
    <img
      className={className ? `${s.mascot} ${className}` : s.mascot}
      src={`${base}.webp`}
      srcSet={`${base}.webp 1x, ${base}@2x.webp 2x`}
      alt=""
      aria-hidden="true"
      width={cssSize ? undefined : Math.round(size * RATIO[pose])}
      height={cssSize ? undefined : size}
      style={{ height: cssSize ?? size, width: "auto", aspectRatio: String(RATIO[pose]) }}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
export default Mascot;

/** Chữ cái đầu của hai từ cuối trong tên ("Nguyễn Thu Hà" → "TH"); tên rỗng → "". */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi-VN");
}

/** Lời chào theo tên hiển thị; không có tên thì chỉ "Xin chào". Không tự thêm "cô/thầy". */
export function greetingFor(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? `Xin chào, ${trimmed}` : "Xin chào";
}

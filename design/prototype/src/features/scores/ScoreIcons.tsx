/**
 * Biểu tượng riêng cho màn điểm, chép từ design/reference:
 * - ChartIcon: 75-trang-thai-rong-chua-co-bai-kiem-tra.html (vòng tròn trạng thái rỗng)
 * - AlertTriangleIcon: 22-gv-nhap-diem-loi-gia-tri.html (dòng lỗi dưới hàng học sinh)
 * Không thêm vào `src/shared/ui/Icon.tsx` để tránh sửa file dùng chung.
 */
export function ChartIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
    </svg>
  );
}

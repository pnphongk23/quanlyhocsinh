/**
 * Cờ tính năng của prototype: một chỗ duy nhất để bật/tắt một tính năng đã có
 * code nhưng chưa muốn đưa lên giao diện.
 *
 * Khi tắt một cờ thì phải bỏ MỌI lối vào (menu, nút, link, thẻ ở Cài đặt) và
 * chặn truy cập thẳng bằng đường dẫn; code và test của tính năng vẫn giữ.
 */
export const features = {
  /**
   * Lương (`features/payroll`). Tắt: không còn mục "Lương"/"Lương của tôi" ở
   * sidebar desktop và Cài đặt, `/luong*` chuyển về `/lop`. Lịch dạy
   * (`/lich-day`) không phụ thuộc cờ này.
   */
  payroll: false,
};

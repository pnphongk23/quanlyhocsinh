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
   * (`/lich-day`) phụ thuộc cờ `staffing`.
   */
  payroll: false,
  /**
   * Bài giảng (`features/lectures`): để phiên bản sau (spec mục 8 "Làm sau").
   * Tắt: không còn mục "Bài giảng" ở sidebar, khối bài giảng trong màn buổi
   * học, dòng "Bài giảng: n" ở thẻ buổi hiện tại; `/bai-giang*` chuyển về `/lop`.
   */
  lectures: false,
  /**
   * Nhân sự và role (`features/staff`, `features/staffing`): ngoài Bản đầu
   * (spec mục 8). Tắt: không còn mục "Phân công", "Lịch dạy", "Nhân sự",
   * "Vai trò" ở sidebar và Cài đặt; `/phan-cong`, `/lich-day`, `/nhan-su*`,
   * `/vai-tro*` chuyển về trang đầu theo vai trò.
   */
  staffing: false,
  /**
   * Học phí (`features/tuition`): ngoài Bản đầu (spec mục 8). Tắt: không còn
   * mục "Học phí" ở sidebar và Cài đặt; `/hoc-phi*` chuyển về trang đầu theo
   * vai trò.
   */
  tuition: false,
  /**
   * Báo cáo điểm (`features/scores/ScoreReportPage`, `StudentScoreReportPage`):
   * ngoài Bản đầu. Tắt: không còn lối vào; `/lop/:classId/bao-cao-diem*`
   * chuyển về `/lop`.
   */
  scoreReports: false,
  /** Ngôn ngữ phụ (Việt/Anh) của Cài đặt: để phiên bản sau. */
  languageSwitch: false,
  /**
   * Bản demo tạm: bỏ bước đăng nhập, mở app là vào thẳng màn "Chọn vai trò"
   * bằng tài khoản mẫu có hai vai trò (Giáo viên, Phụ huynh). Màn Đăng nhập,
   * Đăng ký, Quên mật khẩu vẫn giữ code và test; `/dang-nhap` chuyển về màn
   * chọn vai trò. Bật khi chạy dev/build, tắt khi chạy test.
   */
  skipLogin: import.meta.env.MODE !== "test",
};

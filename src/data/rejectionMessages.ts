const messages: Record<string, string> = {
  forbidden: "Bạn không còn quyền thực hiện thay đổi này.",
  not_found: "Dữ liệu này không còn trên máy chủ.",
  score_above_max: "Điểm cao hơn điểm tối đa của bài kiểm tra.",
  invalid_score: "Điểm không hợp lệ.",
  invalid_score_step: "Điểm phải theo bước 0,5.",
  session_cancelled: "Buổi học đã bị huỷ.",
  session_not_started: "Buổi học chưa diễn ra.",
  student_not_enrolled_on_date: "Học sinh không có trong lớp vào ngày này.",
  student_class_mismatch: "Học sinh không thuộc lớp này.",
  command_expired: "Thay đổi đã quá cũ nên máy chủ không nhận.",
  base_version_ahead: "Dữ liệu trên máy lệch với máy chủ.",
};

/** Câu lỗi tiếng Việt cho mã máy chủ từ chối lệnh; mã lạ thì nói rõ là máy chủ từ chối. */
export function rejectionMessage(code: string): string {
  return messages[code] ?? "Máy chủ từ chối thay đổi này.";
}

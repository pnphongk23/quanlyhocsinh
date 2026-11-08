const messages: Record<string, string> = {
  forbidden: "Bạn không còn quyền thực hiện thay đổi này.",
  not_found: "Dữ liệu này không còn trên máy chủ.",
  invalid_score: "Điểm không hợp lệ.",
  invalid_score_step: "Điểm phải theo bước 0,5.",
  session_cancelled: "Buổi học đã bị huỷ.",
  session_not_started: "Buổi học chưa diễn ra.",
  student_not_enrolled_on_date: "Học sinh không có trong lớp vào ngày này.",
  student_class_mismatch: "Học sinh không thuộc lớp này.",
  command_expired: "Thay đổi đã quá cũ nên máy chủ không nhận.",
  base_version_ahead: "Dữ liệu trên máy lệch với máy chủ.",
  invalid_levels: "Phiếu có mức không hợp lệ.",
  invalid_skill_levels: "Mức kỹ năng không hợp lệ.",
  invalid_topics: "Mục \"Hôm nay học\" không hợp lệ.",
  invalid_graded_skills: "Kỹ năng chấm riêng phải nằm trong mục Hôm nay học.",
  feature_disabled: "Tính năng phiếu 3 mức chưa bật trên máy chủ.",
  criteria_set_slip: "Bộ tiêu chí đã thay đổi. Hãy mở lại phiếu và lưu theo bộ mới.",
  invalid_criteria_levels: "Bản chụp tiêu chí không hợp lệ. Hãy mở lại phiếu và thử lưu lại.",
  comment_required: "Câu nhận xét không được để trống.",
  attendance_incomplete: "Điểm danh chưa đồng bộ xong, thử lại sau.",
};

/**
 * Mã từ chối cuối: giữ giá trị trên máy, hiện lỗi dòng, KHÔNG tự thử lại và không
 * hiện nút "Thử lại" (hợp đồng 2026-11-04). `base_version_ahead` của buổi đã có
 * một lần tự thử nên vẫn cho thử lại thủ công.
 */
export const FINAL_REJECTION_CODES = ["feature_disabled", "invalid_levels", "invalid_skill_levels", "invalid_topics", "invalid_graded_skills", "invalid_criteria_levels", "criteria_set_slip", "comment_required", "session_cancelled"] as const;
export function isFinalRejection(code: string): boolean {
  return (FINAL_REJECTION_CODES as readonly string[]).includes(code);
}
/** Câu lỗi dòng cho lệnh bị từ chối cuối: nói rõ giá trị chỉ có trên máy. */
export function localOnlyRejectionMessage(code: string): string {
  return `Chưa lưu được, giá trị này chỉ có trên máy. ${messages[code] ?? "Máy chủ từ chối thay đổi này."}`;
}

/** Câu lỗi tiếng Việt cho mã máy chủ từ chối lệnh; mã lạ thì nói rõ là máy chủ từ chối. */
export function rejectionMessage(code: string): string {
  return messages[code] ?? "Máy chủ từ chối thay đổi này.";
}

# iOS I-4 · Giáo viên B
Đọc `briefs/ios-common-feature.md` trước (bắt buộc). Bạn SỞ HỮU `Features/Scores/**`, `Features/Homework/**`, `Features/Comments/**`, `Features/Reports/**`; thay các placeholder bằng bản thật, giữ nguyên chữ ký.
Việc: Bài kiểm tra + nhập điểm (`TestsTabView`, `ScoreGridTabView`; điểm tối đa theo bài, mặc định 15, KHÔNG điểm trung bình, KHÔNG "Vắng thi"; sửa, lưu trữ/xoá hẳn bài), BTVN (`SessionHomeworkView`: giao theo phần, chấm 3 mức), Nhận xét/phiếu buổi học (`SessionCommentsView`: 3 mức sao + câu mẫu cố định đúng nguyên văn spec mục 4, ghi chú, gửi cả lớp), Báo cáo tháng (`MonthlyReportView`: xem trước, phát hành, PDF sinh trên máy bằng PDFKit/UIGraphicsPDFRenderer theo bố cục báo cáo prototype). Tất cả offline-first (soạn nhận xét, nhập điểm, tạo bài, giao/chấm BTVN).
Nguồn UI: `src/features/scores`, `homework`, `comments`, `reports`, `class-space/ScoreGridTab.tsx`, `TestsTab.tsx`.
Báo cáo: `ios/docs/report-i4.md`.

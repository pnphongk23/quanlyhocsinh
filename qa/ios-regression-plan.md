# Kế hoạch hồi quy iOS

Phạm vi: 149 ca P0/P1 chưa pass trên iOS (P0 82, P1 67), danh sách ở [ios-regression-backlog.md](ios-regression-backlog.md). P0 chạy trước, rồi P1 theo cùng thứ tự nhóm.

## Điều kiện
- Workspace sạch: `node qa/maestro/web/fixture-ios-clean-workspace.mjs` (2 lớp `QA-iOS-A` 5 em, `QA-iOS-B` 4 em, lịch lặp, 1 buổi lẻ ngày mai, 1 em có SĐT phụ huynh). Tài khoản `~/.config/qlh/staging-qa-ios.txt`, không in ra.
- Vào chi tiết lớp bằng text tên lớp (Lớp tab chỉ còn 2 lớp) hoặc id `class.card.<classID>`. Thêm buổi lẻ: nút nổi "Thêm buổi" → "Lưu buổi học". Sửa buổi lẻ: "Sửa buổi lẻ" trong thẻ "Buổi hiện tại" → "Lưu thay đổi".
- Build: bản có sửa buổi lẻ và tốc độ (Lỗ Túc, `0bdc414`/`8c84576`/`77cc153`); chỉ chạy khi GL cấp lượt và có đường dẫn .app + sha.
- Mỗi lượt simulator ≤45 phút; không chạy song song với Chromium. Mỗi ca ~3–4 phút (Maestro chậm), nên một lượt ≈ 10–12 ca. Sau mỗi nhóm: xoá thư mục debug Maestro, commit `qa/`, báo GL một dòng.

## Thứ tự và ước lượng (P0 trước)
| # | Nhóm | P0 | P1 | Ước lượng P0 | Ghi chú |
|---|---|---|---|---|---|
| 1 | AUTH | 8 | 12 | 1 lượt (~35 phút) | Cần SĐT giả mới cho đăng ký và phụ huynh; tránh 429 (đợi, không phải lỗi) |
| 2 | CLS (gồm CLS-009, CLS-018) | 6 | 9 | 1 lượt (~30 phút) | Ca buổi lẻ chạy đầu để chốt IOS-004 |
| 3 | ATT | 8 | 6 | 1 lượt (~40 phút) | Cần buổi đã tới ngày; dùng buổi lẻ hôm nay (fixture) |
| 4 | CMT (còn lại, gồm CMT-026) | 10 | 7 | 1 lượt (~40 phút) | Gán/Gửi chậm tới khi có build tối ưu |
| 5 | HW | 7 | 6 | 1 lượt (~30 phút) | |
| 6 | GRD, TST | 8 + 11 | 4 + 7 | 2 lượt (~35 phút mỗi lượt) | GRD cần hai tài khoản (giáo viên, phụ huynh) |
| 7 | OFF | 4 | 4 | 1 lượt (~30 phút) | Bật chế độ máy bay trên simulator; chạy riêng |
| 8 | PRM, RPT, STU | 6 + 11 + 3 | 1 + 8 + 3 | 2 lượt (~40 phút mỗi lượt) | RPT nhiều ca tĩnh, gom theo màn |

Tổng P0 ≈ 9 lượt (~5–6 giờ simulator), P1 thêm ≈ 6 lượt. Ca nào cần dữ liệu ngoài workspace sạch thì dựng thêm bằng API trước lượt, không dựng bằng giao diện.

## Ghi nhận kết quả
Cập nhật cột trạng thái trong `qa/traceability.md` và bỏ ca khỏi backlog sau mỗi lượt. Lỗi mới vào `qa/bugs.md` (IOS-005…).

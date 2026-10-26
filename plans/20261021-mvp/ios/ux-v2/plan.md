# Plan iOS ux-v2 (Lead Chu Du · f7f993d1-b9f2-4e4a-9b76-4a42c1f8b2d1)

## Phát hiện chính
- Audit mốc 0 mỏng (5 dòng; SE chưa chụp do Maestro không thấy nút "Đăng nhập"; chưa có ảnh trạng thái). Lead so thêm: trang Lớp GV thiếu "Buổi kế tiếp"/"Việc còn dở"/Mít; chữ tắt avatar sai ("H("); phụ huynh 5 tab ≠ 2; bảng điểm tràn ngang; chưa có ảnh Mít, chưa có token `state-*`; `AppEmptyState` có sẵn ⇒ gắn Mít một chỗ phủ mọi empty.
- **Ngày dạy:** prototype chỉ hiện thẻ `formatWeekdayDate` cho buổi ĐÃ HUỶ; buổi thường tiêu đề "Buổi N · dd/MM" — iOS đang khớp prototype. Người dùng nói "thiếu ngày dạy" ⇒ cần chốt (xem Câu hỏi).

## Đầu việc và write-set (không trùng file)
| Mã | Ai | Việc | Write-set |
|---|---|---|---|
| A1 | sonnet | Nền: token `state-*`/dur (map từ design/tokens), Mít WebP vào bundle, `AppEmptyState` có Mít (thường/gọn), nút lưu 4 trạng thái (loading ≥400 ms → "Đã lưu" icon 1,6 s → lỗi giữ editor), `SaveStatus` tách "đã lưu trên máy"/"Chờ đồng bộ" (>1 s)/ngoại tuyến, chip/segmented/nav selected = fill, sửa chữ tắt avatar; test đơn vị | `Core/DesignSystem/**`, `Resources/Mascot/**`, `project.yml` (chỉ thêm resource), `QuanLyLopTests/DesignSystem*` |
| A2 | luna | Hoàn tất audit: 1 dòng/mã màn, SE 5 màn (simctl + tap toạ độ nếu Maestro lỗi), ảnh trạng thái bằng build `API_BASE_URL` cổng đóng | `ux-v2/audit.md`, `shots/before/**` |
| B1 | sonnet | GV: Lớp (trang đầu), Lịch, chi tiết lớp, buổi học, chi tiết buổi + điểm danh, học sinh, Cài đặt GV (chừa ô email, chưa nối API) | `Features/Classes/**`, `Features/Attendance/**`, `Features/Auth/AuthSettingsView.swift` |
| B2 | sonnet | GV: nhận xét/phiếu sao, BTVN, bài kiểm tra, bảng điểm (bố cục mobile, điểm "82"/"7,5") | `Features/Comments/**`, `Features/Homework/**`, `Features/Scores/**` |
| B3 | sonnet | Phụ huynh 2 tab + điểm, phiếu, Cài đặt qua avatar, đổi mật khẩu, đăng ký + "chưa có con" | `Features/Guardian/**`, `Features/Auth/` (trừ AuthSettingsView) |

Chuỗi mới: mỗi worker một bảng `.xcstrings` riêng (`DesignSystem`, `Teacher`, `Scores`, `Guardian`) — không đụng `Localizable.xcstrings` người dùng đang sửa. Commit theo đường dẫn, không bao giờ add 4 file M của người dùng. Build/test trong bản sao `/tmp`, không `xcodegen` trong worktree.

**Báo cáo:** đề xuất (a) KHÔNG dựng lại màn báo cáo tháng trong ux-v2; chỉ áp thành phần trạng thái chung qua A1; làm "Thêm báo cáo theo khoảng buổi + xem trước sheet" thành task riêng ngay sau ux-v2 cùng email/quên mật khẩu. Lý do: backend abb5a52/04b92f3 chưa lên staging ⇒ (b) không kiểm chạy thật được.

## Thứ tự
A1 ∥ A2 → B1 ∥ B2 ∥ B3 (tối đa 3 sonnet + 0–1 luna) → C: luna chụp after + flow thật (đăng nhập GV/PH, lưu điểm danh/điểm/phiếu, lỗi, ngoại tuyến), `xcodebuild test` Staging → 1 review Codex luna toàn lane (≤2 vòng) → handback.md.

## Tiêu chí đạt
Brief §5; thêm: mọi empty qua `AppEmptyState` có Mít; không giá trị ghi cứng mới ngoài token.

## Rủi ro
- File mới chỉ hiện trong Xcode của người dùng sau khi họ tự `xcodegen` — ghi trong handback.

## Câu hỏi cho GL/người dùng (CLARIFICATION_NEEDED)
1. Ngày dạy: (a) giữ đúng prototype (thẻ ngày chỉ khi huỷ); (b) **đề xuất**: mọi buổi thêm dòng "Thứ Bảy, 24/10 · 18:00–19:30" dưới tiêu đề (lệch prototype, web cần theo). Chọn a/b?
2. Báo cáo: chấp nhận phương án (a) ở trên?
A1, A2 bắt đầu ngay (không phụ thuộc câu hỏi); B chờ trả lời câu 1.

## Quyết định GL (2026-10-24)
1. Ngày dạy (b): mọi buổi thêm dòng "Thứ Bảy, 24/10 · 18:00–19:30" (giờ kết thúc nếu có) dưới tiêu đề, token chữ phụ; buổi huỷ giữ thẻ như prototype + "đã huỷ". → B1.
2. Báo cáo: không dựng lại, chỉ áp trạng thái chung; task riêng sau ux-v2. Ô email trong Cài đặt: KHÔNG hiển thị tới khi nối API (để sau cờ/chưa hiện).
3. Model worker (GL 2026-10-24): worker sửa mã mới dùng codex/gpt-6-luna (high, full-access) hoặc peer pi/deepseek (high); không tạo sonnet mới. B1/B2/B3 → luna, brief nêu rõ file, hàm, tiêu chí test.
4. Review cuối (GL 2026-10-24): 1 reviewer `codex/gpt-6.1-sol` (high, chỉ đọc, mode auto) thay luna; report bảng tiêu chí ĐẠT/CHƯA + file:dòng + Chặn/Cao/Vừa/Thấp. Lead không tự review, chỉ đối chiếu report; chưa đủ ⇒ worker luna/deepseek sửa đúng mục nêu, reviewer kiểm lại các mục đó.

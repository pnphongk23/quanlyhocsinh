# Brief R — Review cuối lane iOS ux-v2 (codex/gpt-6.1-sol, chỉ đọc)

Bạn là reviewer độc lập; KHÔNG sửa file, KHÔNG commit, KHÔNG tạo agent. Được chạy lệnh đọc/kiểm (git, xcodebuild trong bản sao /tmp nếu cần, đọc ảnh). Không in SĐT/mật khẩu/token/nội dung nhận xét; cấm env/printenv/set/ps/pgrep -fl/pgrep -a/lsof.

## Ứng viên
Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios`, diff `af8082a..1dda0c1` (9 commit, 53 file). 4 file M của người dùng (Info.plist, Localizable.xcstrings, 2 entitlements) KHÔNG thuộc ứng viên. Docs/prototype/token: `/Users/phamnhuphong/Git/quanlyhocsinh` (bản chuẩn, đọc `AGENTS.md`, `docs/spec.md`, `docs/architecture.md`, `design/ux-v2/rules.md` mục 6, `design/ux-v2/guardian-ia.md`, `design/tokens/`).

## Bằng chứng (thư mục `plans/20261021-mvp/ios/ux-v2/`)
`plan.md`, `audit.md` (before), `proto-inventory.md` + `shots/proto/`, `shots/before/`, `shots/after/`, `verify.md`, `verify-e.md`, `handback-B2.md`, `handback-B3.md`, `handback-e.md`, `diagnosis-login.md`, `ios/docs/design-system-states.md` (trong worktree). Test lượt gần nhất: Staging 151 test, 2 skip, 0 lỗi (HEAD 1dda0c1).

## Quyết định ĐÃ CHỐT — không đảo ngược nếu không có bằng chứng mới
- Ngày dạy: mọi buổi có dòng "Thứ, dd/MM · giờ bắt đầu" (GL chốt; không có giờ kết thúc trong model `ClassSession`).
- Báo cáo theo tháng KHÔNG dựng lại trong lane này (task sau); ô email KHÔNG hiện; không đổi API/backend/sync.
- `gv-student-detail` bỏ (spec "Làm sau"); bảng điểm cuộn ngang cột ghim = đúng prototype.
- Chuỗi mới ở bảng .xcstrings riêng mỗi lane; không đụng Localizable.xcstrings.

## Tiêu chí (trả ĐẠT/CHƯA từng dòng + bằng chứng file:dòng hoặc ảnh)
1. Mọi màn trong `audit.md` khớp prototype hoặc có lý do nền tảng iOS; chi tiết buổi có phần ngày dạy; phụ huynh 2 tab + chip con + avatar→Cài đặt (guardian-ia.md).
2. Nút lưu/gửi/tạo dùng thành phần chung (loading ≥400 ms → "Đã lưu" ≈1,6 s → lỗi giữ editor/dữ liệu); tách "đã lưu trên máy"/"Chờ đồng bộ"/ngoại tuyến. Liệt kê nút còn dùng cách cũ (grep Features).
3. Mọi empty qua `AppEmptyState` có Mít; không còn `TeacherEmptyState`/`GuardianEmptyState` kiểu cũ tự vẽ; Mít chỉ ở empty/chờ.
4. Selected = fill không viền (tab bar, segmented, chip, thẻ chọn).
5. Không giá trị ghi cứng MỚI ngoài token (màu, cỡ chữ, khoảng cách) — so với `af8082a`; chỉ tính phần mã thêm trong diff.
6. Hợp đồng API/sync/Core.Storage không đổi (diff không chạm logic đó, ngoại trừ getter chỉ đọc A1 nếu có); log không chứa SĐT/nội dung nhận xét.
7. Test: số test/xanh; test mới có ý nghĩa (không rỗng); `LocalizationCatalogTests` phủ bảng riêng; chuỗi tiếng Việt không ghi thẳng trong mã.
8. Truy cập: target ≥44 pt ở nút mới, Dynamic Type không cắt ở màn chính, Reduce Motion (AppSpinner), nhãn VoiceOver cho nút lưu.
9. Chất lượng mã: lỗi logic, race (AppSaveController/AppSaveStatusSource), rò bộ nhớ, hồi quy (đặc biệt Auth: đăng nhập/đăng ký phụ huynh/đăng xuất bị chặn khi còn thay đổi chưa đồng bộ; Keychain).
10. Bằng chứng kiểm chạy: ghi rõ mục nào đã chứng minh bằng chạy thật (ảnh/video) và mục nào chỉ test đơn vị/chưa kiểm (ngoại tuyến UI, "Đã lưu" khung hình, PH Dynamic Type, màn "chưa có con").

## Biết sẵn (đừng báo lại như phát hiện mới, nhưng nhận định mức)
- `AuthService.restoreSession` (AuthService.swift ~105–118): mở app lạnh khi mất mạng, `/me` lỗi mạng ⇒ về màn đăng nhập (ngoài phạm vi sửa của lane; ghi mức theo spec offline).
- Bàn phím che nút "Đăng nhập" (verify.md).
- Trang lớp phụ huynh thiếu tên giáo viên/lịch lớp vì model dữ liệu phụ huynh không có (handback-B3).

## Đầu ra
Báo cáo ngắn (≤600 từ) vào `ux-v2/review.md` + trả lời cuối ≤150 từ: bảng 10 tiêu chí ĐẠT/CHƯA (+ file:dòng/ảnh), rồi danh sách phát hiện theo Chặn/Cao/Vừa/Thấp (mỗi mục: file:dòng, hiện tượng, tại sao, đề xuất 1 dòng). Kết luận: "giao được" chỉ khi không Chặn/Cao và mọi tiêu chí ĐẠT; nếu không, nêu chính xác mục phải sửa.

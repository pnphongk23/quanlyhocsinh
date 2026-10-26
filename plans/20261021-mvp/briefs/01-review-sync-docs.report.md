# Báo cáo review đồng bộ docs MVP

Ngày: 2026-10-21

## Findings

### S-01 — MAJOR

- **File:dòng:** `docs/spec.md:195,229`
- **Mô tả:** Mục PWA viết “Face ID ... dùng passkey” như cách dùng hiện tại, trong khi mục 8 xếp passkey vào “Làm sau”. Vì MVP chốt đăng nhập SĐT + mật khẩu, trạng thái passkey chưa nhất quán.
- **Căn cứ:** `plans/20261021-mvp/lead-brief.md:29,32-33`; tiêu chí review tại `plans/20261021-mvp/briefs/01-review-sync-docs.md:13-18`.
- **Đề xuất sửa:** Ghi rõ passkey là “Làm sau” tại dòng 195 hoặc bỏ hướng dẫn đó khỏi lưu ý PWA MVP.

### S-02 — MAJOR

- **File:dòng:** `docs/spec.md:147,219`; `docs/architecture.md:95,107,138`
- **Mô tả:** Cấp mật khẩu tạm cho phụ huynh, bắt buộc đổi lần đầu và giáo viên cấp lại khi quên là đề xuất chờ xác nhận. Tuy nhiên, bảng tính năng giáo viên (147), dòng phạm vi đăng nhập/quên mật khẩu (219), cùng mô tả tài khoản, yêu cầu mạng và lộ trình kiến trúc (95, 107, 138) trình bày một phần quy trình như đã quyết định. Các mục khác có gắn nhãn đề xuất, nhưng nhãn chưa nhất quán ở các chỗ này.
- **Căn cứ:** `plans/20261021-mvp/lead-brief.md:33`; `plans/20261021-mvp/briefs/00-sync-docs.md:18,33-34`; tiêu chí tại `plans/20261021-mvp/briefs/01-review-sync-docs.md:14,18-19`.
- **Đề xuất sửa:** Gắn nhãn “đề xuất 2026-10-21, chờ xác nhận” cho toàn bộ quy trình cấp, đổi bắt buộc và cấp lại mật khẩu ở các dòng nêu trên; chỉ coi là phạm vi triển khai sau khi được xác nhận.

## Đã kiểm, đạt

- Xác thực đã chốt là SĐT + mật khẩu, không SMS; phụ huynh dùng SĐT trên hồ sơ và tự liên kết các con cùng SĐT. Đổi SĐT gỡ liên kết cũ; không thấy luồng tự đặt mật khẩu lần đầu.
- Giáo viên tự đăng ký workspace và là Admin đầu tiên. Lược đồ workspace, role, ma trận quyền, gán lớp và role mặc định vẫn có trong kiến trúc; MVP không đưa màn quản lý nhân sự/role, phân công, lương, học phí hoặc bài giảng vào phạm vi.
- Hai client iOS SwiftUI và PWA/web dùng chung backend/API; Dexie chỉ dành cho web, kho cục bộ iOS ghi chưa chốt. Đồng bộ có UUID và version; Cloudflare chỉ staging.
- Mục 8 giữ các hạng mục MVP trong lead brief và giữ “Bản web giáo viên” ở “Làm sau”. Các điểm chưa chốt được ghi rõ, gồm quên mật khẩu Admin, số vòng băm, cách thêm nhân sự, loại phiên đăng nhập, kho cục bộ/APNs/PDF iOS.
- Các lần nhắc OTP, mời, link/QR, duyệt, SMS/Zalo còn lại trong `docs/spec.md` và `docs/architecture.md` đều nói rõ đã bỏ, không dùng để đăng nhập hoặc làm sau. Ngoại lệ cần xử lý là passkey tại `docs/spec.md:195` (S-01); không thấy `invites` được dùng như bảng, chỉ còn câu nói bảng đó đã bỏ tại `docs/architecture.md:96`.
- Link nội bộ giữa hai tài liệu hợp lệ; link đến `design/claude-design-staff-tuition-scores-prompt.md` tồn tại.
- Nội dung thay đổi trước đó về bài kiểm tra, điểm tối đa và phiếu buổi học được giữ theo lưu ý của brief; không tính là lỗi review.

## Kết luận

**CHANGES_REQUESTED** — xử lý S-01 và S-02 rồi review lại trước khi duyệt.

Status: DONE
Summary: Review hoàn tất và đã ghi hai finding có căn cứ, dòng tham chiếu, đề xuất sửa trong báo cáo này. Các mục còn lại trong phạm vi kiểm tra đạt; kết luận hiện tại là CHANGES_REQUESTED.

# Việc review: docs/spec.md và docs/architecture.md sau khi đồng bộ MVP

Bạn là reviewer độc lập (chỉ đọc; chỉ ghi file báo cáo). Thư mục: `/Users/phamnhuphong/Git/quanlyhocsinh`. Dùng `srcwalk` thay `rg/grep/cat`.

## Đọc

1. `plans/20261021-mvp/lead-brief.md` mục 1 (quyết định đã chốt: tiêu chuẩn kiểm).
2. `plans/20261021-mvp/briefs/00-sync-docs.md` (việc đã giao) và `00-sync-docs.report.md` (worker báo đã làm gì).
3. `docs/spec.md`, `docs/architecture.md` (bản hiện tại). Lưu ý: `docs/spec.md` còn nhiều thay đổi chưa commit của người dùng từ trước (bài kiểm tra, điểm tối đa, phiếu buổi học...), đó là nội dung đúng cần giữ nguyên, đừng báo là lỗi. Chỉ đối chiếu với `git diff` khi cần phân biệt.

## Kiểm

- Không còn câu nào nói app có mời bằng link, OTP, link/QR chung của lớp, duyệt yêu cầu, mời nhân sự (trừ câu nói rõ đã bỏ hoặc làm sau). Rà các từ: OTP, mời, invite, link, SMS, Zalo, duyệt, kích hoạt, passkey, `invites`.
- Xác thực phụ huynh: SĐT đã khai + mật khẩu, tự liên kết mọi con cùng SĐT; Cấp mật khẩu là "đề xuất, chờ xác nhận" (không được ghi như đã chốt); không có "tự đặt mật khẩu lần đầu"; quên mật khẩu = giáo viên cấp lại; đổi SĐT gỡ liên kết cũ.
- Giáo viên tự đăng ký workspace, người tạo là Admin đầu tiên; lược đồ workspace/role/ma trận quyền/gán lớp còn nguyên; không màn quản lý nhân sự/role/lương/học phí/bài giảng trong MVP.
- Client: iOS SwiftUI native + web/PWA chung một API; offline: API idempotent (UUID, version); kho cục bộ iOS ghi "chưa chốt"; Dexie chỉ của web. Deploy Cloudflare staging.
- Phạm vi mục 8 "Bản đầu" khớp danh sách MVP ở lead-brief mục 1; "Bản web giáo viên" giữ nguyên ở "Làm sau".
- spec.md và architecture.md không mâu thuẫn nhau; không mâu thuẫn nội bộ (ví dụ mục 5 nói một đằng, mục 8 nói một nẻo); link nội bộ đúng; mọi quyết định mới có nhãn ngày đúng.
- Không bịa quyết định ngoài lead-brief mục 1. Không SĐT/mật khẩu thật.
- Các điểm chưa chốt worker nêu (quên mật khẩu của Admin, số vòng băm, cách thêm nhân sự sau này): có ghi rõ "chưa chốt" ở docs không.

## Ra

`plans/20261021-mvp/briefs/01-review-sync-docs.report.md`: mỗi finding: ID (S-01...), Mức (BLOCKER/MAJOR/MINOR/NIT), File:dòng, Mô tả, Căn cứ, Đề xuất sửa. Mục "Đã kiểm, đạt". Kết luận `APPROVED` hoặc `CHANGES_REQUESTED`. Không bịa lỗi; chỗ spec chưa rõ ghi "Spec chưa rõ".

Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.

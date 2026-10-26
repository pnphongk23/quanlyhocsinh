# Việc backend-02c (B-2c): notifications, devices, FCM sender (mock), cron liên quan

Làm MỌI endpoint nhóm notifications và devices trong `api-spec.md`, cộng bộ gửi FCM HTTP v1 theo `backend/fcm-b2-fix-r2.md`/`api-spec.md` (đọc mục FCM, thông báo, thiết bị; `data-model.md` các bảng thiết bị/thông báo/outbox):
- Đăng ký/thu hồi device token (`devices`), danh sách/đánh dấu đã đọc thông báo (`notifications`), phụ huynh chỉ thấy thông báo của con mình.
- Sender: hàm nhận `fetch` bơm vào để test; lấy access token OAuth từ service account (secret `FCM_SERVICE_ACCOUNT`, KHÔNG có thật: test dùng khoá RSA sinh trong test), cache access token trong D1 (~50 phút); payload KHÔNG chứa nội dung nhận xét/điểm; xử lý token hết hạn (404/UNREGISTERED → vô hiệu token); gộp thông báo/lease/cursor theo spec nếu spec nêu. Handler cron `scheduled` cho việc gửi: viết hàm xuất ra trong `src/db/notifications.ts`/`src/lib` mới KHÔNG; đặt hàm ở `src/db/notification-dispatch.ts` rồi ghi yêu cầu nối vào `src/index.ts` vào backend-requests.md.
- Test: mock `fetch` (không gọi mạng), phân quyền theo vai trò cho mọi endpoint, payload không lộ nội dung, thu hồi token, cache token.

## File được sửa
`worker/src/routes/{notifications,devices}.ts`, `worker/src/db/{notifications,devices}.ts`, file mới `worker/src/db/notification-dispatch.ts`, `worker/src/db/fcm-sender.ts`, `worker/tests/{notifications,devices,fcm}*.test.ts`.

## Tiêu chí xong
Mọi endpoint nhóm có triển khai + test vai trò; sender có test với fetch giả (thành công, token lỗi, 401 làm mới token); `npx vitest run tests/notifications tests/devices tests/fcm` xanh; ghi rõ phần chưa làm. Báo cáo ghi vào `impl-b2c-report.md`.

## Quy tắc chung (bắt buộc)

- Bạn là worker, thư mục sửa DUY NHẤT: worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend`, trong `worker/`. Chỉ ĐỌC (đường dẫn tuyệt đối) `/Users/phamnhuphong/Git/quanlyhocsinh/{AGENTS.md,docs/spec.md,docs/architecture.md}` và `plans/20261021-mvp/backend/{api-spec.md,data-model.md,authz-matrix.md,offline-plan.md}` (cùng `briefs/40-backend-impl-p1.md` cho quy ước). Dùng `srcwalk` thay rg/grep/cat. Không tạo agent khác, không mở review.
- Nhiều worker làm CÙNG worktree song song. Chỉ sửa các file được liệt kê ở "File được sửa". KHÔNG sửa: `migrations/*`, `src/middleware/*`, `src/lib/*`, `src/db/authz.ts`, `src/db/auth.ts`, `src/db/identity.ts`, `src/routes/auth.ts`, `src/routes/index.ts`, `src/index.ts`, `src/types.ts`, file của nhóm khác (thuộc B-1 hoặc worker khác). Cần đổi schema/authz/lib/hàm chung: GHI yêu cầu (file, thay đổi, lý do) vào cuối `plans/20261021-mvp/briefs/backend-requests.md` (thư mục chính; thêm dòng, không xoá dòng người khác), dùng tạm giải pháp cục bộ trong file của bạn, rồi vẫn báo xong.
- Mọi truy vấn D1 CHỈ ở `src/db/<nhóm>.ts`, tái dùng hàm kiểm quyền/phạm vi của `src/db/authz.ts`; phụ huynh chỉ đọc, chỉ thấy nội dung đã gửi/phát hành. Đúng định dạng lỗi/phân trang của `api-spec.md`. Chỉ phạm vi MVP; không điểm trung bình, không "vắng thi". Spec mơ hồ: dùng mặc định `api-spec.md` mục 10, ghi vào "Câu hỏi" ở báo cáo, không đoán.
- Test của nhóm: `worker/tests/<nhóm>*.test.ts` (dùng `tests/helpers.ts`, đọc trước; không sửa helpers: cần thêm thì viết helper riêng trong file test của bạn), phải có test phân quyền theo từng vai trò (Admin, Giáo viên, Trợ giảng, Phụ huynh, chưa đăng nhập, workspace khác, phụ huynh khác) cho mọi endpoint của nhóm. Fixture dùng SĐT giả `+84900000xxx`, không nội dung thật.
- Tự chạy `npm run typecheck` và `npx vitest run tests/<nhóm>` trong `worker/`. Lỗi typecheck/test nằm ở file của người khác (đang sửa dở): bỏ qua, thử lại sau; không sửa hộ.
- KHÔNG commit, KHÔNG push (lead tích hợp và commit). Không deploy, không tài nguyên Cloudflare thật, không log SĐT/mật khẩu/token/nội dung nhận xét. Không đổi `routes/index.ts` (đã mount sẵn nhóm của bạn; export của route giữ nguyên cách `_stub.ts` đang dùng).
- Báo cáo ngắn: `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/impl-b2c-report.md` (đã làm, endpoint nào xong/chưa, lệnh + kết quả, câu hỏi, yêu cầu đã ghi). Kết thúc chat bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.

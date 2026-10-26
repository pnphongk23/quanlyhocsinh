# Việc backend-03 (B-3): đồng bộ offline (gpt-6.1-sol)

Làm điểm vào sync theo `api-spec.md` mục 6 và `offline-plan.md`: lệnh có UUID (idempotent khi gửi lại), `base_version`, mỗi lệnh một `batch`, xung đột giữ hai giá trị, kéo thay đổi theo cursor từ `change_log`, `snapshot_required`; phạm vi lệnh MVP: điểm danh, nhập điểm, tạo bài kiểm tra, soạn nhận xét, giao-chấm BTVN. Lệnh phải qua đúng kiểm quyền như endpoint thường (tái dùng `db/authz.ts`). Các endpoint miền (B-2a/b) đang làm song song: KHÔNG gọi hàm trong `db/<nhóm miền>.ts`; ghi trực tiếp bằng SQL trong `db/sync.ts` theo schema (nếu logic cần chung thì ghi vào `backend-requests.md`). Test: mất mạng/gửi lại trùng, hai thiết bị xung đột, cursor, snapshot_required, phân quyền theo vai trò.

## File được sửa
`worker/src/routes/sync.ts`, `worker/src/db/sync.ts`, file mới `worker/src/db/sync-*.ts` nếu cần, `worker/tests/sync*.test.ts`.

## Quy tắc chung (bắt buộc)

- Bạn là worker, thư mục sửa DUY NHẤT: worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend`, trong `worker/`. Chỉ ĐỌC (đường dẫn tuyệt đối) `/Users/phamnhuphong/Git/quanlyhocsinh/{AGENTS.md,docs/spec.md,docs/architecture.md}` và `plans/20261021-mvp/backend/{api-spec.md,data-model.md,authz-matrix.md,offline-plan.md}` (cùng `briefs/40-backend-impl-p1.md` cho quy ước). Dùng `srcwalk` thay rg/grep/cat. Không tạo agent khác, không mở review.
- Nhiều worker làm CÙNG worktree song song. Chỉ sửa các file được liệt kê ở "File được sửa". KHÔNG sửa: `migrations/*`, `src/middleware/*`, `src/lib/*`, `src/db/authz.ts`, `src/db/auth.ts`, `src/db/identity.ts`, `src/routes/auth.ts`, `src/routes/index.ts`, `src/index.ts`, `src/types.ts`, file của nhóm khác (thuộc B-1 hoặc worker khác). Cần đổi schema/authz/lib/hàm chung: GHI yêu cầu (file, thay đổi, lý do) vào cuối `plans/20261021-mvp/briefs/backend-requests.md` (thư mục chính; thêm dòng, không xoá dòng người khác), dùng tạm giải pháp cục bộ trong file của bạn, rồi vẫn báo xong.
- Mọi truy vấn D1 CHỈ ở `src/db/<nhóm>.ts`, tái dùng hàm kiểm quyền/phạm vi của `src/db/authz.ts`; phụ huynh chỉ đọc, chỉ thấy nội dung đã gửi/phát hành. Đúng định dạng lỗi/phân trang của `api-spec.md`. Chỉ phạm vi MVP; không điểm trung bình, không "vắng thi". Spec mơ hồ: dùng mặc định `api-spec.md` mục 10, ghi vào "Câu hỏi" ở báo cáo, không đoán.
- Test của nhóm: `worker/tests/<nhóm>*.test.ts` (dùng `tests/helpers.ts`, đọc trước; không sửa helpers: cần thêm thì viết helper riêng trong file test của bạn), phải có test phân quyền theo từng vai trò (Admin, Giáo viên, Trợ giảng, Phụ huynh, chưa đăng nhập, workspace khác, phụ huynh khác) cho mọi endpoint của nhóm. Fixture dùng SĐT giả `+84900000xxx`, không nội dung thật.
- Tự chạy `npm run typecheck` và `npx vitest run tests/<nhóm>` trong `worker/`. Lỗi typecheck/test nằm ở file của người khác (đang sửa dở): bỏ qua, thử lại sau; không sửa hộ.
- KHÔNG commit, KHÔNG push (lead tích hợp và commit). Không deploy, không tài nguyên Cloudflare thật, không log SĐT/mật khẩu/token/nội dung nhận xét. Không đổi `routes/index.ts` (đã mount sẵn nhóm của bạn; export của route giữ nguyên cách `_stub.ts` đang dùng).
- Báo cáo ngắn: `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/impl-b3-report.md` (đã làm, endpoint nào xong/chưa, lệnh + kết quả, câu hỏi, yêu cầu đã ghi). Kết thúc chat bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.

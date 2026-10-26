# Việc backend-02b (B-2b): tests-scores, homework, comments, reports

Làm MỌI endpoint thuộc các nhóm này trong `api-spec.md`: bài kiểm tra (`max` mặc định 15, `archived`, xoá hẳn khi chưa có điểm / lưu trữ khi đã có, điểm; KHÔNG trung bình, KHÔNG vắng thi; lịch sử điểm qua trigger); BTVN theo phần (giao, chấm 3 mức, buổi chấm suy ra khi đọc); nhận xét/phiếu buổi học (3 mức sao, câu mẫu cố định, ghi chú, gửi, sửa sau gửi; phụ huynh chỉ thấy đã gửi); báo cáo tháng (nháp, xem trước, phát hành, bản chụp, PDF theo spec: client sinh rồi upload/lưu theo spec). Phụ thuộc dữ liệu lớp/buổi/học sinh từ B-2a (đang làm song song): chỉ ĐỌC bảng, không gọi hàm trong `db/{classes,students,sessions,attendance}.ts`; tạo dữ liệu nền cho test bằng SQL/helper riêng.

## File được sửa
`worker/src/routes/{tests-scores,homework,comments,reports}.ts`, `worker/src/db/{tests-scores,homework,comments,reports}.ts`, `worker/tests/{tests-scores,homework,comments,reports}*.test.ts`.

## Quy tắc chung (bắt buộc)

- Bạn là worker, thư mục sửa DUY NHẤT: worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend`, trong `worker/`. Chỉ ĐỌC (đường dẫn tuyệt đối) `/Users/phamnhuphong/Git/quanlyhocsinh/{AGENTS.md,docs/spec.md,docs/architecture.md}` và `plans/20261021-mvp/backend/{api-spec.md,data-model.md,authz-matrix.md,offline-plan.md}` (cùng `briefs/40-backend-impl-p1.md` cho quy ước). Dùng `srcwalk` thay rg/grep/cat. Không tạo agent khác, không mở review.
- Nhiều worker làm CÙNG worktree song song. Chỉ sửa các file được liệt kê ở "File được sửa". KHÔNG sửa: `migrations/*`, `src/middleware/*`, `src/lib/*`, `src/db/authz.ts`, `src/db/auth.ts`, `src/db/identity.ts`, `src/routes/auth.ts`, `src/routes/index.ts`, `src/index.ts`, `src/types.ts`, file của nhóm khác (thuộc B-1 hoặc worker khác). Cần đổi schema/authz/lib/hàm chung: GHI yêu cầu (file, thay đổi, lý do) vào cuối `plans/20261021-mvp/briefs/backend-requests.md` (thư mục chính; thêm dòng, không xoá dòng người khác), dùng tạm giải pháp cục bộ trong file của bạn, rồi vẫn báo xong.
- Mọi truy vấn D1 CHỈ ở `src/db/<nhóm>.ts`, tái dùng hàm kiểm quyền/phạm vi của `src/db/authz.ts`; phụ huynh chỉ đọc, chỉ thấy nội dung đã gửi/phát hành. Đúng định dạng lỗi/phân trang của `api-spec.md`. Chỉ phạm vi MVP; không điểm trung bình, không "vắng thi". Spec mơ hồ: dùng mặc định `api-spec.md` mục 10, ghi vào "Câu hỏi" ở báo cáo, không đoán.
- Test của nhóm: `worker/tests/<nhóm>*.test.ts` (dùng `tests/helpers.ts`, đọc trước; không sửa helpers: cần thêm thì viết helper riêng trong file test của bạn), phải có test phân quyền theo từng vai trò (Admin, Giáo viên, Trợ giảng, Phụ huynh, chưa đăng nhập, workspace khác, phụ huynh khác) cho mọi endpoint của nhóm. Fixture dùng SĐT giả `+84900000xxx`, không nội dung thật.
- Tự chạy `npm run typecheck` và `npx vitest run tests/<nhóm>` trong `worker/`. Lỗi typecheck/test nằm ở file của người khác (đang sửa dở): bỏ qua, thử lại sau; không sửa hộ.
- KHÔNG commit, KHÔNG push (lead tích hợp và commit). Không deploy, không tài nguyên Cloudflare thật, không log SĐT/mật khẩu/token/nội dung nhận xét. Không đổi `routes/index.ts` (đã mount sẵn nhóm của bạn; export của route giữ nguyên cách `_stub.ts` đang dùng).
- Báo cáo ngắn: `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/impl-b2b-report.md` (đã làm, endpoint nào xong/chưa, lệnh + kết quả, câu hỏi, yêu cầu đã ghi). Kết thúc chat bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.

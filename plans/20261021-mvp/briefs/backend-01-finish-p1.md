# Việc backend-01 (B-1): hoàn thiện pha 1 backend Worker + D1

Người giao: Domain Lead Backend. Bạn là worker. Thư mục sửa DUY NHẤT: worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (nhánh `mvp-backend`), chỉ trong `worker/`. KHÔNG đụng `/Users/phamnhuphong/Git/quanlyhocsinh` ngoài việc ĐỌC tài liệu và GHI báo cáo ở đường dẫn cuối. Dùng `srcwalk` thay `rg/grep/cat`. Không tạo agent khác, không mở review.

## Đọc trước (chỉ đọc, đường dẫn tuyệt đối)

- Tiêu chí gốc của pha: `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/briefs/40-backend-impl-p1.md` (TOÀN BỘ phạm vi mục 1-6 và mục "Xác minh" vẫn áp dụng; brief này chỉ nói việc còn lại).
- `/Users/phamnhuphong/Git/quanlyhocsinh/AGENTS.md`, `docs/spec.md`, `docs/architecture.md`
- `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/`: `data-model.md`, `api-spec.md` (mục 10 câu hỏi mở), `authz-matrix.md`, `stack-and-cpu.md`

## Hiện trạng (lead đã chạy thật)

Trong `worker/` (chưa commit) từ một worker bị huỷ giữa chừng: `npm run typecheck` xanh; `npm test` chỉ có 1 smoke test. Đã có code: `src/db/auth.ts` (918 dòng), `src/db/identity.ts`, `src/db/authz.ts`, `src/routes/auth.ts`, `src/middleware/auth.ts`, `src/lib/*`, `migrations/0001_schema.sql` (505 dòng), `0002_triggers.sql` (448 dòng), `tests/helpers.ts`. Các nhóm khác là stub. KHÔNG biết phần nào đúng spec: coi mọi file là chưa tin cậy cho đến khi đối chiếu.

## Việc phải làm

1. Đối chiếu từng file hiện có với brief 40 và spec; sửa chỗ thiếu/sai. Đặc biệt kiểm: 29 bảng khớp `data-model.md` (tên bảng, cột, chỉ mục, khoá phức hợp cùng lớp), trigger lịch sử điểm danh/điểm, `change_log`; auth đủ (đăng ký workspace trong một `batch` với 4 role mặc định + ma trận quyền, đăng nhập, đăng xuất, đổi mật khẩu, `GET /me`, đổi vai trò, cấp mật khẩu tạm theo B-01 → `409 account_not_resettable`, mật khẩu tạm trả đúng một lần, `must_change_password` chặn mọi endpoint ngoài đổi mật khẩu/đăng xuất, khoá 15 phút sau 5 lần sai theo SĐT (+ theo IP nếu spec nói), phiên Bearer băm SHA-256 và hạn phiên đúng spec, PBKDF2-SHA256 qua `PBKDF2_ITERATIONS`, chuẩn hoá SĐT +84, không log SĐT/mật khẩu/token).
2. Viết bộ test (vitest + `@cloudflare/vitest-pool-workers` nếu chạy được; nếu không, nêu lý do và dùng phương án dự phòng theo brief 40) phủ:
   - DDL: đếm 29 bảng, `PRAGMA foreign_key_check` rỗng, ca chèn chéo workspace và chéo lớp bị chặn, trigger lịch sử.
   - Auth: các luồng trên, kèm B-01, cờ đổi mật khẩu, khoá 5 lần, đăng ký tạo đúng role mặc định.
   - Phân quyền theo `authz-matrix.md` cho hàm kiểm quyền chung (`src/db/authz.ts`): Admin, Giáo viên, Trợ giảng, Phụ huynh, chưa đăng nhập, giáo viên workspace khác, phụ huynh khác.
3. Khung route: mọi nhóm khác `auth` vẫn là stub `501 not_implemented` đúng định dạng lỗi; mỗi nhóm có `routes/<nhóm>.ts` + `db/<nhóm>.ts` riêng; `routes/index.ts` mount đủ. Đừng làm endpoint miền (thuộc B-2).
4. Thêm nếu thiếu: `.gitignore`, `.dev.vars.example` (chỉ tên biến), `README.md` ngắn.
5. Chạy cục bộ không cần đăng nhập Cloudflare (`wrangler dev --local`): đăng ký → đăng nhập → `/me` bằng curl (che mật khẩu/token). Đo gzip bundle (`wrangler deploy --dry-run --outdir`).
6. Commit trên `mvp-backend` (tiếng Anh, conventional, không nhắc AI), ví dụ `feat(worker): add D1 schema, auth and authz foundation`. Không commit `node_modules`, `.dev.vars`, `.wrangler`. KHÔNG push/merge.

## Tiêu chí xong

`npm run typecheck` và `npm test` xanh (ghi số test), test phân quyền theo từng vai trò có thật, 29 bảng, foreign_key_check rỗng, curl thành công, gzip bundle ghi rõ, đã commit.

## Ràng buộc

Không deploy, không tạo tài nguyên Cloudflare, không `wrangler login`. Không secret/SĐT/mật khẩu thật (dùng `+84900000001`). Chỉ phạm vi MVP (không nhân sự, mời, OTP, học phí, bài giảng). Spec mơ hồ/mâu thuẫn: không đoán, dùng mặc định `api-spec.md` mục 10, ghi vào "Câu hỏi".

## Báo cáo

Ghi `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/impl-p1-report.md`: đã sửa gì (so với hiện trạng), lệnh + kết quả, hash commit, câu hỏi, giới hạn kiểm chứng. Kết thúc chat bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.

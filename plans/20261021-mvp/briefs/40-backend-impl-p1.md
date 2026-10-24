# Việc W1: backend Worker + D1, pha 1 (nền, schema, auth, authz, khung route)

Người giao: General Lead. Bạn là worker. Thư mục làm việc DUY NHẤT để sửa: worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (nhánh `mvp-backend`, từ `main`). Mọi file mới nằm trong `worker/` của worktree này. KHÔNG đụng thư mục chính `/Users/phamnhuphong/Git/quanlyhocsinh` (chỉ ĐỌC các tài liệu spec ở đó theo đường dẫn tuyệt đối). Dùng `srcwalk` thay `rg/grep/cat`.

## Nguồn chuẩn (đọc trước, đường dẫn tuyệt đối, chỉ đọc)

- `/Users/phamnhuphong/Git/quanlyhocsinh/AGENTS.md`, `docs/spec.md` (mục 3, 4, 8), `docs/architecture.md`
- `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/`: `data-model.md` (DDL 29 bảng, chỉ mục, ràng buộc cùng lớp, trigger), `api-spec.md` (endpoint, ví dụ, lỗi, phân trang; mục 10 câu hỏi mở), `authz-matrix.md` (ma trận quyền theo vai trò: nguồn để viết test), `stack-and-cpu.md`, `offline-plan.md`, `check-fcm-ddl.py` (script kiểm DDL đã chạy PASS, có thể trích DDL), `report-b1.md`
- `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/lead-brief.md` mục 1, 2.B

Spec và backend spec mâu thuẫn hoặc chưa rõ: KHÔNG tự đoán; ghi vào báo cáo mục "Câu hỏi" và chọn mặc định tạm đã ghi ở `api-spec.md` mục 10 (Q1 đến Q16) nếu có.

## Phạm vi pha này

1. **Khung dự án** `worker/`: TypeScript, Hono, `wrangler.jsonc` (một binding D1 tên `DB`, môi trường `staging`; `database_id` để placeholder `REPLACE_AT_DEPLOY` vì chưa tạo D1 thật; KHÔNG deploy, KHÔNG tạo tài nguyên Cloudflare), `package.json` (scripts `test`, `typecheck`, `dev`), `tsconfig`, `.gitignore`, `.dev.vars.example` (chỉ tên biến, không giá trị thật), README ngắn. Không Drizzle ở pha này (YAGNI: SQL thuần, migrations viết tay). Bundle gọn: chỉ thêm thư viện khi thật cần; ghi kích thước gzip của bundle ở báo cáo.
2. **Migrations** `worker/migrations/0001_schema.sql` (toàn bộ DDL theo `data-model.md`, đúng tên bảng/cột/chỉ mục/khoá phức hợp cùng lớp, `created_at` của `change_log`) và `0002_triggers.sql` (trigger lịch sử điểm danh và điểm theo mô tả; `data-model.md` mới mô tả bằng bảng nên bạn viết SQL; trigger ghi cùng lô với thay đổi). Kiểm DDL nạp thành công và các ràng buộc chặn chèn chéo workspace/chéo lớp.
3. **Tầng truy cập D1 duy nhất** `worker/src/db/`: mọi truy vấn D1 CHỈ ở đây; mọi hàm nhận danh tính đã xác thực và tự áp `workspace_id`, quyền nhóm của vai trò, phạm vi (lớp được gán / `guardian_student`). Hàm kiểm quyền chung theo `authz-matrix.md`. Phụ huynh luôn chỉ đọc, chỉ thấy nội dung đã gửi/phát hành.
4. **Khung route**: `worker/src/routes/` với MỘT file mỗi nhóm: `auth.ts` (làm đủ ở pha này), `classes.ts`, `students.ts`, `sessions.ts`, `attendance.ts`, `tests-scores.ts`, `homework.ts`, `comments.ts`, `reports.ts`, `sync.ts`, `notifications.ts`, `devices.ts`; `routes/index.ts` mount tất cả. Các nhóm khác `auth` chỉ cần stub trả `501 not_implemented` đúng định dạng lỗi, có chỗ cắm rõ ràng, để pha sau các worker khác chỉ sửa file của mình, không đụng `index.ts`. Mỗi nhóm có sẵn file `worker/src/db/<nhóm>.ts` rỗng có chú thích tên nhóm (để phân chia sở hữu file).
5. **Auth đầy đủ** (đúng `api-spec.md`): đăng ký workspace (tạo workspace, role mặc định Admin/Giáo viên/Trợ giảng/Phụ huynh với ma trận quyền mặc định, membership của người tạo là Admin, trong một `batch`), đăng nhập SĐT + mật khẩu, đăng xuất, đổi mật khẩu, `GET /me`, đổi vai trò (đổi membership), cấp mật khẩu tạm cho SĐT phụ huynh (điều kiện B-01: đích không có membership nhân sự ở bất kỳ workspace nào và mọi membership là `linked_students` trong chính workspace gọi; ngược lại `409 account_not_resettable`; mật khẩu tạm chỉ trả MỘT lần trong response, không lưu dạng rõ, không log), `must_change_password` (mọi endpoint ngoài đổi mật khẩu/đăng xuất bị chặn khi cờ bật), giới hạn thử (5 lần sai liên tiếp theo SĐT thì khoá 15 phút; thêm theo IP nếu spec nói), phiên là token ngẫu nhiên lưu băm SHA-256 trong D1 (Bearer), hạn phiên đúng spec. Băm mật khẩu PBKDF2-SHA256 qua WebCrypto, số vòng lấy từ biến môi trường `PBKDF2_ITERATIONS` (mặc định 100000 theo `api-spec.md`/Q8 tạm; test dùng số nhỏ). Chuẩn hoá SĐT +84. Không ghi SĐT, mật khẩu, token vào log.
6. **Test phân quyền theo từng vai trò** cho phần auth và cho hàm kiểm quyền chung (ma trận trong `authz-matrix.md`): Admin, Giáo viên, Trợ giảng, Phụ huynh, người chưa đăng nhập, giáo viên workspace khác (không thấy dữ liệu), phụ huynh khác (không thấy con người khác). Test cả điều kiện B-01, cờ đổi mật khẩu bắt buộc, khoá sau 5 lần sai, đăng ký tạo đúng role mặc định.

Chưa làm (pha sau): các endpoint miền (lớp, học sinh, buổi, điểm danh, điểm, BTVN, nhận xét, báo cáo), đồng bộ, thông báo/FCM, cron, deploy.

## Cách test

Ưu tiên `vitest` với `@cloudflare/vitest-pool-workers` (D1 cục bộ, áp migrations khi test). Nếu không dùng được (stack-and-cpu.md ghi "chưa kiểm lại"), dùng phương án dự phòng chạy được cục bộ bằng một lớp D1 giả lập trên SQLite (ví dụ `better-sqlite3` hoặc `node:sqlite` bọc cùng giao diện `D1Database` dùng trong `src/db`), ghi rõ lý do và hạn chế ở báo cáo. Tests không được phụ thuộc mạng hay tài khoản Cloudflare.

## Ràng buộc

- Không deploy, không tạo D1/KV/R2 thật, không `wrangler login`, không đụng production. Không secret thật trong repo (chỉ `.dev.vars.example`).
- Không SĐT/mật khẩu/nội dung nhận xét thật trong code, test fixture hay log; dùng giá trị giả như `+84900000001`.
- Chỉ phạm vi MVP. Không bài giảng, học phí, lương, mời, OTP, nhân sự.
- Commit trên nhánh `mvp-backend` trong worktree, tiếng Anh, conventional (ví dụ `feat(worker): add D1 schema, auth and authz foundation`), không nhắc AI. KHÔNG push, KHÔNG merge.
- Không mở vòng review, không tạo agent khác.

## Xác minh (bắt buộc, dán lệnh và kết quả vào báo cáo)

1. `npm install` rồi `npm run typecheck` và `npm test` xanh (ghi số test).
2. Chạy cục bộ (`wrangler dev --local` hoặc tương đương không cần đăng nhập) và gọi thử: đăng ký → đăng nhập → `/me`; ghi lệnh và kết quả (che mật khẩu/token).
3. Kiểm DDL: số bảng khớp `data-model.md` (29), `PRAGMA foreign_key_check` rỗng, ca chèn chéo workspace/lớp bị chặn.
4. Ghi kích thước gzip bundle (`wrangler deploy --dry-run --outdir` hoặc esbuild) và nêu có vượt ngân sách không.

Báo cáo ngắn (đã làm, cấu trúc thư mục, lệnh và kết quả, hash commit, câu hỏi, giới hạn kiểm chứng) vào `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/impl-p1-report.md`. Không hoàn thành nếu chưa chạy test. Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.

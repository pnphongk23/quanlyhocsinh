# Ràng buộc chung (mọi worker web 1.2)

- Worktree: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh `mvp-web`). Chỉ sửa file thuộc phần của bạn. KHÔNG commit, KHÔNG push, KHÔNG deploy, KHÔNG git checkout/stash/reset; lead commit.
- Đọc trước: `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261028-ai-features/scope-1.2.md` (phần của bạn + Riêng tư), `/Users/phamnhuphong/Git/quanlyhocsinh/docs/spec.md` mục 4 (Nhận xét và báo cáo), `design/tokens/tokens.css`, `design/ux-v2/rules.md` (trong worktree). CHỈ dùng token CSS (`var(--...)`), không ghi cứng màu/cỡ chữ/khoảng cách; cần giá trị mới thì thêm vào `design/tokens/tokens.css` + `tokens.json` trước (đồng bộ bản chép web theo `design/tokens/README.md`).
- Selected = nền `--state-selected-bg` + chữ `--state-selected-fg`, không viền. Empty chỉ dùng `EmptyState` có sẵn. Vùng bấm ≥44px mobile, ≥36px desktop. Desktop nút rộng theo nội dung.
- Mọi chữ giao diện tiếng Việt có dấu, theo giọng các màn hiện có. Tên/SĐT/nội dung nhận xét TUYỆT ĐỐI không vào console.log, lỗi, Sentry, tên test.
- Không code AI, không gọi mạng ngoài các API/lệnh sync đã có. Không thêm thư viện.
- Theo pattern hiện có (repositories + `runDurably`/`composePlans`, `useSaveAction`, `useAccess`). Không viết mock giả để qua test.
- Cấm chạy `env`, `printenv`, `set`, `ps`, `pgrep -fl/-a`, `lsof`; không in file creds. Không gọi staging.
- Không đặt mã kế hoạch/phase/"1.2"/nhãn audit vào comment mã, tên test, thông điệp. Comment giải thích bất biến, ngắn.
- Kiểm: `npx tsc --noEmit`, vitest chỉ các file liên quan (`npx vitest run <đường dẫn>`), cuối cùng toàn bộ `npx vitest run` đúng 1 lần (máy chậm: chạy nền, đợi file output, không sleep/poll liên tục). Build: `VITE_API_BASE_URL=https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1 npm run build`.
- Cuối cùng báo ≤200 chữ: Status (DONE|DONE_WITH_CONCERNS|BLOCKED|NEEDS_CONTEXT), file đã sửa, số test mới, điều chưa làm. Chi tiết ghi vào file báo cáo được giao.

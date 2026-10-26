# Việc W-1: Nền bản web thật (Vite + React + TS)

Người giao: Domain Lead Web. Bạn là worker. Thư mục làm việc DUY NHẤT: worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh `mvp-web`, từ `main`, `src/` ở gốc repo). KHÔNG sửa thư mục chính `/Users/phamnhuphong/Git/quanlyhocsinh` (chỉ đọc; có thay đổi chưa commit của người dùng và worker khác đang sửa `design/prototype`). Không `git push`, không merge vào `main`. Commit trên nhánh `mvp-web` (tiếng Anh, conventional, không nhắc AI) khi một cột mốc xanh. Dùng `srcwalk` thay `rg/grep/cat`.

## Đọc (đường dẫn tuyệt đối trong thư mục chính, chỉ đọc)

- `/Users/phamnhuphong/Git/quanlyhocsinh/AGENTS.md`, `docs/spec.md` (nguồn chuẩn), `docs/architecture.md` mục 2, 3, 5, 6.
- `plans/20261021-mvp/backend/api-spec.md` (hợp đồng API), `plans/20261021-mvp/backend/offline-plan.md` (outbox, đồng bộ), `plans/20261021-mvp/backend/data-model.md` khi cần kiểu dữ liệu.
- Prototype `design/prototype/src/` (chỉ phần ổn định từ P1): `shared/styles/` (tokens.css), `shared/ui/`, `shared/format`, `shared/hooks`, `shared/SaveStatus`, `app/`, `roles/`, `data/logic.ts`, `data/repositories/*` (logic nghiệp vụ), `data/types.ts`. Màn Tài khoản (`features/auth`, `settings`) KHÔNG thuộc việc này: P2 đang dở, giao W-4 sau.

## Làm

1. Khung: `package.json`, `vite.config.ts`, `tsconfig`, `index.html`, `src/main.tsx`, vitest + testing-library, scripts `dev`, `typecheck`, `test`, `build`. React Router, CSS Modules. Cùng phiên bản thư viện với prototype nếu hợp lý.
2. Chia chunk theo vai trò: `src/roles/staff` và `src/roles/guardian` tải lười (lazy route); thư viện nặng (PDF, ...) tải lười. JS ban đầu ≤ 200 KB gzip, đo và ghi số thật.
3. Design system: sao chép token (`#2F5BEA`), `shared/ui`, format, hooks, SaveStatus từ prototype vào `src/shared` (giữ giao diện y hệt, bỏ phần ngoài MVP: lương, học phí, nhân sự, bài giảng, mời/OTP; không điểm trung bình, không "Vắng thi").
4. Lớp dữ liệu thay localStorage: `src/data`: API client có kiểu theo `api-spec.md` (Bearer, lỗi chuẩn, idempotency key), repositories cùng tên/hàm như prototype để màn hình sao chép sang gọi lại được, Dexie (đọc cache), outbox idempotent + đồng bộ theo `offline-plan.md` (hàng đợi ghi cho điểm danh, nhập điểm, tạo bài kiểm tra, soạn nhận xét, giao/chấm BTVN), chỉ báo lỗi lưu/đồng bộ qua SaveStatus (không chip thường trực), đăng xuất bị chặn khi còn lệnh chờ.
5. Đăng nhập (SĐT + mật khẩu, Bearer): chỉ phần logic (`data/auth`, session store, route guard, redirect theo vai trò). Giao diện màn Tài khoản để W-4.
6. Máy chủ giả cho test (MSW hoặc fetch stub trong `src/test`), theo hợp đồng; không dữ liệu thật, không SĐT/mật khẩu thật.
7. Khung app: `src/app` (router, shell trống cho staff/guardian với route placeholder đúng đường dẫn prototype) sao cho W-2/W-3/W-4 chỉ thêm vào `src/features/*` và `src/roles/*` mà không sửa file của nhau. Ghi `src/README.md` ngắn: cấu trúc, quy ước thêm route/repository.

## File được sửa

Toàn bộ `package.json`, `vite.config.ts`, `tsconfig*`, `index.html`, `src/app`, `src/shared`, `src/data`, `src/i18n`, `src/test`, `src/main.tsx`, `src/roles` (chỉ khung). Không tạo gì trong `src/features/*` ngoài thư mục rỗng/placeholder.

## Xong khi

`npm run typecheck`, `npm test`, `npm run build` xanh (dán lệnh + kết quả, số test); số đo JS ban đầu gzip thật; app chạy `npm run dev` hiển thị khung và chuyển route theo vai trò; commit trên `mvp-web`. LÀM HAI ĐỢT. Đợt A (mục mục 1, 2, 3, 7 + khung kiểu API client và repositories rỗng/thin đúng chữ ký, để W-2/W-3 import được): khi typecheck + build + test xanh, commit và KẾT THÚC lượt với Status DONE và ghi `plans/20261021-mvp/web/w1-report.md` (thư mục chính; chỉ ghi file báo cáo này ở thư mục chính). Lead sẽ giao W-2/W-3 rồi gửi tiếp tin để bạn làm Đợt B (mục 4, 5, 6: Dexie, outbox, sync, đăng nhập, máy chủ giả). Đợt B cập nhật báo cáo đó.

Không tạo agent. Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.

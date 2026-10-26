# Việc W-1 đợt B: lớp dữ liệu thật (API, Dexie, outbox, đồng bộ, đăng nhập logic, máy chủ giả)

Worker: `codex/gpt-6-luna`. Làm tiếp việc W-1 đợt A (`web/w1-report.md`, commit `d439eb3`). Đọc `briefs/web-01-foundation.md` (mục 4, 5, 6 là việc của bạn; mục 1 đến 3 và 7 đã xong), `briefs/74-decisions-20261022-b.md`, `briefs/71-decisions-20261022.md`.
Thư mục làm việc DUY NHẤT: worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh `mvp-web`). Thư mục chính chỉ đọc (ngoại lệ: cập nhật `plans/20261021-mvp/web/w1-report.md`). Không push/merge, không `git checkout/reset/stash/clean`, không sửa `design/prototype`. Không tạo agent. Dùng `srcwalk`.

## Bối cảnh song song
Cùng lúc W-2 (`src/features/{classes,students,attendance,comments,homework,schedule}`) và W-3 (`src/features/{class-space,scores,reports}`) sửa màn hình trong cùng worktree, có thể có file dở/tạm lỗi typecheck ở `src/features`: bỏ qua, không sửa, không `git add` file của họ. Bạn chỉ `git add` file của bạn và commit khi xanh. Worktree còn file chưa commit của W-2 (36 file): đừng đụng.

## File được sửa
`package.json` (thêm thư viện), `vite.config.ts`, `src/data/**` (trừ việc đổi chữ ký repository đã export), `src/app` (guard, session provider), `src/shared` khi cần, `src/test/**` (setup, máy chủ giả; KHÔNG sửa `src/test/routes.test.tsx`), `src/main.tsx`, `src/i18n`, `src/README.md`. Không sửa `src/features/**` và `src/roles/**/routes.ts`.

## Làm
1. **API client** thật theo `plans/20261021-mvp/backend/api-spec.md` (đọc kỹ mục 1 đến 6, 10; đã sửa theo quyết định 71: không mã đăng ký, không mật khẩu tạm, PBKDF2 mặc định 30.000): Bearer, base URL từ `import.meta.env.VITE_API_BASE_URL` (mặc định staging `https://qlh-staging-api.tolaphamnhuphong.workers.dev`), lỗi chuẩn, `command_id` UUID làm idempotency key, timeout, ánh xạ snake_case (wire) sang camelCase (view model của `data/types.ts`).
2. **Dexie** (IndexedDB): một bảng mỗi thực thể ở `api-spec.md` 6.4 + `outbox` + `meta(cursor, epoch)`; cache tách theo (user, workspace, membership); đổi `epoch` thì xoá và tải lại. Đọc từ cache.
3. **Repositories**: GIỮ NGUYÊN chữ ký/tên hàm/`useStore` như đợt A (W-2/W-3 đang import). Đọc lấy từ Dexie, phản ứng khi dữ liệu đổi (subscribe). Ghi = một transaction vừa ghi cache vừa thêm dòng `outbox` rồi trả ngay (optimistic); trả lỗi nghiệp vụ đồng bộ cho phần có thể kiểm cục bộ như prototype (ví dụ điểm 0..max bước 0,5, điểm danh khi buổi chưa diễn ra: theo `data/repositories/*` của prototype `design/prototype/src/data/repositories`, sao chép logic nghiệp vụ, bỏ phần ngoài MVP). Hàm nào prototype đang ném "chưa cài" ở đợt A thì cài thật.
4. **Outbox + đồng bộ** đúng `plans/20261021-mvp/backend/offline-plan.md` (đọc hết): gửi tuần tự, tối đa 50 lệnh/request, xoá TỪNG dòng khi có kết quả riêng của lệnh, `rejected` giữ lại và báo lỗi qua SaveStatus (không chip thường trực), gộp lệnh `pending` cùng ô, phụ thuộc `test.create` trước `score.set`, kích hoạt đồng bộ (mở app, online, focus, sau thay đổi trễ 2 giây, định kỳ 120 giây), `snapshot` lần đầu / `409 resync_required` / `snapshot_required`, `pull` theo cursor+epoch, cập nhật `version` cục bộ cùng transaction với dữ liệu, chặn đăng xuất khi còn lệnh. Lệnh tới máy chủ sau cùng thắng (không màn xung đột).
5. **Đăng nhập (logic)**: `data/auth`: đăng nhập SĐT + mật khẩu, đăng ký giáo viên (tạo workspace; không mã), đăng ký phụ huynh (SĐT + mật khẩu tự đặt; tự liên kết con theo SĐT; SĐT chưa khớp vẫn tạo được), đổi mật khẩu của chính mình, đăng xuất, chọn/đổi vai trò (`PUT /session/membership`, cần mạng, xác nhận máy chủ rồi mới đổi cache), session store (lưu token an toàn nhất có thể trong web, ghi chú giới hạn), route guard, redirect theo vai trò. KHÔNG làm giao diện màn Tài khoản (W-4) và không có luồng "phụ huynh lấy mật khẩu lần đầu từ giáo viên". Hợp đồng chính xác của endpoint auth: theo `api-spec.md`; chỗ spec thiếu thì ghi "Câu hỏi" vào báo cáo, đừng đoán.
6. **Máy chủ giả** cho test (MSW hoặc fetch stub trong `src/test`) theo hợp đồng; dùng bộ fixture sync của backend nếu có (`/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend/worker/tests/fixtures/sync/*.json`, chỉ đọc). Dữ liệu giả, không PII thật. Thêm `fake-indexeddb` cho test nếu cần.
7. Test kịch bản bắt buộc của `offline-plan.md` ở mức máy chủ giả: gửi trùng ⇒ `duplicate`, mất mạng giữa lô, tắt/mở app còn lệnh, mất quyền (cache ẩn, lệnh `rejected` giữ), đổi vai trò khi còn lệnh, hai lần sửa cùng ô khi `pending` được gộp.
8. Một lần smoke thật với staging (chỉ đọc + điểm danh một buổi demo qua sync) qua script `scripts/smoke-staging.mjs` hoặc test có điều kiện; mật khẩu demo ở `/tmp/qlh-staging-demo.txt`: ĐỌC chỉ bằng lệnh không in ra (ví dụ `source`/biến môi trường), KHÔNG in SĐT/mật khẩu/token ra log, báo cáo hay chat. Nếu staging không truy cập được, ghi rõ và bỏ qua.
9. Thêm trình bao `src/test/matchMedia` polyfill vào `src/test/setup.ts` (jsdom thiếu `window.matchMedia`, làm hỏng test route khi màn W-2 render).
10. Cập nhật `src/README.md` (cấu trúc data, cách repository đọc/ghi, cách đồng bộ chạy) và `plans/20261021-mvp/web/w1-report.md` (mục Đợt B).

## Xong khi
`npm run typecheck`, `npm test`, `npm run build` xanh (chỉ tính phần của bạn nếu file dở của W-2/W-3 làm lỗi: nêu rõ), JS ban đầu gzip đo lại (≤ 200 KB; Dexie lazy nếu cần), smoke staging (hoặc lý do không chạy), commit trên `mvp-web` (tiếng Anh, conventional, không nhắc AI; nhiều commit nhỏ được).

Kết thúc bằng: Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT + 2 câu.

## Cập nhật: PDF đã chốt
Không có repository/endpoint tải lên hay tải về PDF (`pdf_storage_unavailable`, R2 đã bỏ khỏi MVP): bỏ khỏi API client và repositories. Tạo file PDF/ảnh là việc của giao diện, trên máy.

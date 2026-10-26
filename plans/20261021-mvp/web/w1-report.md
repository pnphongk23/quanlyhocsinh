# W-1 — Đợt A

Status: DONE

Ngày: 2026-10-21. Chỉ thực hiện Đợt A của brief `briefs/web-01-foundation.md`.
Worktree: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web`.
Nhánh: `mvp-web`; commit: `d439eb34451b8038c5653d20cd5c2de5d5ac1229`.
Commit message: `feat(web): scaffold phase A foundation and role routes`.
Worktree sạch sau commit; không push, merge, checkout/reset/stash ở thư mục chính.
Thư mục chính chỉ đọc, ngoại lệ duy nhất là báo cáo này.

## Đã giao

- Khung Vite + React 19 + TypeScript, React Router 7, CSS Modules; Vitest 4 + Testing Library, lockfile riêng ở gốc.
- Scripts `dev`, `typecheck`, `test`, `build`; build kiểm gzip thật từ manifest và tự thất bại nếu vượt ngân sách.
- `src/roles/staff/StaffShell.tsx` và `src/roles/guardian/GuardianShell.tsx` là dynamic entry riêng, tải lười; placeholder trang cũng tải lười.
- Các route MVP giữ đường dẫn prototype cho lớp, buổi học, bài kiểm tra, điểm, học sinh, báo cáo, lịch và phụ huynh; giữ 4 redirect tương thích prototype.
- Account/settings chỉ giữ đường dẫn placeholder, chưa sao chép màn P2 đang dở.
- Token màu `#2f5bea`, shared/ui, styles, format, hooks, SaveStatus từ prototype P1. SaveStatus giữ UI nguyên mẫu, đổi nguồn trạng thái sang `data/saveStatus.ts`, chỉ hiện khi lỗi.
- `data/types.ts` giữ view model camelCase và chữ ký repository MVP (classes, students, sessions, attendance, tests, scores, comments, homework, reports, guardian, access).
- Repository đọc rỗng/null/false; quyền mặc định bị từ chối, scope lớp là Set rỗng. Ghi chưa triển khai ném `FoundationUnavailableError` và kích hoạt SaveStatus; không giả lưu thành công.
- Facade đọc rỗng `getStore/useStore/subscribe`, không localStorage/seed; kiểu và stub helper BTVN/report để màn sao chép import được.
- `data/api/types.ts`: wire snake_case cho auth, thực thể, báo cáo, push/pull/snapshot và command UUID làm idempotency key. `api/client.ts` là hợp đồng có kiểu, chưa gửi fetch/Bearer thật.
- `src/README.md` ghi cấu trúc, quyền sở hữu route, cách ghép màn, khác biệt ISO weekdays, giới hạn Đợt A và yêu cầu tải lười thư viện nặng.
- Không tạo màn trong `src/features`; không đưa lương/học phí/nhân sự/bài giảng/mời/OTP vào app; không điểm trung bình hay Vắng thi.

## Điểm ghép cho các worker

- W-2: `src/roles/staff/routes.ts`, `StaffShell.tsx`, thêm màn ở `src/features/*`.
- W-3: `src/roles/guardian/routes.ts`, `GuardianShell.tsx`, thêm màn phụ huynh.
- W-4: `src/roles/account/routes.ts`, thêm auth/settings UI ở `src/features/*`.
- Thay `lazy: placeholderRoute(title)` bằng lazy import Component; không cần sửa router tổng của nhau.
- API transport, cache, outbox và auth/guard do W-1 làm Đợt B; màn tính năng bắt lỗi thao tác ghi và chuẩn bị `await` khi ghép backend. Chữ ký repository hiện giữ theo prototype; cơ chế async/reactive thật sẽ được nối ở Đợt B.
- Helper chưa nối dữ liệu ném lỗi có chủ đích, không phải nghiệp vụ hoàn chỉnh. Q15/Q16 còn mở nên không tự triển khai cảnh báo vắng/đánh số buổi.

## Kiểm chứng trên commit được giao

```text
npm run typecheck
> tsc --noEmit
Exit 0

npm test
Test Files  2 passed (2)
Tests       44 passed (44)
Duration    1.03s
Exit 0

npm run build
> tsc --noEmit && vite build && node src/test/check-bundle.mjs
vite v7.3.7: 74 modules transformed, built in 579ms
Exit 0

git diff --cached --check
Exit 0 trước commit
```

44 test gồm route/shell thực thi bằng memory router + Testing Library, redirect cũ,
đường dẫn tài khoản, route ngoài MVP không được đăng ký, điều hướng từ trang khung,
SaveStatus chỉ hiện lỗi, chặn lưu giả, mặc định không có quyền và API stub chưa gửi mạng.
Đã dùng `srcwalk guide`, điều hướng/đọc nguồn bằng srcwalk, và `srcwalk review --staged`.

## Số đo bundle thật

Đơn vị byte gzip, gzip từng file rồi cộng theo closure static imports trong manifest:

| Tình huống | JS gzip | CSS gzip | Tổng |
|---|---:|---:|---:|
| Entry ban đầu | 102190 | 1214 | 103404 |
| Trang đầu nhân sự (entry + staff shell + placeholder) | 103107 | 2707 | 105814 |
| Trang đầu phụ huynh (entry + guardian shell + placeholder) | 103195 | 2707 | 105902 |

Entry JS 102,19 KB < 200 KB; JS+CSS < 250 KB. Script xác nhận hai shell không nằm
trong closure entry và không kéo shell vai trò còn lại. Chưa có thư viện PDF/Sentry;
khi thêm phải lazy import ở màn sử dụng. Chưa chạy Lighthouse hay đo mạng yếu/thiết bị thật.

## Mở thử Vite dev

`npm run dev -- --host 127.0.0.1 --port 5178 --strictPort`: ready 149ms.
Chrome: `/` → bấm “Khung nhân sự” → `/lop`, thấy tiêu đề “Lớp của tôi” và menu Nhân sự;
về `/` → bấm “Khung phụ huynh” → `/ph`, thấy “Tổng quan” và menu Phụ huynh;
bấm “Bài tập về nhà” → `/ph/btvn`, thấy đúng tiêu đề/active link và placeholder.
Đã xem screenshot giao diện; console warn/error rỗng trong phiên kiểm tra.
Đây là điều hướng khung để kiểm Đợt A, chưa phải đăng nhập/đổi membership thật.
Đã đóng tab kiểm thử và dừng Vite dev sau khi kiểm chứng.

## Chưa làm — đúng phạm vi Đợt B

Dexie, transaction dữ liệu + outbox, push/pull/snapshot runtime, retry/idempotency runtime,
đăng nhập SĐT + mật khẩu, lưu Bearer, guard và redirect theo membership, chặn logout khi
còn lệnh chờ, fetch stub/MSW theo hợp đồng. Không dùng dữ liệu/tài khoản thật.
Service worker/push/PDF chưa triển khai trong khung A.

## Cập nhật — Đợt B (2026-10-22)

Status: DONE_WITH_CONCERNS

- Commit đợt ưu tiên W-3: `458502d feat(data): add web data layer foundations`.
- Commit tiếp theo: `a52a9c2 feat(data): complete offline repositories and session flow`;
  kiểm tra test data: `5904d3c test(data): align foundation checks with phase B`;
  API đăng ký phụ huynh: `4fdbf3d fix(auth): register parent through supported API`;
  phục hồi outbox: `594cdaa fix(sync): recover pending work after membership changes`;
  tài liệu fixture/repository: `716e319 docs(data): clarify repository and test fixture usage`.
- Đã thêm API client, session/auth logic, Dexie entities/meta/outbox, pull/snapshot/push,
  repository và helper MVP, lỗi storage, cập nhật buổi lẻ, fixture test riêng và mascot/shared
  dependency. Test mới và W-2/W-3 cần import `createSeed` từ
  `src/test/fixtures/seed.ts` (`../../test/fixtures/seed`); alias tương thích
  `src/data/seed.ts` chỉ dùng trong test, không import vào production.
- Không có PDF upload/download trong API client/repositories; `ApiPublication` cũng không
  chứa cờ `has_pdf`. Giao diện chịu trách nhiệm tạo PDF/ảnh tại máy. Không dùng R2.
- `npm run typecheck` xanh sau khi call site W-3 được cập nhật. Không sửa `src/features/**`.
- `npm test`: 126 passed, 20 failed, tất cả 20 lỗi ở `src/test/routes.test.tsx`: các test
  mong render route chưa đăng nhập, trong khi route guard hiện chuyển tới `/dang-nhap`.
  Không sửa `src/test/routes.test.tsx` theo brief. Test `foundation.test.tsx` riêng xanh 6/6;
  14/15 test files toàn bộ xanh.
- `npm run build` xanh; JS entry đầu tiên 141,478 byte gzip, CSS 1,214 byte gzip, dưới
  ngân sách 200 KB JS.
- Smoke staging đăng nhập và lấy `/me` thành công (HTTP 200), đổi membership thành công
  (HTTP 200), đọc danh sách lớp thành công (HTTP 200). Lớp ID trong file demo không nằm
  trong lớp đọc được (roster 404); lớp được trả về chỉ có 9 buổi `planned`, không có buổi
  đã diễn ra, nên không gửi lệnh điểm danh. Không in dữ liệu demo.
- Đăng ký phụ huynh dùng `POST /auth/register-guardian` theo API spec (đăng ký được cả khi
  chưa có học sinh liên kết). Hợp đồng hiện chưa có endpoint cập nhật buổi lẻ; hàm
  `updateExtraSession` giữ chữ ký prototype và chỉ cập nhật cache local, nên chưa thể đồng
  bộ thao tác sửa này tới máy chủ.

## Cập nhật W-1B staging và kiểm chứng (2026-10-22)

- Commit script ban đầu: `c1fe34a test(data): add staging attendance smoke`; sửa xác thực,
  parser và smoke hoàn chỉnh: `7acc00f fix(data): authenticate staging smoke and target teacher`.
- `scripts/smoke-staging.mjs` chạy test điều kiện `src/test/smoke-staging.test.ts`. Test dùng API
  client, `PUT /session/membership`, repository điểm danh, Dexie outbox và `syncNow`; pull lại dữ
  liệu rồi replay cùng `command_id`. Log chỉ có host/path, trạng thái, số lượng và mã lỗi; không
  có số điện thoại, mật khẩu hay token.
- Điều tra 401: dòng API đã có `/v1`; `createApiClient` không tự thêm version prefix và URL thực
  là `…workers.dev/v1/auth/login`. `vi.stubEnv` chạy trước import lại module qua `vi.resetModules`.
  Lỗi còn lại là `login()` gọi `/me` trước khi cài token mới; request `/v1/me` lúc đó thiếu Bearer
  (`x-request-id=ead078b8-95ad-4e11-8fd7-de53b50492b1`). Đã cho request `/me` dùng token vừa nhận.
- Parser trước đó để tiêu đề `Multi-role demo (…giáo viên…)` ghi đè credential Giáo viên vì kiểm
  `giáo viên` trước `multi-role`; giờ ưu tiên nhận diện heading Multi-role. Credential Giáo viên
  xác thực vào workspace `Lớp cô Hương (demo)` với membership `admin`; snapshot có lớp `6A`.
- Chạy `node scripts/smoke-staging.mjs`: `POST /v1/auth/login` 200, `GET /v1/me` 200 (Bearer có
  mặt), snapshot/pull 200; workspace có 36 buổi và 11 học sinh. Điểm danh qua repository/outbox
  được `applied value=excused`, pull xác nhận giá trị `excused`, replay cùng command nhận
  `duplicate`.
- `src/test/routes.test.tsx` không bị sửa trong lượt này. Full `npm test`: 151 passed, 1 skipped
  (16 file passed, smoke staging skipped mặc định). Lượt typecheck gần nhất báo thiếu
  `src/features/auth/RolePickerPage` ở `src/features/auth/account.test.tsx:13` và
  `src/roles/account/routes.ts:7`, đều thuộc thay đổi W-4 đang dang dở; typecheck trước đó đã
  xanh sau sửa auth client.

## Câu hỏi cho Backend

- API spec mục 5.3 chỉ định `POST /classes/{id}/sessions` để tạo buổi lẻ và
  `POST /sessions/{id}/cancel` để hủy buổi `planned`; mục 6.2 không có command
  `session.update` (cũng không có command nào khác sửa ngày/giờ/note của buổi). Cần bổ sung
  endpoint/command nào và hợp đồng phiên bản/quyền cho thao tác sửa buổi lẻ? Cho tới khi có
  hợp đồng, `updateExtraSession` chỉ cập nhật cache local, không thể đồng bộ lên máy chủ.

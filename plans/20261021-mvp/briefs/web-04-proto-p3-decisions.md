# web-04 · Prototype P3: áp quyết định 2026-10-22

Worker: một mình, sửa `design/prototype` ở thư mục chính `/Users/phamnhuphong/Git/quanlyhocsinh`.
KHÔNG commit, KHÔNG `git checkout/reset/stash/clean`, KHÔNG deploy, KHÔNG đụng worktree `mvp-web` hay thư mục ngoài `design/prototype` và `plans/20261021-mvp/design/prototype-shots/p3/`. Dùng `srcwalk` thay `rg/grep/cat`.

## Đọc trước
`AGENTS.md`, `plans/20261021-mvp/briefs/71-decisions-20261022.md`, `plans/20261021-mvp/web/handoff-lead.md` (mục "Phần prototype bị ảnh hưởng"), `docs/spec.md` mục 8 (chỉ làm MVP; không đụng phần ngoài MVP đang ẩn bằng cờ `shared/features.ts`).

## Việc
1. **Bỏ Cấp mật khẩu / mật khẩu tạm của phụ huynh** (giáo viên không quản mật khẩu của ai, chỉ đổi mật khẩu của chính mình):
   - xoá `features/students/parentAccount.ts` (+ test), nút "Cấp mật khẩu"/"Cấp lại", mục "Cấp lại mật khẩu", chip trạng thái mật khẩu (`Chưa cấp mật khẩu` / `Đã cấp · chờ đổi` / `Đang dùng`) ở `StudentsDesktop.tsx` + `studentsDesktop.test.ts`;
   - kiểm màn Học sinh mobile (`StudentsPage.tsx`) và mọi màn khác có phần cấp mật khẩu: bỏ nếu có;
   - `data/authAccounts.ts`: bỏ `PARENT_DEMO_TEMP_PASSWORD`, `mustChangePassword`; tài khoản phụ huynh demo `900000002` thành tài khoản bình thường (mật khẩu demo giả, không buộc đổi);
   - `data/repositories/auth.ts`: bỏ nhánh trạng thái "active"/`mustChangePassword`;
   - bỏ luồng buộc đổi mật khẩu: `features/auth/ForcedPasswordPage.tsx`, `PasswordGuard`, `FORCED_PASSWORD_PATH` trong `app/routes.tsx`, mọi chỗ `LoginPage` chuyển hướng theo cờ này; migration/dữ liệu đã lưu cũ có trường này phải đọc được không vỡ (thêm migration nếu cần, có test).
2. **Chỗ prototype nói "mật khẩu giáo viên cấp" (hoặc tương đương, ví dụ `LoginPage.tsx:131`, `authAccounts.ts:74`, `ForcedPasswordPage`)**: KHÔNG tự viết luồng thay thế (luồng phụ huynh lấy mật khẩu lần đầu đang chờ người dùng). Với mỗi chỗ còn sót sau khi sửa: ghi vị trí file:dòng + câu chữ hiện tại vào báo cáo; để nguyên nếu bỏ đi làm vỡ luồng, hoặc gỡ câu đó nếu chỉ là chữ phụ. Nêu rõ chọn gì ở từng chỗ.
3. **Bỏ mã đăng ký / lời mời còn sót** trong phạm vi MVP: rà `RegisterPage`, test, ảnh, README, dữ liệu seed. Đăng ký = SĐT + mật khẩu, không mã. Màn mời nhân sự (`features/staff/InvitePage.tsx`, `repositories/staff.ts`) là NGOÀI MVP và đang ẩn bằng cờ: giữ nguyên, chỉ báo lại là còn.
4. **Quên mật khẩu** (`ForgotPasswordPage.tsx`): chữ mới, ngắn, đơn giản, dùng chung cho giáo viên và phụ huynh: người vận hành sẽ đặt lại mật khẩu thủ công, không OTP, không "nhờ giáo viên cấp lại". Giữ bố cục/màn hiện có, chỉ đổi chữ.
5. **Điểm lẻ bước 0,5**: điểm bài kiểm tra cho phép 0, 0,5, 1 … đến max (0..max). Lưới điểm desktop (`ScoreGridDesktop.parseScoreInput`) và nhập điểm mobile (`TestScoresPage.tsx`): nhận cả `7,5` và `7.5`, từ chối giá trị không phải bội của 0,5 (ví dụ 7,3), hiển thị dạng `7,5` (dấu phẩy, bỏ ",0" với số nguyên); kiểm bước ở repository `data/repositories/scores.ts` luôn (không chỉ UI). Ô "Điểm tối đa" (`TestScoresPage`, `NewTestPage`, `TestsDesktop`) GIỮ số nguyên 1..1000. Cập nhật/viết test.
6. **README** `design/prototype/README.md`: bỏ dòng mật khẩu tạm, ghi lại bảng tài khoản demo còn lại, ghi ngắn các thay đổi này nếu README đang liệt kê hành vi. Không in SĐT/mật khẩu thật.
7. **Danh sách chuỗi chữ mới**: ghi vào `plans/20261021-mvp/web/p3-strings.md` mọi chuỗi tiếng Việt mới/đổi (màn, vị trí, chữ CŨ → chữ MỚI, nguyên văn từng ký tự, kèm thông báo lỗi điểm lẻ và định dạng điểm), để lead iOS dùng y hệt.

## Không làm
Luồng phụ huynh lấy mật khẩu lần đầu; thiết kế UI mới; đổi phần ngoài MVP; bật/tắt cờ `skipLogin`; deploy.

## Tiêu chí xong (tự chạy, dán số liệu thật)
- `cd design/prototype && npm test` xanh (ghi số test: tổng/đạt); `npm run build` xanh; `npx tsc --noEmit` sạch.
- `srcwalk discover` các từ `mustChangePassword, ForcedPassword, TEMP_PASSWORD, Cấp mật khẩu, REGISTRATION` trong `src` và README: không còn trong phạm vi MVP (liệt kê chỗ còn lại, nếu có, kèm lý do).
- Ảnh chụp mọi màn đã đổi vào `plans/20261021-mvp/design/prototype-shots/p3/` (mobile 390×844, desktop 1360×934; tên rõ ràng, ví dụ `mobile-forgot-password.png`, `desktop-students.png`, `desktop-score-grid-half.png`, `mobile-test-scores-half.png`, màn đăng nhập/đăng ký nếu đổi). Chạy `npm run dev` hoặc `dist` qua `vite preview`; tắt server khi xong. Mở từng ảnh kiểm lại bằng mắt, nêu màn nào không chụp được và vì sao.
- Báo cáo `plans/20261021-mvp/web/p3-report.md`: việc đã làm theo từng mục 1..7, danh sách file đổi, kết quả lệnh, danh sách vị trí còn nói "mật khẩu giáo viên cấp", điều chưa chắc.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.

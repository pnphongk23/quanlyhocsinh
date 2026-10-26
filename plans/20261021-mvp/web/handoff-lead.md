# Bàn giao Domain Lead · Web (lead cũ `5d0abc29` → lead mới), 2026-10-22

Mảng `web` = prototype `design/prototype` (P1, P2, đã deploy) + web thật (TẠM NGỪNG). Không chứa secret/SĐT thật; mật khẩu demo của prototype là chuỗi giả, ghi ở `design/prototype/README.md`.

## Mục tiêu và brief gốc
- Prototype là nguồn chuẩn UI. Web thật = Vite/React/TS theo `docs/architecture.md` mục 2, 3, 5, 6, khớp prototype.
- Brief: `briefs/50-lead-common.md` (+ Quy tắc UI), `briefs/53-lead-web.md`, `briefs/31-proto-auth.md`, `briefs/71-decisions-20261022.md` (thắng khi lệch).

## Trạng thái thật
- Thư mục chính: nhánh `main`, HEAD `1832350`; 93 mục chưa commit (lẫn thay đổi của người dùng, P1, P2); 81 trong `design/prototype`. Không có gì được commit từ P1/P2.
- Worktree `mvp-web`: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (ws `wks_f1d6ab78d9a2cd60`), nhánh `mvp-web`, HEAD `d439eb3` (W-1 đợt A). 36 file chưa commit do W-2 để lại (sửa `src/roles/staff/routes.ts`, thư mục mới `src/features/`): CHƯA kiểm chứng, giữ nguyên theo lệnh.
- ĐÃ TỰ KIỂM (lead cũ chạy lại): prototype `npm test` 541/541, `npm run build` xanh, `tsc` sạch (sau thêm `skipLogin`: 541/541 lại xanh); worktree `mvp-web` 44 test xanh, build xanh, JS ban đầu 102.190 byte gzip; bản build mở Chrome: vào thẳng Chọn vai trò, bấm Phụ huynh sang `/ph`.
- CHỈ THEO BÁO CÁO: 25 ảnh P2 khớp thiết kế (worker nêu khác biệt; GL cũ nói đã tự xác minh), nội dung W-1 báo cáo ở `web/w1-report.md`. Test route của `mvp-web` từng lỗi 5 test (timeout) trong một lần chạy khi máy tải nặng, chạy lại sạch; nguyên nhân chưa xác định.
- Deploy: Cloudflare Pages project `quanlyhocsinh-proto` (có sẵn), https://quanlyhocsinh-proto.pages.dev, bản gần nhất `c16f11a1` (đã gồm `skipLogin`). Lệnh: `cd design/prototype && npm run build && wrangler pages deploy dist --project-name quanlyhocsinh-proto --branch main --commit-dirty=true`.
- Prototype đang bật cờ `skipLogin` (theo yêu cầu người dùng, tạm): mở app vào thẳng Chọn vai trò (tài khoản mẫu có hai vai trò Giáo viên và Phụ huynh); `/dang-nhap` chuyển về `/chon-vai-tro`; cờ tắt khi chạy test (`MODE === "test"`). File: `shared/features.ts`, `data/repositories/auth.ts` (`enterDemoSession`), `app/demoEntry.ts`, `main.tsx`, `app/routes.tsx`.

## Worker
- ĐANG chạy: không có. W-1 `b96eb6db` (codex gpt-6.1-sol, DONE, `d439eb3`); giai đoạn 0 `71511b82` (codex gpt-6-luna, DONE_WITH_CONCERNS); W-2 `0739c181` (codex gpt-6-luna, bị kill, file dở). Worker pi cũ `b4099e30` (P2) đã huỷ trước đó.

## Việc còn lại theo ưu tiên
1. Sửa prototype theo quyết định 2026-10-22 (xem dưới), chạy lại test/build, deploy.
2. Khi GL báo "mở web": quyết định giữ hay bỏ 36 file dở của W-2; W-1 đợt B (Dexie, outbox, sync, đăng nhập, máy chủ giả: `briefs/web-01-foundation.md`), W-2/W-3 song song (`briefs/web-02-staff-mobile.md`, `web-03-staff-desktop.md`, chung `web-common-ui.md`), W-4 (Tài khoản, phụ huynh, cài đặt, PWA; brief chưa viết), W-5 (đo bundle ≤ 200 KB gzip, deploy `qlh-staging-web`, chụp so ảnh; cần URL API staging), một review tổng thể. Lưu ý: worker mới chỉ dùng `codex/gpt-6-luna` hoặc profile `peer` (pi deepseek); brief W-1 hiện ghi `gpt-6.1-sol`, đổi khi giao.
3. Prototype còn khác biệt ảnh chờ duyệt: dòng "Bạn đổi được vai trò…" sát thẻ thay vì ở đáy; con của phụ huynh theo seed P1 ("Bé Gia Bảo", không phải Minh Anh/Gia Bảo 7B); một số ảnh để trống ô nhập.

## Phần prototype bị ảnh hưởng bởi quyết định 2026-10-22 (CHƯA sửa)
- **Bỏ "Cấp mật khẩu" / mật khẩu tạm phụ huynh** (quyết định 3, 5): `features/students/parentAccount.ts` (+ test), `StudentsDesktop.tsx` (nút "Cấp mật khẩu"/"Cấp lại", mục "Cấp lại mật khẩu", chip "Chưa cấp mật khẩu / Đã cấp · chờ đổi / Đang dùng") và `studentsDesktop.test.ts`; `data/authAccounts.ts` (`PARENT_DEMO_TEMP_PASSWORD`, tài khoản phụ huynh `900000002` với `mustChangePassword: true`); `data/repositories/auth.ts` (nhánh đặt trạng thái "active" khi đổi mật khẩu, `mustChangePassword`); luồng buộc đổi mật khẩu `features/auth/ForcedPasswordPage.tsx`, `PasswordGuard` và `FORCED_PASSWORD_PATH` trong `app/routes.tsx`; `ForgotPasswordPage` ("phụ huynh nhờ giáo viên cấp lại": đổi lời thành người vận hành đặt lại thủ công, cả hai vai trò); README. Cách phụ huynh lấy mật khẩu lần đầu: chờ người dùng, chưa làm; còn màn Học sinh mobile (`StudentsPage.tsx`) chưa kiểm có phần cấp mật khẩu.
- **Bỏ mã đăng ký** (quyết định 4): `features/auth/RegisterPage.tsx` đã tìm "mã/code" không thấy; không có ô mã trong prototype (đã kiểm một lần, chưa kiểm kỹ test/ảnh). Cần xác nhận lại sau khi sửa.
- **Điểm lẻ bước 0,5** (quyết định 6): lưới điểm desktop `ScoreGridDesktop.parseScoreInput` hiện nhận mọi số hữu hạn (7,5 và 7.5 đều được, không ép bước 0,5, kiểm 0..max ở `data/repositories/scores.ts:23`); mobile `TestScoresPage.tsx:296` đã `inputMode="decimal"`. Cần: ép/kiểm bước 0,5, định dạng hiển thị "7,5", sửa test. Ô "Điểm tối đa" (`TestScoresPage:430`, `NewTestPage:88`, `TestsDesktop:302`) đang `step=1`, `inputMode="numeric"`: quyết định chỉ nói điểm lẻ nên giữ nguyên, hỏi lại nếu cần max lẻ.
- Quên mật khẩu: quyết định 2 (người vận hành đặt lại thủ công, không OTP) khớp hành vi hiện tại, chỉ sửa chữ vai trò giáo viên/phụ huynh cho thống nhất.
- Web thật: không ảnh hưởng nặng; khi làm W-4 bỏ màn đổi mật khẩu bắt buộc và nhãn cấp mật khẩu; đăng ký không có mã; điểm lẻ 0,5 trong form nhập điểm.

## Câu hỏi đang chờ
- Phụ huynh lấy mật khẩu lần đầu bằng cách nào (chờ người dùng). Q15, Q16 giữ tạm. Cờ `skipLogin` chỉ là tạm cho demo.
- Quyết định riêng của mảng: ngoài MVP chỉ ẨN bằng cờ `features.ts` (giữ code/test); web thật làm theo prototype, sao chép CSS/cấu trúc, không sáng tạo UI.

## Lệnh tự kiểm chuẩn và cạm bẫy
- Prototype: `cd design/prototype && npm test && npm run build`. Web thật: `cd <worktree> && npm run typecheck && npm test && npm run build` (build tự kiểm bundle gzip).
- Cạm bẫy: (1) lệnh tạo agent bị báo "từ chối" nhưng agent vẫn được tạo: luôn `list_agents` kiểm. (2) Không `git checkout/reset/stash/commit/push` ở thư mục chính (thay đổi chưa commit của người dùng, P1, P2). (3) `import.meta.env.MODE` làm cờ `skipLogin` tắt khi test. (4) Dùng `srcwalk` thay `rg/grep/cat`. (5) Báo cáo W-1 và ảnh P2 ở `web/` và `design/prototype-shots/p2/`.

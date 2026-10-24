# Handback · Web (Domain Lead `5d0abc29`), 2026-10-21

## Giai đoạn 0: prototype P2 (xong)

- Hoàn thiện Tài khoản (đăng nhập, đăng ký, đổi mật khẩu bắt buộc, quên mật khẩu, chọn vai trò, cài đặt) và ẩn mục ngoài MVP bằng cờ (`legacyInvites`, `staffing`, `tuition`, `scoreReports`). Sidebar desktop còn sáu mục MVP.
- Bằng chứng (lead chạy lại, General Lead cũng đã xác minh): `npm test` 541/541, `npm run build` xanh. Ảnh và bảng khác biệt: `plans/20261021-mvp/design/prototype-shots/p2/` (25 ảnh + `report.md`).
- Theo yêu cầu người dùng: thêm cờ `skipLogin` (bật khi dev/build, tắt khi test) để mở app là vào thẳng "Chọn vai trò". Đã deploy lên Cloudflare Pages `quanlyhocsinh-proto` (https://quanlyhocsinh-proto.pages.dev, bản `c16f11a1`).
- Chưa commit gì ở thư mục chính (lẫn thay đổi của người dùng và P1).
- Khác biệt còn mở (chờ duyệt): dòng chú thích ở màn Chọn vai trò nằm sát thẻ thay vì ở đáy; tên con của phụ huynh theo seed P1 (Bé Gia Bảo) thay vì Minh Anh; một số ảnh để trống ô nhập.

## Giai đoạn 1: web thật (TẠM NGỪNG)

- Worktree `mvp-web` (`wks_f1d6ab78d9a2cd60`, `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web`), nhánh `mvp-web`, commit `d439eb3` (W-1 đợt A: khung Vite/TS, router, chunk theo vai trò, design system, kiểu API). Tôi chạy lại: 44 test xanh, build xanh, JS ban đầu 102.190 byte gzip.
- Chưa commit, đang dở: 36 file do W-2 để lại (sửa `src/roles/staff/routes.ts`, thư mục mới `src/features/`), chưa kiểm chứng.
- Chưa làm: W-1 đợt B, W-2, W-3, W-4, W-5, review tổng thể. Chi tiết và cách tiếp tục: `plans/20261021-mvp/web/paused.md`. Brief sẵn: `briefs/web-01..03`, `briefs/web-common-ui.md`.
- Câu hỏi chờ người dùng: giữ hay bỏ phần dở của W-2; mật khẩu tạm phụ huynh (Q1) và Q15/Q16.

## Sổ worker

| Agent | Vai | Model | Việc | Kết quả |
|---|---|---|---|---|
| `71511b82` | worker | codex gpt-6-luna (high) | Giai đoạn 0, prototype P2 | DONE_WITH_CONCERNS |
| `b96eb6db` | worker W-1 | codex gpt-6.1-sol (medium) | Nền web, đợt A | DONE, commit `d439eb3` |
| `0739c181` | worker W-2 | codex gpt-6-luna (high) | Giáo viên mobile | bị kill (tạm ngừng), file dở chưa commit |

Profile-deviation: codex thay pi theo yêu cầu người dùng.

## 2026-10-22 (lane web thật mở lại): Domain Lead mới

Nhánh `mvp-web`, HEAD `73f7650` (chưa push/merge). Staging: https://qlh-staging-web.pages.dev (Pages `qlh-staging-web`, API `qlh-staging-api`). Lệnh kiểm: `npm run typecheck`, `npm test` (156 đạt, 1 bỏ qua), `npm run build` (JS ban đầu 143.924 B gzip, trang đầu giáo viên ≈ 151 KB gồm CSS; ngân sách 200 KB).

Đã làm: lớp dữ liệu thật (API, Dexie, outbox, đồng bộ, auth logic; smoke staging điểm danh: `applied`, pull đúng, replay `duplicate`), màn giáo viên mobile + desktop (lớp, học sinh, điểm danh, nhận xét, BTVN, lịch, Chi tiết lớp, bài kiểm tra, điểm bước 0,5, báo cáo; PDF tạo trên máy bằng in), Tài khoản giáo viên, Cài đặt, PWA, vỏ giáo viên theo prototype. Báo cáo: `w1-report.md`, `w2-report.md`, `w3-report.md`, `w4-report.md`, `w5-report.md`; ảnh `shots/w2..w5`.

Chưa làm: đăng ký phụ huynh và màn phụ huynh (theo prototype mới, sau cùng; staging chưa có `register-guardian`), review tổng thể, đo Lighthouse/thiết bị thật, hộp thoại cài PWA, push FCM web.

Câu hỏi mở: lệnh sync sửa buổi lẻ (api-spec không có; `updateExtraSession` chỉ cập nhật cache); `ApiMembership` thiếu `student_ids` (tên con ở vai trò phụ huynh); viết tắt avatar lấy chữ "(" khi tên có ngoặc (chỉ ở tên demo).

Sổ worker (codex/gpt-6-luna trừ ghi chú): W-1B `e59e7f1b` (lớp dữ liệu), W-2 `6f7ccefe` (màn mobile), W-3 `67d80b8f` (desktop, vỏ), W-4 `e2cb630b` (Tài khoản, PWA; dừng vì hết hạn mức codex), W-4b `bf09c398` (pi deepseek, hoàn tất đối chiếu Tài khoản), W-5 `a5627e74` (kiểm staging). Profile-deviation: W-4b dùng profile `peer` do codex hết hạn mức.

## 2026-10-23: web hoàn tất phần giáo viên + nền phụ huynh; chờ ux-v2

Nhánh `mvp-web`, HEAD `b75194c` (chưa push/merge). Staging: https://qlh-staging-web.pages.dev. Lệnh kiểm: `npm run typecheck` sạch, `npm test` 27 file / 221 đạt (1 bỏ qua), `npm run build` JS ban đầu 146.401 B gzip (giáo viên 158.819, phụ huynh 166.014; ngân sách 200 KB).

Đã làm thêm: dữ liệu phụ huynh (con từ `students` của membership, đăng ký 201 kể cả chưa có con, báo cáo chịu lỗi), màn phụ huynh 5 tab + đăng ký chung (sẽ làm lại theo `design/ux-v2`), Mascot WebP, hướng dẫn "Mở bằng Safari" (cần người dùng duyệt), sửa buổi lẻ qua `PATCH /sessions/{id}`, phiên bền (IndexedDB), thu hồi quyền ẩn cache, thao tác cần mạng chờ xác nhận, đăng xuất xoá cache, font tự lưu + CSP, `robots.txt` staging. Smoke staging: ghi điểm danh qua outbox `applied`, replay `duplicate`; đăng ký phụ huynh chưa khớp 201; `PATCH` buổi lẻ 200. Lighthouse mobile Slow 4G `/dang-nhap`: Performance ≈ 78 → LCP 2,9 s sau tự lưu font (theo f2-report), A11y 100, Best Practices 100.

Review: r1 (2 MAJOR: thu hồi quyền ẩn cache, thao tác cần mạng) đã sửa `563e3e5`; r2 (2 MAJOR: hydrate cache khi bị thu hồi, đăng xuất nhiều tab mất lệnh) đã sửa `b75194c` bằng test hồi quy; KHÔNG mở vòng 3 (quy định tối đa 2 vòng), hai sửa cuối chưa có reviewer xác nhận lại.

Chưa làm/mở: màn phụ huynh 2 tab + bố cục desktop + animation (chờ prototype `ux-v2`), nhãn "cập nhật lúc …" cho phụ huynh, kiểm màn "chưa có con" trên staging (429 đăng ký), cách ly dữ liệu Multi-role demo (cần seed), push FCM web (chờ Firebase), Lighthouse sau đăng nhập, chữ form học sinh tạm cần duyệt.

Sổ worker thêm (codex/gpt-6-luna trừ ghi chú): G-A `785f2665`, G-B `5ad7009f`, G-C `bc81b2e6`, W-6 `c19f5d57`, F-1 `9813f32a`, F-2 `0fd93633`, F-3 `90bbb7e6`; reviewer r1 `6c5f960e`, r2 `4092f204`.

## 2026-10-23: UX v2 áp vào web thật (đã deploy staging)

Nhánh `mvp-web`, HEAD `ee392bb` (chưa push/merge). Staging https://qlh-staging-web.pages.dev (bản trùng HEAD). Lệnh kiểm: `typecheck` sạch, `npm test` 33 file / 265 đạt (1 bỏ qua), `build` xanh; JS ban đầu 146.615 B gzip, trang đầu giáo viên 160.973, trang đầu phụ huynh 170.821 (≤ 200 KB). Lighthouse mobile Slow 4G `/dang-nhap`: Performance 90, A11y 100, Best Practices 100, LCP 2,98 s, TBT 15 ms, CLS 0.

Đã làm: nền chuyển động 150/200/250 ms + reduced-motion, đóng dialog/sheet chờ animation (đo 204 đến 245 ms trên Chrome 155), nút desktop theo nội dung, vỏ giáo viên nội dung ≤ 1200px, `formatScore` duy nhất ("10/10", "7,5/15"), bố cục desktop giáo viên + thẻ Hôm nay/Việc còn dở, phụ huynh 2 tab (Lớp học của con, Nhận xét của cô; chip con; avatar → Cài đặt trong khung phụ huynh; redirect đường dẫn cũ), `teacher_name`, vùng bấm ≥ 44 mobile / ≥ 36 desktop. Báo cáo: `u1..u3`, `w7`, `f1..f3`; ảnh `shots/u*`, `shots/w7`.

Chưa có bằng chứng trên staging: smoke phân quyền từng con (hai con thấy đúng dữ liệu của mình; chỉ có test đơn vị), nhánh `teacher_name = null`, ảnh Chi tiết lớp/Báo cáo giáo viên trên dữ liệu staging (tài khoản Multi-role là Quản trị viên không có lớp; tài khoản Giáo viên demo chưa chụp lại sau UX v2). Còn mở: chấm "Mới" lưu trên máy (điểm mở lead UX), nhãn "cập nhật lúc …" phụ huynh, push FCM web (chờ Firebase), chữ form học sinh tạm cần duyệt, màn "Mở bằng Safari" cần duyệt, chưa review tổng thể sau UX v2 (đã hết 2 vòng).

Sổ worker thêm: U-1 `4ee01be2`, U-2 `d3e98db0`, U-3 `45fa28ba`, W-7 `8e392498` (đều codex/gpt-6-luna).

## 2026-10-23 (cuối): kiểm UI staging bằng script (W-8)

HEAD `dd1a59c` (chưa push/merge), staging https://qlh-staging-web.pages.dev trùng HEAD. `typecheck` sạch, `npm test` 265 đạt (1 bỏ qua), `build` xanh; JS ban đầu 146.611 B gzip, giáo viên 160.966, phụ huynh 170.804. E2E Playwright (`scripts/e2e-staging-ui.mjs`, phiên ngoài git): 43 màn không tràn ngang, vùng bấm ≥ 44 mobile / ≥ 36 desktop sau sửa (`29b1bf3`), nhập điểm 7,5 và 7.5 nhận / 7,3 từ chối, điểm danh offline → đồng bộ `applied` không chip thường trực, xem trước in chỉ có nội dung báo cáo và 0 request không phải GET, chuyển con A → B → A đúng dữ liệu từng con. Báo cáo `w8-report.md`, ảnh `shots/w8/`.
Còn mở: nhánh `teacher_name = null` chưa thử; chấm "Mới" lưu trên máy; chữ form học sinh tạm và màn "Mở bằng Safari" cần duyệt; push FCM web chờ Firebase; một dòng ảnh W-8 gắn nhãn mobile nhưng đo 1440px (nhãn viewport sai trong báo cáo).

## 2026-10-23: MỐC "WEB HOÀN THÀNH STAGING"

- **Nhánh/commit:** `mvp-web`, HEAD `a11a28d` (chưa push/merge vào `main`). Mốc gần nhất: `dd1a59c` (artifacts E2E ra khỏi git), `29b1bf3` (vùng bấm), `ee392bb`, `2334718`, `7a60619`, `0d1f125`, `92b4b08`, `f6c7c8a`, `de9ba0a` (UX v2).
- **URL staging:** https://qlh-staging-web.pages.dev (Cloudflare Pages `qlh-staging-web`), asset chính `index-BsPTZvEN.js` trùng bản build sạch của HEAD `a11a28d`; gọi API `https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1` (CORS đã có origin này).
- **Kiểm (lead chạy lại ở HEAD):** `npm run typecheck` sạch; `npm test` 33 file / 267 đạt (1 bỏ qua); `npm run build` xanh.
- **Bundle (gzip):** JS ban đầu 146.616 B; trang đầu giáo viên 161.005 B; trang đầu phụ huynh 170.803 B (ngân sách 200 KB).
- **Lighthouse mobile** (Slow 4G, CPU 4×) `/dang-nhap` (W-7 vòng 3): Performance 90, Accessibility 100, Best Practices 100, LCP 2,98 s, TBT 15 ms, CLS 0.
- **E2E staging bằng script** (`scripts/e2e-staging-ui.mjs`, W-8): 43 màn không tràn ngang, vùng bấm đạt, điểm 7,5/7.5 nhận và 7,3 từ chối, điểm danh offline → `sync/push` `applied` không chip, xem trước in chỉ nội dung báo cáo và 0 request không phải GET, phụ huynh 2 con A → B → A không lẫn dữ liệu. Sau đó U-1 sửa sidebar: chưa chọn lớp thì chỉ "Lớp" được tô, 4 mục cần lớp mờ và khoá (`aria-disabled`); ảnh `shots/w8/teacher-{desktop,mobile}-lop-all-classes.png` (lead đã xem: đúng).
- **Review:** r1 và r2 đã sửa (`563e3e5`, `b75194c`); hai sửa cuối chưa có reviewer xác nhận lại (hết 2 vòng); sau đó UX v2 và các sửa W-7/W-8 không review tổng thể lại.
- **Bảng khác biệt còn lại so prototype ux-v2:** chỉ khác dữ liệu staging (lớp 6A học Thứ Ba/Thứ Năm; hai con cùng lớp; tên demo có ngoặc nên avatar "A("); sidebar khoá mục khi chưa có lớp là chi tiết prototype chưa có, theo yêu cầu GL; nhánh `teacher_name = null` chưa thử vì không có dữ liệu null).
- **Việc chưa làm / chờ:** push FCM web (chờ người dùng gửi Firebase); chữ form học sinh dùng tạm và màn "Mở bằng Safari" cần người dùng duyệt (chưa qua Claude Design); chấm "Mới" của phụ huynh chỉ lưu trên máy; nhãn "cập nhật lúc …" phụ huynh; Lighthouse sau đăng nhập; review tổng thể sau UX v2; push/merge nhánh `mvp-web` (chờ lệnh).
- **Báo cáo:** `w1..w8-report.md`, `g-a/g-b/g-c-report.md`, `u1..u3-report.md`, `f1..f3-report.md`, `review-r1/r2.md`; ảnh `shots/*`.

## 2026-10-23: bàn giao `src/data/**` cho Domain Lead Data + API (`6d1ef147`)
Từ nay lớp dữ liệu web (`src/data/**`: API client, Dexie, outbox, sync, repositories, auth) do Domain Lead Data + API tiếp quản trong worktree `mvp-web`. Lane Web không giao việc mới ở phần này. Không có worker nào của lane Web đang sửa `src/data` (mọi worker đã xong; sửa `src/data` cuối cùng của lane Web ở `b75194c`, `2334718`). Phần UI (`src/shared/styles`, `src/features/*`) đang do Domain Lead Web UI audit (`a6d1bd53`) sửa. Lane Web chỉ còn việc chờ: push FCM web (Firebase), duyệt chữ form học sinh và màn "Mở bằng Safari", review tổng thể sau UX v2.

# Plan · UI feedback 24/10 + hệ trạng thái chung

Lead: Gia Cát Lượng `8237ac1e-1925-4ba5-8ecc-3d896af02bda` · GL `122e9fde-ee5d-4862-8586-c25365e6a20b` · brief `briefs/80-lead-ui-feedback-20261024.md`
Web: worktree `mvp-web` (base `f31150e`). Prototype + `design/` + plans: thư mục chính, không commit ở đó.

## Trạng thái
- Mốc 0 xong: đo F8 (luna `e1620c27-649c-4610-9ac0-3741552bd2c3`, DONE_WITH_CONCERNS) → `f8-measure.md`, ảnh before `shots/before/` (27 ảnh). Plan gửi GL, GL DUYỆT.
- Gói T xong: `64d63147-b62f-4cfe-8856-5eff260a6e76`, commit `eb4d672` (API đóng băng, báo GL).
- A/B/C xong, commit: `1ab8d92` token bảng điểm, `984b693`+`de9faea`+`845deac` B, `62382ac` A, `02e2a86` C. Lead tự chạy: web typecheck 0, vitest 397/1 skip; prototype typecheck 0, vitest 572.
- Đang chạy: V `d7135837-88c6-4ed2-8b53-12510430e1e8` (luna) — script theo hợp đồng mới, baseline click, test:state web+proto, ảnh after. Sau V: review Codex 1 lần cho cả lane.
- V vòng 1 xong (state web 31/11/3, proto 26/6/14; save 100/20; click: không có fail mới so với baseline f31150e). Quyết định lead: thanh tab lớp + tabbar mobile giữ gạch chỉ báo (rules.md mục 4), không thuộc 'selected = fill'. Vòng sửa 2: A (sidebar luôn đúng 1 mục selected; thẻ Buổi lẻ sắp tới chỉ 'Xem buổi'), V (script: 'Đã lưu' chỉ cho lưu tại chỗ, SaveStatus visible, tiêm lỗi IDB ổn định, xác minh lại score disabled).
- Chuyển lead Data qua GL: tạo lớp trùng khi cache lỗi; `saveHomeworkSection` nuốt lỗi persistCommand. Đề xuất skill: `app-design-states-proposal.md`.
- Commit: chỉ lead commit, `git add <đường dẫn>`; lane Data (`src/data/**`) chạy cùng worktree.

## 1. Quyết định
- **Nguồn quy tắc**: giá trị token trạng thái ở `design/tokens/` (tokens.css/json, README, ios-mapping.md; chỉ THÊM). Bảng state contract = mục mới "6. Trạng thái thành phần" trong `design/ux-v2/rules.md`. Không tạo `states.md` (tránh nguồn song song). Bản `design/tokens/` của mvp-web phải giống hệt thư mục chính.
- **Selected (F3)**: một kiểu duy nhất = nền `--state-selected-bg` (= màu nền nav đang chọn hiện có) + chữ `--state-selected-fg`; không viền. Focus-visible vẫn là vòng `--focus-ring` (a11y, không phải selected).
- **Empty (F7)**: chỉ `EmptyState` (Mít + tiêu đề + mô tả + action tuỳ chọn), thêm `size="compact"` (Mít 56 px, chữ nhỏ) cho khung nhỏ/lọc rỗng. `mascot` mặc định có, không còn empty không Mít.
- **Hủy buổi (F6)**: rời thẻ buổi hiện tại; vẫn còn ở menu ⋯ của hàng buổi (`SessionsDesktop.tsx:187`, đã có) và menu ⋯ trang chi tiết buổi (`ClassDesktopHeader.tsx:87`), giữ hộp xác nhận không đảo ngược (spec 5). Thẻ chỉ còn "Xem buổi". Mobile `SessionsTab` làm cùng kiểu.
- **Chỉ dùng token** (quy tắc người dùng): mọi worker đọc `design/tokens/` + `design/ux-v2/rules.md` trước; không ghi cứng màu/cỡ chữ/khoảng cách; thiếu giá trị thì T thêm token trước. Review Codex tìm giá trị ghi cứng trong diff.
- **Độ rộng cột (F4)**: localStorage khóa `qlh.scoreCols.v1.<classId>`, chỉ trên máy; nút "Đặt lại độ rộng" không làm (Thấp). Kéo bằng chuột + phím ←/→ khi tay nắm có focus.
- **iOS**: chỉ `ios-mapping.md`. Skill toàn cục: lead viết `app-design-states-proposal.md`, không sửa `~/.claude/skills`.

## 2. Đầu việc và write-set (web + prototype cùng tên file)
Thứ tự: **T** trước (API chung), rồi **A ∥ B ∥ C**, rồi **V** (đo + ảnh after + bộ kiểm), rồi review Codex.

| Gói | Model | Nội dung | Write-set (mvp-web `src/` + prototype `src/` file tương ứng) |
|---|---|---|---|
| T | sonnet 5.5 | Token trạng thái; rules.md mục 6; `EmptyState` compact; `Button` loading/success; `Segmented`/`Chip` selected fill; `useSaveAction` + `SaveStatus` (F8, xem mục 4); test đơn vị | `design/tokens/**` (cả 2 nơi), `design/ux-v2/rules.md`, `src/shared/styles/tokens.css`, `src/shared/ui/**`, `src/shared/hooks/useSaveAction*`, `src/shared/SaveStatus/**` |
| A | sonnet 5.5 | F1, F2, F3 (nav + thẻ lớp + hàng chọn), F5, F6; F7/F8 trong file của mình | `src/roles/staff/**` (prototype: `src/app/TeacherShell.tsx`), `src/app/shell.module.css`, `src/features/classes/**`, `src/features/class-space/**` trừ `ScoreGridTab*`/`scoreGridTab*` |
| B | sonnet 5.5 | F4, F9 (desktop + mobile), test bàn phím; F7/F8 trong file của mình | `src/features/scores/**`, `src/features/class-space/ScoreGridTab.tsx`, `scoreGridTab.test.tsx` |
| C | sonnet 5.5 | F7 rà + thay mọi empty tự viết; F8 áp vào nút lưu/gửi/tạo còn lại | `src/features/{attendance,comments,homework,reports,students,schedule,settings,auth}/**`, `src/roles/guardian/**` (chỉ empty) |
| V | luna | Bộ kiểm trạng thái `scripts/ui-state-check.mjs` chạy cả web + prototype; ảnh after 390/1280; chạy test:click/test:save | `scripts/ui-state-check.mjs`, `plans/.../ui-feedback-20261024/{shots/after,state-check-results.md}` |

Ngoài write-set: `src/data/**` (lead Data) — chỉ đọc `getSaveStatus()` ("local" = chờ đồng bộ), không sửa.

## 3. Tiêu chí đạt (mỗi gói)
- `npm run typecheck` 0 lỗi, `npm test` xanh ở mvp-web; prototype `npm run typecheck && npm test` xanh.
- A: chưa chọn lớp chỉ "Lớp", "Cài đặt"; chọn lớp thì 4 mục con thụt dưới "Lớp"; sidebar sát mép, không bo; thẻ lớp chọn = fill; đầu trang lớp không breadcrumb/dòng phụ; "Buổi hiện tại" cùng kiểu tiêu đề thẻ "Các buổi đã qua"; hủy buổi vẫn làm được.
- B: cột tên fit nội dung (min 140 / max 280 px), kéo mép đổi, nhớ theo lớp; Enter/↓ xuống, ↑ lên, ←/→ sang cột ở mép con trỏ, Tab chuẩn, ô cuối giữ chỗ; giá trị lỗi giữ nguyên và báo lỗi; test vitest cho từng phím.
- C: `grep` không còn empty tự viết (danh sách thay thế trong handback).
- Mọi nút lưu/gửi/tạo: loading thấy được, thành công, lỗi giữ dữ liệu, chờ đồng bộ — chứng minh bằng `ui-state-check` (không chỉ đọc mã).
- Ảnh before/after F1–F9 ở 390 + 1280; `handback.md` mỗi mục một dòng kèm commit.

## 4. F8 (đã đo, `f8-measure.md`, 2 lượt ổn định)
Kết quả: giả thuyết **đúng cho đường lưu cục bộ**. 10 tổ hợp (điểm danh, điểm màn nhập + bảng điểm, lưu/gửi phiếu, BTVN × 390/1280): 0 frame busy/spinner, 0 chữ thành công, không chỉ báo chờ đồng bộ dù push trễ 1,2 s; các nút này không truyền `loading`. Tạo/sửa lớp, thêm buổi lẻ đi REST trực tiếp: spinner có (~1,2 s) nhưng cũng không có chữ thành công. Offline: chỉ "Gửi phiếu" desktop có "Sẽ gửi khi có mạng". Lỗi Dexie: có "Lỗi lưu — vui lòng thử lại", nhưng BTVN và modal lớp/buổi lẻ **đóng editor** sau lỗi.

Thiết kế (gói T làm lõi, A/B/C áp vào nút của mình):
- `useSaveAction`: ghi dữ liệu ngay, nhưng `saving` giữ tối thiểu `--dur-loading-min` = 400 ms (hằng số JS cùng giá trị); thêm `justSaved` đúng 1 600 ms sau khi thành công.
- `Button`: `loading` (spinner, khoá, giữ bề rộng) + `done` (nhãn "Đã lưu" + dấu ✓, token success). Mọi nút lưu/gửi/tạo truyền `loading={a.saving} done={a.justSaved}`; nút đóng/điều hướng sau lưu thì chờ hết loading rồi mới đóng và để `SaveStatus` báo.
- `SaveStatus` (shell mobile + desktop): `local` kéo dài > 1 s → "Chờ đồng bộ"; offline + `local` → "Đã lưu trên máy · sẽ đồng bộ khi có mạng"; `error` giữ như cũ. Chỉ đọc `getSaveStatus()`, không sửa `src/data/**`.
- Lỗi: giữ editor mở và giữ giá trị, nút về idle để thử lại (sửa BTVN, modal lớp, buổi lẻ).
- Ngoài phạm vi (báo GL → lead Data): tạo/sửa lớp khi REST thành công mà ghi cache Dexie lỗi vẫn báo lỗi chung — chỉ sửa phía UI (giữ modal), không đổi repository.

## 5. Rủi ro
- Giữ loading tối thiểu làm chậm điều hướng sau lưu ≤ 400 ms: chấp nhận; ghi dữ liệu không chờ.
- Prototype lệch cấu trúc web (không có `roles/staff`): worker map file tương ứng, ghi lệch trong handback.
- A và C cùng dùng `EmptyState`/`Button` mới: T phải xong và đóng băng API trước.
- Deploy staging chỉ sau review Codex không còn Chặn/Cao; build từ worktree tạm đúng commit.

- Vòng sửa 3 (sau V cuối trên d131ace): commit d131ace (hook baseline), 00c2b88 (script V), 698fb92 (B gợi ý). Đang chạy: A (bảng buổi đã qua tràn ở 1280; picker chọn lớp ở /lop), C (chip lọc Nhận xét fill; 'Đã lưu' phiếu/BTVN), T (pill offline cắt chữ desktop, không hiện mobile). Sau đó V chạy lại toàn bộ → review Codex.
- Vòng sửa 3 xong: 79e3dc2 A, 9491c99 C, c9337a5 T. Lead tự chạy: web typecheck 0, vitest 412/1 skip; proto typecheck 0, vitest 573. V `d7135837-88c6-4ed2-8b53-12510430e1e8` đang chạy lần cuối trên c9337a5 → review Codex.
- V lần cuối trên c9337a5: state web 87/0/24 & 88/0/23, proto 54/0/60 ×2; test:save 148/0; test:click 19/2 (cả 2 có ở baseline). Script commit 2c4a6f3.
- Review Codex r1: `ab552e10-fe41-4318-b27d-1a7ad06d4ed8` trên 2c4a6f3 → review-codex-r1.md.
- Review r1: CHANGES_REQUIRED (0 Chặn, 2 Cao: form lưu-đóng không hiện 'Đã lưu'; literal px). Đã sửa: 3d32b3e T, 81dd818 B, be46833 C, 5947010 A. Lead chạy: web typecheck 0, vitest 415/1 skip ×2; proto typecheck 0, vitest 573. V đang chạy lại trên 5947010 → review r2 (vòng cuối).
- V trên 7559956 (mock PATCH lớp trả đủ): test:save 158/0; state web 87/0 & 86/1 (F9 ↑ chập chờn ở 1440), proto 54/0. B đang điều tra F9; xong → commit script → review r2.
- Review r2 (1c60cc9): 0 Chặn, 2 Cao mới ở savedPeek (timeout không huỷ; dialog rời màn không chờ). Sửa: 6f12651 (useSavedPeek huỷ được, useSaveAndLeave). Lead chạy web typecheck 0, vitest 424/1 skip. Đã xin GL review r3 hẹp — đang chờ; V chạy lại trên 6f12651. Deploy dừng tới khi GL quyết.
- r3 hẹp: 1 Cao (Ở lại khi đang lưu) → sửa 1f26626 → xác nhận 'Không còn Chặn/Cao'. Kiểm chốt 1f26626: save 158/0, state web 87/0 ×2, proto 54/0, click 18/3·20/1·19/2 (dạng detach như baseline). Build: web index-Dc660mOy.js (/tmp/qlh-ui-1f26626), proto index-Dumk2xIb.js. handback.md xong. Chờ GL GO để deploy.
- DEPLOYED: web 1f26626 index-Dc660mOy.js, proto index-Dumk2xIb.js; smoke 0 lỗi console. Lane xong.
- Sau deploy (GL): thẻ 'Buổi lẻ sắp tới' cùng kiểu tiêu đề — commit 41fb9df, gộp lần deploy sau; ảnh after đã chụp lại.

## Đợt Durable (GL giao 24/10)
- Chờ lead Data báo danh sách hàm `…Durable` (đã có `saveHomeworkSectionDurable` e09ca83; đang thêm cho deleteHomeworkSection, setHomeworkGrade, saveAttendance, saveScore, saveSessionComment, create/update/deleteTest, sendSessionTickets) + mục 2 (currentClassId).
- Khi có: 1 worker sonnet chuyển MỌI call site sang `await …Durable` qua useSaveAction (lỗi giữ editor), bắt đầu HomeworkPanel.tsx:624, HomeworkDesktop.tsx:723; gỡ vá tạm currentClassId trong StaffShell; báo lead Data xoá hàm cũ.
- Kiểm: typecheck, vitest, test:save, test:state (+ ca Dexie lỗi giữ editor), luna ảnh lỗi lưu 390/1280. Codex review hẹp 1 lần trên diff đợt. Xin GL trước deploy (gộp 41fb9df).
- Durable: lead Data xong 872880c (danh sách ở data-api/impl-da6-report.md). Giao C 047fde91-21c2-4cea-8895-cb35eaa0d931 chuyển call site + gỡ vá StaffShell. Sau: V (luna) thêm ca lỗi Dexie vào test:state, đo 20 lần F9 ở 1440, ảnh lỗi lưu 390/1280 → Codex review hẹp → xin GL deploy.
- Việc mới (GL, ảnh 08): bỏ FoundationHome ở '/', redirect theo đăng nhập/vai — giao A 28e783dc-9500-4acc-8871-057c5b71a791, write-set src/app/{routes.tsx,shell.module.css,rootRedirect.test.tsx}. Gộp deploy chung.
- b5a1743: '/' redirect (A). routes.test.tsx ca foundation landing do C sửa trong đợt Durable. Thêm cho V trước deploy: đo bấm Lưu điểm → POST push thành công (< 1 s, sau Data d751bd1) và số request push khi nhập 8 điểm liền rồi lưu.
- 29f099f: C chuyển mọi call site sang …Durable, gỡ vá StaffShell, sửa routes.test; lead chạy typecheck 0, vitest 470/4 skip. Đã báo lead Data xoá hàm cũ. V đang chạy lượt kiểm + đo (durable-wave-results.md) → Codex review hẹp → xin GL deploy.
- fc9f158 (Data xoá hàm cũ) làm HEAD đỏ; lead sửa 4 test → c6f67c2 xanh (typecheck 0, vitest 469/4 skip, build). Đã báo Data; V chạy lại trên c6f67c2.
- V trên c6f67c2: save 158/0; click 20/1·20/1·21/0 (lỗi mobile confirm ngoài viewport có ở baseline); state web 93/1 ×2 (FAIL chấm BTVN desktop mất mức đã chọn khi lỗi ghi), proto 54/0; F9 1440 40 vòng không mất focus/nháy; push 669/681/690 ms; 8 điểm → 1 push 8 command; '/' redirect đạt. Giao C sửa lỗi chấm BTVN.
- 755cf8b: test chấm BTVN giữ mức khi lỗi (lỗi cũ là do kịch bản). Đang chạy: V sửa kịch bản + test:state ×2; Codex review hẹp đợt Durable → review-codex-durable.md.
- Review Durable (755cf8b): 1 Cao (HomeworkPanel mobile mất lựa chọn khi lỗi) + TB (hộp xoá đóng khi lỗi) → C. V: loading hụt 323–345 ms ở desktop; full vitest chập chờn (1–2 timeout/lượt) → T (useSaveAction tính từ paint + ổn định test). Sau đó: V chạy lại, Codex xác nhận hẹp, xin GL.
- QUY TẮC AN TOÀN (GL): mọi brief worker cấm ps/pgrep -fl/pgrep -a/lsof in dòng lệnh, env/printenv/set; chỉ pgrep -x. Đã gửi V, T, C, A, B.
- c981b72 (C) + 9da9626 (T: loading từ khung busy đầu; test ổn định) + 81abd0a (script). Lead: typecheck 0, vitest 473/4 skip ×3 xanh. Đang: V lượt chốt trên 81abd0a; Codex xác nhận hẹp 755cf8b..9da9626.
- Codex xác nhận 9da9626: Không còn Chặn/Cao. Chờ V lượt chốt trên 81abd0a → build → xin GL.
- V chốt 81abd0a sạch (save 158/0, click 21/0 ×3, state web 95/0 ×2, proto 54/0, push ~686 ms). Web build index-CGVYFWLw.js (/tmp/qlh-ui-81abd0a). Prototype không build được do việc dở của lane khác (ResetPasswordPage, Report batchId). Xin GL GO deploy web.
- DEPLOYED web 81abd0a index-CGVYFWLw.js. Smoke: sự cố đổi 1 ô điểm demo chưa khôi phục (xem handback). Lane idle.

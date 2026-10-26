# Brief 81 · Lead iOS mới: app iOS theo UI MVP mới (ux-v2) + đánh giá UX mobile (Opus)

Người giao: General Lead `122e9fde-ee5d-4862-8586-c25365e6a20b`. Ngày 2026-10-24. Thay lead iOS cũ `7085080b-4664-4907-b40b-497f3105e75a` (đã quá dài context, theo yêu cầu người dùng).

Đọc trước: bàn giao lead cũ `plans/20261021-mvp/ios/handoff-lead-2.md` (tự xác minh, không tin ngay), `AGENTS.md`, `docs/spec.md`, `docs/architecture.md` (THƯ MỤC CHÍNH `/Users/phamnhuphong/Git/quanlyhocsinh`; bản trong worktree có thể cũ), skill `paseo-team`, `/paseo`, **skill `app-design`** (SKILL.md + `references/visual-interaction-performance.md` mục "Interactive component states", `references/assets-verification.md`) và **skill `design-ui-ux`**.

## 1. Người dùng nói (2026-10-24)
- App iOS chưa cập nhật UI mới của MVP.
- Chi tiết buổi dạy KHÔNG có phần ngày dạy (prototype có thẻ ngày: `design/prototype/src/features/class-space/SessionDetailPage.tsx` ~dòng 397–500, `formatWeekdayDate`).
- Chưa có mascot Mít; chưa đủ trạng thái chuẩn (loading, empty, lỗi, đã lưu, chờ đồng bộ…).
- Có khá nhiều lỗi UX mobile → dùng `app-design` + `design-ui-ux` cùng đánh giá.

## 2. Nguồn chuẩn (làm theo, lệch thì theo spec)
- Giao diện: prototype `design/prototype` (ux-v2: GV, phụ huynh 2 tab "Lớp học của con" + "Nhận xét của cô", Cài đặt qua avatar; quy tắc `design/ux-v2/rules.md` gồm mục 6 trạng thái; `design/ux-v2/guardian-ia.md`). Bản chạy: https://quanlyhocsinh-proto.pages.dev
- Token: `design/tokens/` (tokens.json/css) + `design/tokens/ios-mapping.md` ↔ `Tokens.swift`. Quy tắc AGENTS.md: mọi task UI đọc token + rules trước; chỉ dùng token, không ghi cứng màu/cỡ chữ/khoảng cách.
- Trạng thái (người dùng đã duyệt, áp mọi dự án): selected = fill không viền; lưu cục bộ hiện loading tối thiểu ~400 ms rồi "Đã lưu" ~1,5 s (icon, không ký tự trang trí); tách "đã lưu trên máy"/"đã đồng bộ", báo "Chờ đồng bộ"/ngoại tuyến; lỗi giữ dữ liệu + editor mở + thử lại; empty dùng 1 thành phần chung có Mít (biến thể gọn). Kiểm bằng chạy thật, không đọc mã.
- Mascot: Mít WebP (ảnh trong prototype/web, `design/mascot-v2/`), không SVG.
- Hợp đồng API KHÔNG đổi (backend `d2b9c63`); web đã tự tính số buổi, push sau 400 ms yên/tối đa 1 s — iOS nên tương đương (pull foreground + 60 s đã có).

## 3. Phạm vi
- Toàn bộ màn iOS của Bản đầu (spec mục 8): GV (lớp, buổi học + chi tiết buổi 3 tab, điểm danh, nhận xét/phiếu sao, BTVN, bài kiểm tra/điểm, học sinh, báo cáo tháng, cài đặt) và phụ huynh (2 tab theo prototype, đăng ký phụ huynh + màn "chưa có con", Cài đặt/đổi mật khẩu/đăng xuất qua avatar).
- Ngoài phạm vi: mục "Làm sau"/"Chưa nên làm", FCM push (chờ Firebase), đổi API/backend, đổi bundle id trong repo (Local.xcconfig chờ người dùng), web.

## 4. Cách làm (paseo-team)
1. **Mốc 0 – đánh giá (luna chụp, chỉ đọc):** chạy app Staging trên simulator iPhone 16 (390 pt) + 1 máy nhỏ (iPhone SE/mini), chụp mọi màn chính cả GV và phụ huynh; chụp prototype cùng màn (390 px). Áp checklist `app-design` (hierarchy, Back, state lifecycle, safe area, Dynamic Type, target ≥ 44 pt, reduced motion) + `design-ui-ux` (đánh giá heuristic, copy, trạng thái). Ra `plans/20261021-mvp/ios/ux-v2/audit.md`: bảng màn × lệch prototype × lỗi UX (Cao/Vừa/Thấp) × ảnh bằng chứng. Mục người dùng nêu ở §1 phải có dòng riêng.
2. **Mốc 1 – plan.md** (≤ 600 từ) gửi GL TRƯỚC khi sửa mã: đầu việc, write-set không trùng file, thứ tự (token + thành phần trạng thái chung + EmptyState Mít trước → màn GV ∥ màn phụ huynh → kiểm), tiêu chí đạt, rủi ro. Tránh sa đà tiểu tiết: Thấp ghi lại, không chặn.
3. **Mốc 2 – sửa:** worker `claude/claude-sonnet-5-5` (bypassPermissions, medium) sửa mã + test; tối đa 4 song song; commit theo đường dẫn.
4. **Mốc 3 – kiểm:** worker `codex/gpt-6-luna` (high, full-access) chụp after cùng danh sách màn, so prototype, chạy flow thật (đăng nhập GV demo + phụ huynh demo, lưu điểm danh/điểm/phiếu, lưu lỗi, offline), đo trạng thái hiện được. Bản `xcodebuild test` xanh.
5. **Review:** Codex `codex/gpt-6-luna` high, chỉ đọc, 1 review tổng thể cả lane, tối đa 2 vòng; tiêu chí gồm giá trị ghi cứng ngoài token.
6. Báo GL ở mỗi mốc: `Status` + `Summary` 2 câu, id ĐẦY ĐỦ của worker. Heartbeat của lead 15 phút.

## 5. Tiêu chí đạt
- Mọi màn trong audit đạt "khớp prototype" hoặc có lý do nền tảng iOS (ghi rõ); chi tiết buổi có phần ngày dạy.
- Mọi nút lưu/gửi/tạo có loading thấy được + "Đã lưu" + lỗi giữ editor + chờ đồng bộ/ngoại tuyến (bằng chứng ảnh/ghi hình hoặc script UI).
- Mọi empty dùng thành phần chung có Mít; selected dùng fill.
- Không còn mục Cao trong audit; review Codex không còn Chặn/Cao; `xcodebuild test` xanh (Staging, CODE_SIGNING_ALLOWED=NO).
- Ảnh before/after trong `plans/20261021-mvp/ios/ux-v2/shots/`, `handback.md` mỗi mục một dòng + commit.

## 6. An toàn
- Người dùng đang mở `ios/QuanLyLop.xcodeproj` trong Xcode và có 4 file chưa commit (Info.plist, Localizable.xcstrings, 2 entitlements): KHÔNG revert, KHÔNG chạy `xcodegen` trong worktree khi chưa hỏi GL; build/test trên bản sao (`/tmp/...`, rsync bỏ .git + xcodeproj) như lead cũ đã làm, hoặc hỏi GL trước.
- Không push/merge `main`, không TestFlight/App Store, không production.
- Cấm `env`/`printenv`/`set`, cấm `ps`/`pgrep -fl`/`pgrep -a`/`lsof` in dòng lệnh (đã 2 lần lộ khoá); creds demo `~/.config/qlh/staging-demo.txt` đọc qua đường không in; khoá 15 phút sau 5 lần sai.
- Không ghi SĐT/nội dung nhận xét vào log; ảnh dùng dữ liệu demo.

# Ledger lane iOS ux-v2
updatedAt: 2026-10-24T04:20Z · workspace: wks_835c3a721a27f564 · lead: Chu Du f7f993d1-b9f2-4e4a-9b76-4a42c1f8b2d1 · parent GL: 4350a256-dd3a-41d8-8827-4b118a422623 (thay 122e9fde từ 2026-10-24)
Brief: plans/20261021-mvp/briefs/81-lead-ios-ux-v2.md · heartbeat 62a9361b (15 phút, chỉ list_agents)

## Members

### ea63b950-8307-43ba-99b6-4f3c38283c2c · worker · Triệu Vân
- parent: f7f993d1 · recordedBy: f7f993d1
- profile: peer · runtime: codex/gpt-6-luna, mode full-access, thinking high · profile-deviation: GL addendum chỉ định luna cho chụp/đo
- INTENT: Mốc 0 chụp prototype 390px + proto-inventory.md
- status: archived · done — 25 ảnh (gồm ph-scores) + proto-inventory.md; thiếu login/student-detail/no-child, không kích hoạt lỗi/offline

### 7d05e4e8-de69-41b7-8ac4-42977ea36d4f · worker · Mã Siêu
- parent: f7f993d1 · recordedBy: f7f993d1
- profile: peer · runtime: codex/gpt-6-luna, mode full-access, thinking high · profile-deviation: như trên
- INTENT: Mốc 0 chụp iOS Staging (iPhone 16 + SE 3) + audit.md
- status: archived · done_with_concerns — 24 ảnh p16, audit 5 dòng; SE + trạng thái chưa có ⇒ A2

### df46b285-042a-4dca-8aed-997628aa0cc8 · worker · Hoàng Trung (A1)
- parent: f7f993d1 · recordedBy: f7f993d1
- profile: peer · runtime: claude/claude-sonnet-5-5, mode bypassPermissions, thinking medium · profile-deviation: GL chỉ định sonnet sửa mã
- INTENT: nền token state-*, Mít WebP, AppEmptyState Mít, nút lưu/SaveStatus, selected fill, chữ tắt avatar
- status: archived · DONE_WITH_CONCERNS — commit 7bf2933, 144 test/2 skip/0 lỗi; initials + tab bar giao B1/B3

### 1fda78b0-06c3-4ca7-927b-db6de501f170 · worker · Bàng Đức (A2)
- parent: f7f993d1 · recordedBy: f7f993d1
- profile: peer · runtime: codex/gpt-6-luna, mode full-access, thinking high · profile-deviation: GL addendum
- INTENT: hoàn tất audit before (mọi mã màn, SE, trạng thái), snapshot /tmp/qlh-a2-src
- status: archived · audit 32 mã, Cao 5/Vừa 9/Thấp 18; thiếu SE gv-classes/gv-session-attendance + gv-state-error ⇒ Mốc 3 chụp

### 7f209fa8-b919-49f4-82a9-7bd34eb6b80a · worker · Cam Ninh (B1)
- parent: f7f993d1 · recordedBy: f7f993d1
- profile: peer · runtime: codex/gpt-6-luna, mode full-access, thinking high · profile-deviation: GL cấm sonnet mới
- INTENT: briefs/B1.md — GV lớp/buổi/điểm danh/ngày dạy
- status: archived · commit b995239; CHƯA build/test (khoá build do B2 giữ) ⇒ Mốc 3 kiểm trên HEAD

### 505cd189-6461-4c64-b9a7-5d697f24c7d2 · worker · Từ Thịnh (B2)
- parent: f7f993d1 · recordedBy: f7f993d1
- profile: peer · runtime: codex/gpt-6-luna, mode full-access, thinking high · profile-deviation: GL cấm sonnet mới
- INTENT: briefs/B2.md — GV nhận xét/BTVN/điểm
- status: done (chưa archive) · commits a923dd9, 68082b9; Staging build OK, 151 test; 2 test guardian i18n đỏ do B3 ⇒ lead sửa 114646a

### 537310d3-475f-4258-983c-5b9c0a4a999b · worker · Đinh Phụng (B3)
- parent: f7f993d1 · recordedBy: f7f993d1
- profile: peer · runtime: codex/gpt-6-luna, mode full-access, thinking high · profile-deviation: GL cấm sonnet mới
- INTENT: briefs/B3.md — phụ huynh 2 tab + Auth
- status: archived · DONE_WITH_CONCERNS — commit 70beecb; build/test chưa chạy do lỗi B2 (TestsTabView.swift:469 savedNotice); chưa ảnh after; thiếu tên GV/lịch lớp trong model PH

Lead direct: 6f8c1e6 test(ios) bảng chuỗi theo lane trong LocalizationCatalogTests (typecheck OK, chưa chạy simulator).

Lead direct: 61a9db4 (DemoScreens guardianRegister), 114646a (Guardian.xcstrings: updatedAt vào strings + 2 khoá mới).

### 529f1257-ed92-409f-b239-861a71fc7d9e · worker · Hoàng Cái (C)
- parent: f7f993d1 · profile-deviation: luna theo GL
- INTENT: briefs/C.md — kiểm HEAD, ảnh after, flow thật
- status: archived · BLOCKED — Staging build/test 151/2 skip/0 lỗi (HEAD 114646a); đăng nhập app ở lại form ⇒ flow chưa kiểm; API curl login = 200

### d5f57dff-b4ce-4381-ac42-8fa1bc34d6b8 · worker · Lục Tốn (D)
- parent: f7f993d1 · profile-deviation: luna theo GL
- INTENT: briefs/D.md — chẩn đoán đăng nhập app (hồi quy/simulator/Maestro)
- status: running

### d5f57dff-b4ce-4381-ac42-8fa1bc34d6b8 (D) — archived · login ở lại form: khả năng cao Maestro tap khi bàn phím che nút, chưa kết luận tuyệt đối; dùng flow ios/maestro/staging/01-login.yaml

### 4e5ff6f2-9378-4df2-97b8-ae4df0160efc · worker · Chu Thái (C lượt 2)
- parent: f7f993d1 · profile-deviation: luna theo GL
- INTENT: briefs/C.md lượt 2 — ảnh after + flow thật với flow đăng nhập có sẵn
- status: running

### 4e5ff6f2 (C lượt 2) — archived · DONE_WITH_CONCERNS: 24 ảnh after; GV+PH đăng nhập OK (01-login.yaml); chưa kiểm: lỗi/ngoại tuyến (build endpoint-lỗi mở màn đăng nhập), PH Dynamic Type, no-child, 2 empty; "Đã lưu" chưa bắt khung
- Lead quyết: bảng điểm cuộn ngang = đúng prototype (hạ mục Cao audit); không có giờ kết thúc trong model ⇒ giữ giờ bắt đầu

### b7bf62fb-b666-45e2-806b-5892734fc4e0 · worker · Cam Ninh (E)
- parent: f7f993d1 · profile-deviation: luna theo GL
- INTENT: briefs/E.md — sửa "6A" đè status bar; chẩn đoán offline khi khởi động; bắt khung "Đã lưu"
- status: running

### b7bf62fb (E) — archived · E1 commit 1dda0c1 (header dưới status bar, 151/2/0 test); E2 nghiêng (ii): restoreSession lỗi mạng ⇒ màn đăng nhập (AuthService.swift:105-118) — ngoài phạm vi lane, báo GL; E3 chưa quay được (không có phiên)

### 83baa599-dad7-4b28-91c2-e8c65e5b3f41 · reviewer · sol (codex/gpt-6.1-sol, mode auto, thinking high)
- parent: f7f993d1 · profile-deviation: GL chỉ định sol
- INTENT: briefs/R.md — review cuối diff af8082a..1dda0c1, 10 tiêu chí, review.md
- status: running

Ghi chú (lead Tư Mã Ý, brief 82): backend staging đã có hợp đồng báo cáo theo khoảng buổi (report_batch) + email/quên mật khẩu (commit f5b5753, migrations 0003–0005); chi tiết plans/20261021-mvp/data-api/contract-changes.md. Việc iOS = task riêng SAU ux-v2 (đã đồng ý với GL); lane này không làm.

### 83baa599 (reviewer sol) — archived · review.md: CHƯA giao được; 2 Cao (điểm danh thiếu bản ghi không bật Lưu TeacherAttendanceView:53,103; PH danh sách buổi không mở BTVN chưa gửi phiếu GuardianPages:79/98) + Vừa/Thấp; 1 tiêu chí ĐẠT (6)

### e7339cbc-099c-47c9-83e7-531e27d4d99b · worker · Ngụy Diên (Ga)
- parent: f7f993d1 · profile-deviation: luna theo GL
- INTENT: briefs/Ga.md — điểm danh dirty, SaveStatus lỗi mạng vs từ chối, success timing, token Core
- status: running

### 2377d490-e86c-4514-a788-6a5f8f2edac2 · worker · Mã Đại (Gb)
- parent: f7f993d1 · profile-deviation: luna theo GL
- INTENT: briefs/Gb.md — PH danh sách buổi có action, empty Mít, selected con, đổi MK success, token
- status: running
- Sau Ga+Gb: F (briefs/F.md restoreSession, Keychain, lớp ZZ-offline) → review sol hẹp 1 vòng

### 2377d490 (Gb) — archived · commits be81b2b (Guardian), 3ed9de2 (Auth); 156 test/2 skip/0 lỗi; không ghi lượt test đỏ trước sửa; không chụp Dynamic Type PH

### e7339cbc (Ga) — archived · commit 19a9ba8; 154 test/2 skip/0 lỗi trên snapshot nền (chưa tích hợp với Gb); test đỏ→xanh điểm danh; lỗi mạng ≠ từ chối lệnh; success hold

### 93f7f7ee-1331-4445-8999-b9abdfadc4e7 · worker · Lữ Mông (F)
- parent: f7f993d1 · profile-deviation: luna theo GL
- INTENT: briefs/F.md — restoreSession offline (Keychain), lượt build+test tích hợp HEAD 19a9ba8, kiểm UI offline trên lớp ZZ-offline
- status: running

### 93f7f7ee (F) — archived · commit 5991ede (Keychain cache danh tính, 401/403, /me nền); 4 test đỏ→xanh; Staging tích hợp 160 test/2 skip/0 lỗi; UI smoke chưa (CUA timeout)

### d8ca830b-1ab2-4558-bfb1-64ec3a253706 · worker · Từ Hoảng (H)
- parent: f7f993d1 · profile-deviation: luna theo GL
- INTENT: briefs/H.md — bằng chứng chạy thật HEAD 5991ede (offline mở lạnh, lưu offline, "Đã lưu", PH Dynamic Type…), không sửa Swift
- status: running
- 2026-10-24: lane TẠM DỪNG theo người dùng/GL; xem handback.md.

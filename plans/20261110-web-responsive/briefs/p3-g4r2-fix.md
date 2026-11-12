# Pha 3 · sửa sau G4 vòng 2 (QL-004)

Worktree: `/Users/phamnhuphong/Git/qlh-wt/web-responsive` (nhánh `feat/web-responsive-layout`, HEAD 28fdd4d). Làm trực tiếp trên nhánh này.
Đọc: `/Users/phamnhuphong/.claude/paseo-ops/dev.md`, `AGENTS.md`, `briefs/p3-common.md` (luật + "Giữ hành vi"), báo cáo `/tmp/qlh-evidence/ql-004/review/g4-r2.md` (script tái hiện ở `/tmp/qlh-evidence/ql-004/review/r2/`: `m6b.mjs`, `m2hw.mjs`, `m45b.mjs`), `docs/architecture.md` mục đồng bộ (offline-first, không sync định kỳ).

## Việc phải sửa
1. **M8** `src/data/sync.ts` (~:247, :264, :321, :545): sự kiện `online` với outbox rỗng làm trạng thái `error → success` mà không fetch gì → "Không tìm thấy buổi học", mất Thử lại. Đích: chỉ đặt `success` khi round thật sự tải (snapshot/pull) thành công; round không fetch giữ nguyên trạng thái trước. Khi đang `error` mà có `online`, được phép thử tải lại thật (đây là trigger có sẵn, không thêm sync định kỳ). Test vitest cho cả 2 đường.
2. **M7** `SessionDetailPage.tsx:142-167`: nháp BTVN gõ ở <1024 rồi sang ≥1024 bị mồ côi, Lưu trong hộp "Chưa lưu thay đổi" không làm gì. Sửa gốc, không vá: nháp BTVN + hàm lưu ở một chỗ dùng chung trên lớp chọn trình bày (cả cây mobile và desktop đọc/ghi cùng nháp, đúng một hàm lưu trả kết quả thật). Đổi khổ cả hai chiều (390↔834↔1440) nháp vẫn hiện ở cây đang hiển thị, Lưu trong hộp lưu được, lưu lỗi thì ở lại.
3. **m7** (thanh tab 2 lần ở 1440, tab Nhận xét/BTVN): khung chi tiết buổi vẽ đúng một thanh tab ở mọi khổ, mọi tab.
4. **m6** `CriteriaSetSettingsPage.tsx:82-111`: menu "…" dùng `useDismiss` có sẵn (bấm/chạm ra ngoài thì đóng), có ↑/↓ giữa các mục role=menuitem, Escape trả focus về nút ⋯.
5. Live region `role=status` trùng ở mobile (RefreshButton ẩn bằng CSS vẫn trong cây a11y): chỉ còn một.

Không làm: m8 (`desktopOnly.module.css` selector), n3, NIT khác (ghi tồn). Không đổi nhãn, nghiệp vụ, API. Chỉ `src/`, `scripts/`, test; không đụng iOS/worker, không sửa `plans/`, `ops/`.

## Gate G2 (bắt buộc, chỉ làm chặt)
Thêm vào `scripts/layout-gate.mjs` + fixtures, mỗi cái có kiểm ngược (tạm khôi phục lỗi → đỏ đúng, rồi bỏ):
- chụp tab **Nhận xét** và **BTVN** ở 390/834/1440 (đo hình học như tab Điểm danh) + luật "đúng một tablist trong khung chi tiết buổi";
- **homework-draft-breakpoint**: gõ nháp BTVN ở 834 → đổi 1194/1440 → nháp còn hiện → rời màn → hộp → Lưu → rời màn và dữ liệu đã ghi; và chiều 1440 → 834;
- **online-after-initial-error**: mọi endpoint lỗi, cache trống → màn lỗi có Thử lại → dispatch `online` → không bao giờ hiện "Không tìm thấy" khi chưa tải thành công;
- menu tiêu chí: bấm ra ngoài thì đóng, ↓ chuyển focus.

## Việc dọn + kiểm (ghi đạt/không vào handback)
- Dừng máy chủ Vite cổng 5311 (reviewer để lại): lấy PID duy nhất bằng `lsof -t -iTCP:5311 -sTCP:LISTEN` (chỉ cờ `-t`, không liệt kê tiến trình khác), `kill <PID>`, xác nhận cổng trống. Cấm `pkill -f`, `pgrep -f`, `killall`, `ps`, `env/printenv/set`.
- Chạy luồng đăng xuất → đăng nhập lại qua UI ở local (fixtures của gate / mock local, KHÔNG dev/staging/prod): sau đăng nhập lại trạng thái đồng bộ không mang lỗi/thành công của phiên cũ, màn buổi học tải đúng.
- Ảnh tự soi: `/tmp/qlh-evidence/ql-004/g4r2-fix/` (nén trước khi xem).

## Nghiệm thu
`npx vitest run --maxWorkers=4` 0 fail (file timeout do tải máy: chạy lại riêng file, ghi rõ) · `npm run build` 0 · `LAYOUT_GATE_OUT=/tmp/qlh-evidence/ql-004/g4r2-fix/gate npm run test:layout` 0 vi phạm · `node /tmp/qlh-evidence/ql-004/review/r2/m6b.mjs` và `m2hw.mjs` không còn tái hiện (chỉnh cổng nếu cần, không sửa repo vì script).
Commit conventional tiếng Anh (có thể 2–3 commit), không nhắc AI, không push.

## Giới hạn
Tối đa **2 giờ**. Kẹt 3 lần cùng một lỗi, hoặc gate cần nới luật → dừng, BLOCKED kèm số đo. Không tạo agent khác. Không in secret, không đọc `~/.config/qlh/*`.
Handback ≤10 dòng: DONE|BLOCKED · commit · từng mục 1–5 + gate + dọn/kiểm đạt/không · lệnh + kết quả · ảnh.

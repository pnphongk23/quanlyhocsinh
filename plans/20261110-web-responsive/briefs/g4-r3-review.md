# G4 vòng 3 · reviewer độc lập (QL-004), CHỈ ĐỌC

Worktree: `/Users/phamnhuphong/Git/qlh-wt/web-responsive`, nhánh `feat/web-responsive-layout`, HEAD `578d814`. So với vòng 2 (28fdd4d): `8e79ba1` (M8 sync), `8514cf2` (M7 nháp BTVN dùng chung, một thanh tab, menu tiêu chí useDismiss + ↑/↓, live region), `2dde07e` (hộp "Chưa lưu" chỉ lưu phần dở), `578d814` (gate G2 mới).
Đọc: báo cáo vòng 2 `/tmp/qlh-evidence/ql-004/review/g4-r2.md` (script ở `r2/`), vòng 1 `/tmp/qlh-evidence/ql-004/review/g4.md`, `docs/architecture.md` mục đồng bộ (offline-first: lưu = Dexie + outbox), `design/ux-v2/rules.md`, mock `design/responsive-mock/`, `plans/20261110-web-responsive/briefs/p3-common.md` mục "Giữ hành vi".

## Chấm (thao tác thật bằng Playwright local, ghi bằng chứng)
1. M8: cache trống + mọi endpoint lỗi → màn lỗi có Thử lại → `online` → không "Không tìm thấy", vẫn Thử lại; Thử lại khi máy chủ lành → tải đúng.
2. M7: nháp BTVN 834→1194→1440 và 1440→834: nháp hiện ở cây đang hiển thị; rời màn → hộp → Lưu → rời màn, dữ liệu ghi; lưu cục bộ lỗi (abort IDB) → ở lại, nháp còn.
3. m7: đúng một thanh tab ở mọi tab × 3 khổ. m6: menu tiêu chí bấm/chạm ngoài đóng, ↑/↓, Escape trả focus. Live region trạng thái không trùng ở mobile.
4. Hồi quy: M1–M6 vòng 1 vẫn đạt; MINOR m2–m5 và NIT n1–n2 vòng 1 kiểm từng mục (vòng 2 chưa kiểm); hộp "Chưa lưu" khi chỉ điểm danh dở / chỉ BTVN dở / cả hai.
5. Bố cục 3 khổ (390/834/1440) các route của 2 luồng, gồm tab Nhận xét/BTVN, so mock. Ảnh nén trước khi xem.
6. Gate: kiểm ngược đã có ở `/tmp/qlh-evidence/ql-004/g4r2-fix/mut-*.log`; đánh giá kịch bản có mô phỏng đúng kiến trúc không.
Đã biết, không tính là phát hiện mới (ghi lại nếu nặng hơn): m8 selector `[class*="action"]`, n3 editor tiêu chí nội tuyến, nháp chấm điểm desktop không hiện ở cây di động (Lưu vẫn lưu), breadcrumb cách không đều.

## Luật
Chỉ đọc: không sửa repo (kể cả tạm), không commit. Script/ảnh/log chỉ ở `/tmp/qlh-evidence/ql-004/review/r3/`. Chỉ test local (vite + fixtures của `scripts/layout-gate*`), không bao giờ dev/staging/prod. Máy chủ vite tự mở thì dùng cổng 5321 và tự dừng đúng PID mình tạo khi xong (giữ PID từ lúc mở; không `pkill -f`/`pgrep -f`/`killall`/`ps`/`lsof`). Cấm env/printenv/set, không đọc `~/.config/qlh/*`, không in secret. Không dùng sleep để chờ.
Hạn cứng **90 phút**. Ghi báo cáo dần vào `/tmp/qlh-evidence/ql-004/review/g4-r3.md` (cập nhật sau mỗi mục, để hết giờ vẫn có kết quả).
Verdict: PASS | PASS_WITH_NITS | FAIL, mức BLOCKER/MAJOR/MINOR/NIT, mỗi phát hiện có file:dòng + bước tái hiện + bằng chứng. Trả lời cuối ≤12 dòng.

# G4 vòng 4 (hẹp) · reviewer độc lập (QL-004), CHỈ ĐỌC

Worktree `/Users/phamnhuphong/Git/qlh-wt/web-responsive`, HEAD `77fffbc` (so với vòng 3 `578d814`: `PageShell` header thành container `page-header`, nút "Tải lại" chi tiết buổi dùng container query đó; gate thêm luật nút Tải lại + kịch bản `refresh-button-breakpoint`, kiểm ngược `/tmp/qlh-evidence/ql-004/g4r3-fix/mut-refresh.log`).
Đọc: báo cáo vòng 3 `/tmp/qlh-evidence/ql-004/review/g4-r3.md` (script `r3/`), vòng 1 `/tmp/qlh-evidence/ql-004/review/g4.md` (mục m5), `docs/architecture.md` mục đồng bộ.

## Chấm (Playwright local, thao tác thật)
1. M9: chi tiết buổi học ở 1194 và 1440 có nút "Tải lại" thấy được, bấm được, bấm thì tải lại thật và đúng một trạng thái; 390/834 không có nút, kéo-để-tải-lại vẫn chạy. Khi đồng bộ lỗi, nút + trạng thái lỗi hợp lý.
2. Hồi quy do đổi `PageShell` header thành container (`container-type: inline-size` ảnh hưởng mọi màn dùng PageShell): tiêu đề/nút hành động ở các route Cài đặt (menu, Đổi mật khẩu, Email, Bộ tiêu chí) và chi tiết buổi học, 390/834/1440: không co, không cắt, không mất nút, nút hành động tiêu đề khác vẫn đúng chỗ.
3. Giữ kết quả vòng 3: một thanh tab (3 tab × 3 khổ), live region không trùng, M7/M8 (chạy lại `r3/m8.mjs`, `r3/m7.mjs` nếu chạy được).
4. m5 vòng 1 (vòng 3 chưa kiểm).
Đã biết, không tính mới: m4 (nợ hai cây), m8 selector, n3, nháp chấm điểm desktop → cây di động, breadcrumb, 3 NIT vòng 3.

## Luật
Chỉ đọc, không sửa repo. Script/ảnh/log ở `/tmp/qlh-evidence/ql-004/review/r4/`. Chỉ local. Vite tự mở thì cổng 5341, dừng đúng PID mình giữ khi xong; script mượn từ r3 phải dừng vite của nó. Cấm env/printenv/set/ps/lsof/pgrep -f/pkill -f/killall, không đọc `~/.config/qlh/*`, không in secret, không sleep để chờ (chờ theo phần tử).
Hạn cứng **45 phút**. Ghi dần vào `/tmp/qlh-evidence/ql-004/review/g4-r4.md`. Verdict PASS | PASS_WITH_NITS | FAIL, mức BLOCKER/MAJOR/MINOR/NIT, file:dòng + bước tái hiện + bằng chứng. Trả lời cuối ≤10 dòng.

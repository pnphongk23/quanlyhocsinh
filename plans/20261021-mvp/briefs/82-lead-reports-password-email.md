# Brief 82 · Lead mới: Báo cáo theo khoảng buổi + Quên mật khẩu qua email (Opus)

Người giao: General Lead `122e9fde-ee5d-4862-8586-c25365e6a20b`. Ngày 2026-10-24. Quyết định người dùng 24/10 đã ghi vào `docs/spec.md` + `docs/architecture.md` (THƯ MỤC CHÍNH `/Users/phamnhuphong/Git/quanlyhocsinh`, chưa commit; bản trong worktree là cũ). Đọc spec mục "Nhận xét và báo cáo", "Tài khoản", 5.x, 7, 8, 10 mục 6/6b; architecture các dòng Đăng nhập, Báo cáo, Tài khoản và mật khẩu.

## 1. Quyết định người dùng (2026-10-24, đừng đảo)
**Báo cáo**
1. Giáo viên tự thêm báo cáo ở tab Báo cáo của lớp; bỏ bộ chọn Tháng / 3 tháng.
2. "Thêm báo cáo" → chọn buổi bắt đầu và buổi kết thúc (hiện số buổi + ngày), mặc định từ Buổi 1 tới buổi đã diễn ra gần nhất. Một lần thêm = cả lớp: mỗi học sinh đang học trong khoảng một bản nháp riêng (nhận xét chung, xem trước, phát hành từng em/cả lớp, phát hành lại — giữ như hiện nay). Số liệu tính trong các buổi chưa hủy thuộc khoảng. Cho phép trùng khoảng. Tên hiện theo khoảng: "Buổi 1–8 · 01/10–24/10".
3. Xem trước báo cáo mở POPUP (dialog desktop, sheet toàn màn mobile), không hiện nối bên dưới.
4. Phụ huynh: danh sách báo cáo đã phát hành của con theo khoảng buổi (thay chọn tháng).

**Quên mật khẩu**
5. Mỗi tài khoản (GV, phụ huynh) lưu được 1 email trong Cài đặt khi đang đăng nhập (ô email tuỳ chọn ở màn đăng ký). Email chỉ để lấy lại mật khẩu.
6. Màn Quên mật khẩu: nhập SĐT → nếu có email: "Gửi link đặt lại mật khẩu tới t***@gmail.com?" (che) + ô email (máy đã từng đăng nhập tài khoản này nhớ email và điền sẵn đầy đủ) + nút Gửi. Chỉ gửi khi email nhập KHỚP email đã lưu; KHÔNG cho đặt email mới ở màn này (chống chiếm tài khoản).
7. Email chứa LINK dùng một lần, hạn 30 phút (không gửi mật khẩu). Mở link → đặt mật khẩu mới → thu hồi mọi phiên cũ. Chưa có email → báo liên hệ người vận hành (đặt lại thủ công giữ làm dự phòng). Throttle theo SĐT + IP.
8. Gửi mail: Cloudflare Email Service (skill `cloudflare:cloudflare-email-service`). Miền gửi CHƯA có — GL đang hỏi người dùng. Không chặn phần còn lại: làm sau một interface gửi mail; staging chưa có miền thì có chế độ kiểm thử không in token/email ra log (vd lưu vào bảng chỉ đọc được bằng lệnh vận hành, hoặc test với binding giả). Đề xuất cách trong plan.

## 2. Phạm vi
- Backend `mvp-backend` (worker + D1 migration + test), web `mvp-web` (src/data + UI), prototype `design/prototype` (thư mục chính, không commit ở đó) cho các màn mới: tab Báo cáo GV, popup xem trước, danh sách báo cáo phụ huynh, Cài đặt email, Quên mật khẩu, Đặt mật khẩu mới.
- iOS: KHÔNG làm lúc này (lead iOS đang làm ux-v2; người dùng nói mobile làm sau). Nhưng MỌI thay đổi hợp đồng API/sync phải ghi `plans/20261021-mvp/data-api/contract-changes.md` (mục mới 2026-10-24) để lead iOS làm sau; ưu tiên tương thích ngược hoặc ghi rõ chỗ phá vỡ. Báo GL khi hợp đồng chốt.
- Dữ liệu cũ: báo cáo tháng đã có trên staging phải chuyển sang mô hình mới (khoảng buổi tương ứng tháng) hoặc vẫn đọc được; nêu cách trong plan.
- Ngoài phạm vi: OTP/SMS, xác minh email bằng mã, nhận xét tổng hợp AI, iOS, production.

## 3. Cách làm (paseo-team)
1. Mốc 0: đọc mã hiện tại (backend reports/report_publications/auth, web reports/settings/auth, prototype ReportsPage), viết `plans/20261021-mvp/reports-email/plan.md` (≤ 600 từ): hợp đồng API mới (endpoint, payload, lỗi), migration D1 (một chuỗi, không song song), write-set từng worker không trùng file, thứ tự, kiểm, rủi ro, chuyển dữ liệu cũ, phương án gửi mail khi chưa có miền. Gửi GL TRƯỚC khi sửa mã.
2. Thứ tự gợi ý: backend (migration + API + test) → web data → web UI ∥ prototype → kiểm → review → deploy staging (xin GL).
3. Model (ý người dùng): sửa mã `claude/claude-sonnet-5-5` (bypassPermissions, medium); đo/chụp/smoke `codex/gpt-6-luna` (high, full-access); reviewer Codex `codex/gpt-6-luna` high chỉ đọc, 1 review tổng thể (trọng tâm: phân quyền, chiếm tài khoản, token reset, throttle, lộ email/SĐT), tối đa 2 vòng. Tối đa 4 worker song song.
4. UI: đọc `design/tokens/` + `design/ux-v2/rules.md` (mục 6 trạng thái) trước; chỉ dùng token; trạng thái loading/"Đã lưu"/lỗi/empty có Mít theo hệ chung.

## 4. Tiêu chí đạt
- Test backend: tạo đợt báo cáo theo khoảng, mặc định Buổi 1, trùng khoảng, học sinh vào/rời giữa khoảng, buổi hủy; phát hành/phát hành lại; phụ huynh chỉ thấy bản đã phát hành của con mình. Reset: SĐT không có email, email không khớp, token hết hạn, dùng lại token, throttle, thu hồi phiên; không lộ email đầy đủ cho người chưa đăng nhập.
- Web + prototype: các màn mục 2 chạy thật, ảnh 390 + 1280; popup xem trước; trạng thái chuẩn.
- typecheck/test/build xanh cả backend + web; prototype test xanh; review Codex không còn Chặn/Cao; staging: E2E thật (tạo báo cáo, phát hành, phụ huynh xem; lưu email, quên mật khẩu tới bước gửi).
- `contract-changes.md` đủ để lead iOS làm.

## 5. An toàn
- Hai lead khác đang sửa `mvp-web` (UI 24/10 `8237ac1e-1925-4ba5-8ecc-3d896af02bda`, Data `6d1ef147-7928-4b12-9063-7214eb1d8633`): bắt đầu sửa mvp-web sau khi GL báo đợt deploy hiện tại xong, hoặc làm trên worktree/nhánh riêng tách từ HEAD `mvp-web` rồi GL gộp — nêu lựa chọn trong plan. Commit theo đường dẫn, cấm `git add -A`/stash/reset/checkout ở cây dùng chung.
- Không push/merge `main`, không production. Deploy staging chỉ khi GL đồng ý; build từ worktree sạch đúng commit.
- Cấm `env`/`printenv`/`set`/`ps`/`pgrep -fl|-a`/`lsof` in dòng lệnh; không in token, email đầy đủ, SĐT, mật khẩu ra log/báo cáo. Creds demo `~/.config/qlh/staging-demo.txt` (đọc không in; khoá 15 phút sau 5 lần sai).
- Heartbeat của lead 15 phút; báo GL mỗi mốc bằng `Status` + `Summary` 2 câu, id worker ĐẦY ĐỦ.

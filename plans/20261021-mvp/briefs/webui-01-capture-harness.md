# webui-01 · Bộ chụp màn dùng chung + ảnh TRƯỚC (Team T-shot)

Lead: Domain Lead Web UI audit. Kế hoạch: `plans/20261021-mvp/web/ui-audit/plan.md` (đọc trước).
Worktree làm việc: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh `mvp-web`). Không `cd` sang checkout main để sửa mã.

## Việc
1. Dựng `scripts/ui-audit-capture.mjs` (Playwright đã có trong devDependencies; xem `scripts/e2e-staging-ui.mjs` để học cách đăng nhập/điều hướng). Tham số: `--team T|A|B|C|all`, `--phase before|after`, `--base <url>`, `--out <dir>`.
   - Nguồn dữ liệu, theo thứ tự ưu tiên:
     a. Local: `npm run dev -- --port 5181` + máy chủ giả cục bộ trả dữ liệu đủ để mọi màn có nội dung thật (≥ 2 lớp, lớp có ≥ 6 học sinh, buổi đã qua/hôm nay/sắp tới/huỷ, bài kiểm tra có điểm lẻ, phiếu nhận xét, BTVN, báo cáo đã phát hành, phụ huynh có 2 con và phụ huynh chưa liên kết con). Có thể chặn request bằng `page.route` thay vì dựng server riêng. Dùng SĐT giả dạng `0900000xxx`, tên giả.
     b. Staging `qlh-staging-web` chỉ khi có file tài khoản `QLH_STAGING_CREDENTIAL_FILE` (mặc định `/tmp/qlh-staging-demo.txt`, hiện KHÔNG có). Đọc không in; tối đa 2 lần đăng nhập mỗi tài khoản; khoá 15 phút sau 5 lần sai.
   - Viewport: mobile 390×844, 375×667, 430×932 (deviceScaleFactor 2, isMobile, hasTouch, mô phỏng safe-area: thêm `padding` giả hoặc CSS `env()` override bằng `page.addStyleTag` đặt `--safe-*`/ghi chú nếu không mô phỏng được) và desktop 1440×900. Team B chỉ desktop; A, C mobile (C thêm desktop cho phụ huynh/tài khoản); T chụp shell/tab dưới/sheet/dialog/menu ⋯ ở cả hai.
   - Chụp cả trạng thái: màn chính, cuộn tới đáy (full page + viewport cuối danh sách để thấy FAB/tab dưới), sheet/dialog/menu mở, form có lỗi, trạng thái trống, offline nếu có, bàn phím (focus ô nhập ở mobile).
   - Tên ảnh: `<team>/<viewport>/<nn>-<man>-<trang-thai>.png`, ví dụ `A/390x844/07-class-students-scrolled.png`.
2. Chạy `--phase before --team all`, lưu vào `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/shots/ui-audit/before/`.
3. Viết `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit/inventory.md`: bảng mọi màn (team, route, tên file nguồn chính, trạng thái đã chụp, file ảnh). Liệt kê màn KHÔNG chụp được và lý do.
4. Ghi thêm đo đạc thô giúp audit: với mỗi ảnh mobile có FAB, ghi toạ độ bounding box của FAB và của phần tử bấm được gần nhất bị chồng (dùng `elementFromPoint`/`getBoundingClientRect`) vào `inventory.md` mục "Đo chồng lấn". Ghi bề rộng lề trái của header, tab lớp và thẻ đầu tiên ở 390px.

## Ràng buộc
- Chỉ được tạo/sửa: `scripts/ui-audit-capture.mjs`, file fixture mới dưới `scripts/ui-audit-fixtures/`, thư mục ảnh và `inventory.md` trên. KHÔNG sửa `src/**`, `design/**`, `package.json` (nếu cần thêm dependency thì báo lead).
- Không commit. Không in secret/SĐT thật; ảnh không được chứa SĐT thật (local dùng dữ liệu giả).
- Không polling/sleep để chờ agent khác.

## Xong khi
- Lệnh `node scripts/ui-audit-capture.mjs --phase before --team all` chạy lại được từ đầu (ghi lệnh + thời gian chạy vào inventory).
- Có ảnh cho mọi màn trong spec mục 8 thuộc phạm vi; inventory đầy đủ.

Kết thúc bằng:
```
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: 1–2 câu (số màn, số ảnh, lệnh chạy)
Concerns/Blockers: tuỳ chọn
```

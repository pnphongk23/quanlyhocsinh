# Brief 80 · Lead "UI feedback 24/10 + hệ trạng thái chung" (Opus)

Người giao: General Lead `122e9fde-ee5d-4862-8586-c25365e6a20b`. Ngày 2026-10-24. Quyết định người dùng trong file này THẮNG brief cũ khi lệch; spec nghiệp vụ không đổi.

Đọc trước: `AGENTS.md`, `docs/spec.md`, `docs/architecture.md` (THƯ MỤC CHÍNH `/Users/phamnhuphong/Git/quanlyhocsinh`, bản trong worktree có thể cũ), skill `paseo-team`, `/paseo`, skill `app-design` (SKILL.md + `references/visual-interaction-performance.md`, `references/assets-verification.md`), skill `design-ui-ux` khi cần. Bối cảnh lane UI trước: `web/ui-audit/handback.md`, `web/ui-audit/save-states-plan.md`, token chung `design/tokens/`.

## 1. Bằng chứng (ảnh người dùng)

Ảnh gốc: `plans/20261021-mvp/web/ui-feedback-20261024/user-refs/`. Ảnh chụp web desktop giáo viên trên staging `https://qlh-staging-web.pages.dev` (mvp-web `f31150e`).

| # | Ảnh | Người dùng nói | Phân tích của GL | Kết quả cần đạt |
|---|---|---|---|---|
| F1 | `01-sidebar-subnav.png` | Cụm Điểm danh / Điểm số / Học sinh / Báo cáo ẩn đi, chọn lớp rồi mới hiện, thụt vào vì là mục con của item chính | Sidebar hiện 4 mục lớp ngang hàng "Lớp" kể cả khi chưa chọn lớp (đã có lần sửa chỉ làm mờ, xem status 23/10 sidebar fix a11a28d — người dùng muốn ẨN hẳn). Code: `src/roles/staff/StaffShell.tsx` (~dòng 72 "Đang xem lớp") | Chưa chọn lớp: chỉ "Lớp", "Cài đặt". Đã chọn lớp: 4 mục con hiện dưới "Lớp", thụt lề, phân cấp rõ (cỡ chữ/indent theo token), mục con đang mở có trạng thái selected |
| F2 | `02-sidebar-fit-edge.png` | Sidebar bị bo góc, không fit edge; cho fit vào | Sidebar là thẻ nổi có lề + bo góc trái; người dùng muốn sát mép cửa sổ | Sidebar desktop sát mép trái/trên/dưới, không bo góc phía mép, phân tách nội dung bằng nền/đường kẻ token |
| F3 | `03-selected-card-state.png` | Trạng thái selected của container (thẻ lớp) không dùng stroke; dùng màu khác giống thanh navigation | Thẻ "Lớp 1 Big Uni" selected dùng viền xanh; nav item selected dùng nền xanh nhạt. Hai kiểu selected khác nhau | Một kiểu selected chung: nền tô (fill) theo token, không viền đậm. Áp cho mọi phần tử chọn được: nav, thẻ lớp, chip, hàng danh sách, segmented |
| F4 | `04-score-table-column-width.png` | Cột tên học sinh chiếm quá nhiều diện tích; fit theo nội dung; người dùng tự kéo độ rộng như Excel | Bảng điểm desktop chia cột theo tỉ lệ nên cột tên rất rộng | Cột tên rộng theo nội dung (có min/max), cột bài kiểm tra gọn; kéo mép tiêu đề cột để đổi độ rộng (chuột; bàn phím nếu rẻ); độ rộng nhớ trên máy theo lớp (localStorage, không lên máy chủ) |
| F5 | `05-class-header-current-session.png` | Bỏ breadcrumb "Lớp / Lớp 1 Big Uni / Buổi học" và dòng phụ "2 học sinh · Thứ Hai, Thứ Năm 18:30 · hôm nay Thứ Bảy 24/10" | Trùng thông tin với sidebar + thẻ Lịch lặp | Đầu trang lớp chỉ còn tên lớp + nút (⋯, Thêm buổi lẻ) + tab |
| F6 | `05-…png` + `06-current-session-single-action.png` | Chữ "Buổi hiện tại" phải cùng kiểu với "Các buổi đã qua"; thẻ buổi hiện tại chỉ 1 hành động "Xem buổi" | "Buổi hiện tại" đang là nhãn nhỏ; "Hủy buổi" là nút thứ hai to | Tiêu đề thẻ cùng kiểu chữ tiêu đề thẻ (token). Thẻ chỉ còn "Xem buổi"; "Hủy buổi" chuyển vào menu ⋯ của buổi / trang chi tiết buổi (chức năng hủy vẫn phải còn, spec 5 hủy không đảo ngược) |
| F7 | `07-empty-states.png` | Cùng là empty nhưng khác nhau; buộc đồng nhất, có mascot | Tab Nhận xét: dòng chữ trơn "Không có học sinh trong mục này."; BTVN: mascot Mít + tiêu đề + mô tả + nút | Một mẫu empty duy nhất (`shared/ui/EmptyState.tsx` hiện có): Mít WebP + tiêu đề + mô tả + hành động tuỳ chọn; có biến thể gọn cho ô/khung nhỏ nhưng vẫn có Mít. Rà và thay MỌI chỗ empty tự viết |
| F8 | (lời người dùng, không ảnh) | Bấm lưu buổi học / lưu điểm không hề có loading | Web đã có `useSaveAction` (saving đúng từ lúc bấm đến hết lần lưu) nhưng lưu ghi cục bộ (Dexie/outbox) xong trong vài ms nên người dùng không thấy gì. GIẢ THUYẾT, lead phải đo và xác nhận | Hệ trạng thái hành động chuẩn: idle → loading (spinner + nút khoá, hiện tối thiểu đủ để thấy, gợi ý ≥ 300–400 ms, không làm chậm lưu thật) → thành công (phản hồi "Đã lưu" ngắn) / lỗi (giữ dữ liệu, cho thử lại) + trạng thái "chờ đồng bộ"/offline khi chưa lên máy chủ. Áp mọi nút lưu/gửi/tạo; web + mobile web như nhau |
| F9 | (lời người dùng) | Nhập điểm từng cột: Enter/↓ chuyển xuống học sinh tiếp; ↑↓←→ di chuyển như Excel | Bảng điểm desktop + màn nhập điểm mobile | Enter và ↓ xuống hàng dưới cùng cột; ↑ lên; ← → sang cột khi con trỏ ở đầu/cuối ô (hoặc ô đang chọn, theo Excel); Tab giữ hành vi chuẩn; ô cuối không nhảy lung tung; giá trị sai (ngoài 0..max, không bước 0,5) vẫn báo lỗi như hiện tại, không mất dữ liệu khi di chuyển. Mobile: nút "Tiếp" bàn phím số chuyển xuống học sinh tiếp nếu nền tảng cho phép |

## 2. Hệ trạng thái chung (người dùng: "áp dụng chung cho tất cả project", triển khai + test đồng bộ)

- Nguồn chuẩn duy nhất: `design/tokens/` (tokens.json/tokens.css + `ios-mapping.md`). Thêm token trạng thái theo vai trò (chỉ THÊM, không đổi tên token cũ): selected (fill), hover, pressed, focus-visible, disabled, loading, success, error, empty.
- Bảng "state contract" theo loại thành phần (nút chính/phụ/nguy hiểm, nav item, thẻ chọn được, chip/segmented, hàng danh sách, ô nhập, ô bảng điểm, dialog/sheet) — mỗi ô ghi trạng thái nào áp dụng và token nào. Đặt ở `design/tokens/states.md`.
- Phạm vi "tất cả project" GL hiểu là: (a) web thật `mvp-web` — làm ngay; (b) prototype `design/prototype` — làm cùng để giữ làm chuẩn tham chiếu; (c) iOS `mvp-ios` — chỉ cập nhật `ios-mapping.md` cho token mới, CHƯA sửa UI iOS (chờ người dùng duyệt iOS theo prototype mới). (d) Skill `app-design` dùng cho mọi dự án: lead soạn đề xuất bổ sung mục "interactive component states" (selected bằng fill, loading tối thiểu cho thao tác lưu cục bộ, empty thống nhất có minh hoạ) vào `plans/20261021-mvp/web/ui-feedback-20261024/app-design-states-proposal.md`; GL trình người dùng rồi mới sửa skill toàn cục (không tự sửa `~/.claude/skills`).
- Test đồng bộ: một bộ kiểm trạng thái chạy được trên cả prototype và web (mở rộng `npm run test:save`/`test:click` hoặc script mới), chụp before/after theo cùng danh sách màn ở 390 px và 1280 px.

## 3. Ngoài phạm vi
- Không đổi nghiệp vụ, API, dữ liệu máy chủ, hợp đồng repository (`src/data/**` của mvp-web thuộc lead Data — cần đổi thì qua GL).
- Không sửa UI iOS, không làm màn phụ huynh mới, không đụng mục "Làm sau".
- Không làm lại toàn bộ design system; chỉ những gì F1–F9 + bảng trạng thái cần. Tránh sa đà tiểu tiết: mục Thấp ghi lại, không chặn.

## 4. Cách làm (theo paseo-team)
1. Mốc 0 (lead, ≤ 30 phút): đọc bằng chứng, xác nhận F8 bằng đo thật (luna), viết `plan.md` trong `web/ui-feedback-20261024/`: scope, đầu việc, write-set mỗi worker (không trùng file), thứ tự, tiêu chí đạt, rủi ro. Gửi GL trước khi giao sửa.
2. Đầu việc gợi ý (lead tự chia lại nếu có lý do): T = token trạng thái + `states.md` + EmptyState/Button/nav dùng chung; A = khung desktop GV (F1, F2, F3, F5, F6); B = bảng điểm (F4, F9); C = trạng thái lưu (F8) + rà empty (F7). Tối đa 4 worker song song.
3. Model (ý người dùng): worker sửa mã `claude/claude-sonnet-5-5`; chụp ảnh/đo/smoke `codex/gpt-6-luna`; REVIEWER = Codex (`codex/gpt-6-luna`, high, chỉ đọc), review tổng thể 1 lần cho cả lane, tối đa 2 vòng, yêu cầu bảng mục + file:dòng + ảnh.
4. Deploy staging (web `qlh-staging-web`, prototype `quanlyhocsinh-proto`) chỉ sau khi: typecheck 0, test xanh, `test:click`, `test:save` và bộ kiểm trạng thái mới xanh, ảnh after đã xem. Build từ worktree tạm ở đúng commit nếu cây có việc dở của lead khác. Báo GL hash bundle staging = build.

## 5. Tiêu chí đạt
- F1–F9 đạt, mỗi mục có ảnh before/after (390 + 1280) trong `web/ui-feedback-20261024/shots/` và dòng trong `handback.md` kèm commit.
- Mọi nút lưu/gửi/tạo trên web có loading nhìn thấy được + thành công + lỗi; kiểm bằng script (không chỉ đọc mã).
- Không còn empty tự viết (bằng chứng: tìm kiếm + danh sách chỗ đã thay).
- Một kiểu selected (fill) cho nav, thẻ, chip, hàng; không còn selected bằng viền.
- Bàn phím bảng điểm: test tự động cho Enter/↑↓←→ và giữ giá trị lỗi.
- Prototype và web khớp nhau ở các màn trên; `design/tokens/` thư mục chính = `mvp-web/design/tokens/`.
- Review Codex không còn mục Chặn/Cao.

## 6. An toàn
- Không push/merge `main`, không production, không `git checkout/reset/stash/commit` ở thư mục chính ngoài file của lane (prototype + docs đang chưa commit — chỉ sửa file cần, không commit ở thư mục chính).
- Cấm chạy `env`/`printenv`/`set` hoặc in biến môi trường/file creds. Creds demo: `~/.config/qlh/staging-demo.txt` (đọc qua đường không in). Khoá 15 phút sau 5 lần sai.
- Không ghi SĐT/nội dung nhận xét vào log, ảnh commit dùng dữ liệu demo.
- Heartbeat của lead 15 phút; báo GL ở mỗi mốc bằng `Status` + `Summary` 2 câu.

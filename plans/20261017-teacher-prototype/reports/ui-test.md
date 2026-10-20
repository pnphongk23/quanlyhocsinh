# Báo cáo kiểm thử giao diện prototype giáo viên (ưu tiên mobile)

Lead: Sonnet · Ngày: 2026-10-17 · Phạm vi: `design/prototype/` (Vite + React), không sửa mã nguồn, không commit.
Nguồn dữ liệu: ba báo cáo tester `reports/ui-test-1.md`, `ui-test-2.md`, `ui-test-3.md` (codex/gpt-6-luna qua Paseo, mỗi tester một cổng 5181/5182/5183) và vòng tự kiểm của Lead trên cổng 5184 (Chrome DevTools, giả lập 390×844 DPR 3 + touch, context cô lập).

## 1. Kết luận ngắn

- **Không có Blocker nào được xác nhận.** Hai "Blocker" tester 1 báo (T1-01 mất giờ đến muộn khi đổi tab; T1-02 nút Back trình duyệt không hỏi) tôi thử lại và **không tái hiện được** (mục 4).
- **Mobile có dùng được một tay không: Có, với điều kiện sửa ba chỗ.** Hành động chính (Lưu điểm danh, Lưu điểm, Tạo lớp mới) nằm ở nửa dưới, trong tầm ngón cái, không bị thanh tab dưới che; mọi route ở 390 không tràn ngang; script vùng chạm không ra phần tử vi phạm ở 390. Ba chỗ làm hỏng trải nghiệm thực: (1) tên lớp dài kéo vỡ cả danh sách lớp, (2) tab con đang chọn có thể nằm ngoài màn hình, (3) màn chi tiết buổi chật ở phần đầu.
- **Khớp thiết kế (nền, màu, chip, nút): khớp ở các số đo.** Đo được: nền mobile `rgb(246,247,249)`; desktop body `rgb(234,236,241)`, khung app `rgb(246,247,249)` bo 16px, sidebar trắng 248px; nút chính `rgb(47,91,234)`; font "Plus Jakarta Sans" (`document.fonts.check` = true); card không viền bo 16px; chip bo 10px nền `rgb(246,247,249)`; pill bo 999px. Thanh tab dưới có vạch xanh 3px phía trên mục đang chọn đúng như `Main.dc.html`. Lệch nhỏ còn lại ở bảng 2.

## 2. Phát hiện

Cột "Kiểm lại": **Lead** = tôi đã tái hiện bằng tay; **Tester** = chỉ có bằng chứng của tester, tôi chưa kiểm lại.

### Major

| ID | Route | Viewport | Bước tái hiện | Bằng chứng | Đề xuất sửa | Nguồn / Kiểm lại |
|---|---|---|---|---|---|---|
| F-01 | `/lop` (thẻ lớp; cùng nguyên nhân với tràn ngang ở 320) | 390×844; 320×568 | Tạo lớp tên "Lớp Tiếng Anh nâng cao dành cho học sinh lớp Một tại Hà Nội 2026" rồi về `/lop`. Ở 320px chỉ cần mở `/lop`. | 390: `scrollWidth = 714` (innerWidth bị đẩy theo), cả ba thẻ giãn quá màn hình, nút "Buổi tiếp…" và "Mở lớp" bị cắt, tiêu đề lớp không có "…". 320: các thẻ rộng 318px trong khung 280px, `scrollWidth = 338`. Tester 3 còn đo 330 ở các tab lớp (Buổi học, Bài kiểm tra, Điểm, Học sinh, Báo cáo) và 367 ở chi tiết buổi đã diễn ra ở 320. | `min-width:0` cho các hàng flex trong thẻ lớp, ellipsis trên tên, cho hàng nút co/xuống dòng; rà các tab con cùng lỗi ở 320. | T3-01, T3-02 · **Lead** (390 tên dài, 320 `/lop`); các route 320 khác: Tester |
| F-02 | Mọi tab lớp, rõ nhất `/lop/6a/bao-cao` | 390×844 | Mở `/lop/6a/bao-cao`. | Thanh tab con rộng 516px trong khung 390px, `scrollLeft = 0`; mục đang chọn "Báo cáo" có `left = 409 > 390` nên nằm ngoài màn hình khi vào trang; "Học sinh" bị cắt nửa. Không có gợi ý cuộn (không mờ dần mép). | Khi mount/đổi route cuộn mục `aria-current` vào giữa thanh (`scrollIntoView({inline:"center"})`), hoặc thu gọn nhãn để 5 tab vừa 390px. | **Lead** |
| F-03 | `/lop/6a/diem` | 390×844 | Điểm → Học sinh → "Đánh dấu nghỉ" một em có điểm → quay lại Điểm. | Hàng em đó biến khỏi bảng Điểm (còn 8 hàng); Báo cáo tháng vẫn hiện điểm em đó. Dữ liệu không bị xoá nhưng không xem lại được ở tab Điểm. Lưu ý: brief 4.10 ghi "hiển thị học sinh đang học", nên đây là đúng brief nhưng có nguy cơ trái bất biến "giữ lịch sử" của AGENTS.md. **Cần người dùng quyết** (xem mục 5). | Hiện học sinh đã nghỉ ở cuối bảng (mờ + nhãn "Đã nghỉ"), hoặc giữ như brief và ghi rõ trong spec. | T2-01 · Tester |

### Minor

| ID | Route | Viewport | Mô tả và bằng chứng | Đề xuất | Nguồn / Kiểm lại |
|---|---|---|---|---|---|
| F-04 | Mọi màn có nút dính đáy (`saveBar`/`stickyBar`: chi tiết buổi, nhập điểm, tạo lớp, tạo bài, danh sách lớp) | 390×844 | `--tabbar-height` = 68px nhưng thanh tab dưới cao thực 64px (đo `navH = 64`). Nút dính đặt `bottom: 68px + safe-area`, nên có khe 4px (`navTop 780`, `barBottom 776`) lộ nội dung đang cuộn phía sau, thấy rõ ở ảnh: dòng chữ học sinh bị cắt ngay dưới nút Lưu. | Đặt `--tabbar-height: 64px` hoặc đo chiều cao thật của thanh tab; nên kiểm lại với safe-area trên máy thật. | **Lead** |
| F-05 | `/lop/6a/buoi-hoc/:sessionId` | 390×844 | Phần đầu chật: eyebrow "Tiếng Anh giao tiếp 6A · 18:00" xuống dòng, h1 "Buổi 9 · Thứ Hai, 19 tháng 10" xuống 2 dòng, nút Quay lại căn đáy lệch so với khối chữ, nút "Hủy buổi" chiếm ~90px bên phải. Chiếm ~1/4 màn hình trước khi tới danh sách. | Rút h1 ("Buổi 9 · 19/10"), đưa "Hủy buổi" vào menu "⋯" hoặc xuống cuối trang; căn nút Quay lại theo dòng h1. | **Lead** |
| F-06 | Chi tiết buổi, tab Điểm danh | 390×844 | Nút "Tất cả có mặt" xuống hàng riêng dưới dòng tóm tắt, trong khi `Main.dc.html` đặt cùng hàng, nút ở bên phải. Tốn thêm ~60px chiều dọc. | Cho tóm tắt co chữ/ngắt dòng để nút ở cùng hàng. | **Lead** |
| F-07 | `/lop` | 390×844 | Thẻ lớp "hiện tại" có viền xanh 2px; `ClassList.dc.html` không có viền chọn trên thẻ nào. Brief 4.2 có chỉ định `selected`, nhưng người dùng đã phàn nàn về màu, nên khung xanh dễ bị coi là lệch thiết kế. | Hỏi người dùng; nếu bỏ thì bỏ prop `selected` ở thẻ lớp. | **Lead** |
| F-08 | `/lop/moi`, `/lop/6a/bai-kiem-tra/moi` | 390×844 | Gửi form trống: thông báo xác thực đúng nhưng `SaveStatus` đồng thời đổi thành "Lỗi lưu — vui lòng thử lại" dù chưa có thao tác ghi nào. Hai tester độc lập cùng báo. | Chỉ đặt trạng thái lỗi lưu khi ghi thất bại. | T1-04, T2-02 · Tester |
| F-09 | `/lop/moi` | 320, 375 | Nút ngày T2–CN cao 44, rộng 33px ở 320 và 43px ở 375 (tôi đo 43×44; tester ghi 41). 390 đạt 45px. | `min-width:44px` + hàng cuộn/2 dòng ở màn rất hẹp. | T3-03 · **Lead** (375) |
| F-10 | `/lop/6a/buoi-hoc/6a-session-8` | 390×844 | Lưu điểm danh một buổi có ngày tương lai (19/10, máy ở 17/10) chuyển buổi sang nhóm "Đã diễn ra / Đã điểm danh" và mất nút "Hủy buổi". Spec và brief không nói rõ có cho điểm danh trước ngày học không. | Hỏi người dùng (mục 5). | T1-03 · Tester |
| F-11 | Mọi trang có ô nhập | 390×844 | Placeholder `#8A93A0` có tương phản 3,11:1 trên trắng và 2,90:1 trên `#F6F7F9` (dưới 4,5:1). Màu này do brief ghi cứng, không phải lỗi mã. Mọi cặp chữ/nền khác tester 3 đo đều đạt (≥ 5,5:1). | Đậm hơn token `--color-placeholder`, cần người dùng chấp nhận lệch thiết kế. | T3-06 · Tester |
| F-12 | `/lop/:id/*` | 390×844 | Tab con là `<nav>` + `NavLink` có `aria-current`, không có `role=tablist/tab` (ui-quality-addendum mục 5 đòi tablist/tab; brief 4.3a lại chỉ định nav). Hai tài liệu mâu thuẫn; mã làm theo brief. Phần Segmented Điểm danh/Nhận xét thì có `tablist` đúng. | Giữ nav (đúng ngữ nghĩa là liên kết điều hướng) và sửa addendum, hoặc đổi sang tab thật. | T3-05 · Tester |
| F-13 | Mọi route | — | Tiêu đề tài liệu (`<title>`) luôn là "Lớp của tôi", kể cả màn đăng nhập. | Đặt `document.title` theo màn. | **Lead** (thấy ở snapshot `/dang-nhap`) |
| F-14 | `/lop/6a/bao-cao` | 390/1280 | Ô chọn tháng hiện "October 2026" bằng tiếng Anh trong trình duyệt locale `en-US`. Đây là hành vi của `input[type=month]` theo ngôn ngữ trình duyệt, trên iPhone locale vi sẽ theo máy; không phải lỗi mã. | Ghi chú; hoặc thay bằng bộ chọn tự dựng nếu cần chắc chắn. | T3-07 · **Lead** (thấy ở ảnh) |

## 3. Đã kiểm và không kiểm được

### Đã kiểm (có bằng chứng)

- **Tester 1** (390×844, cổng 5181): đăng nhập (ô trống, hiện mật khẩu), `/lop`, `/lop/moi` (validate, T2–CN, giờ, tạo), menu "⋯" (Sửa lớp, Lưu trữ), bộ chuyển lớp, 5 tab con, Buổi học, chi tiết buổi (vòng 4 trạng thái, giờ muộn + ghi chú, "Tất cả có mặt", Lưu, cảnh báo vắng 2 buổi, Hủy buổi), tab Nhận xét (lọc, câu mẫu, Lưu nháp, Gửi, mô phỏng mất mạng), Back trong trang. Console sạch (chỉ `[vite]` và React DevTools).
- **Tester 2** (390×844, cổng 5182): tab Bài kiểm tra, tạo bài, nhập điểm (dấu phẩy, ngoài 0–10, Vắng thi, chặn rời trang), tab Điểm (cột dính trái, tự tính trung bình 3 học sinh khớp), Học sinh (thêm, đánh dấu nghỉ, không còn chữ mời phụ huynh), Báo cáo (xem trước, phát hành, phát hành lại khi sửa điểm, hàng loạt, lỗi khi offline), Lịch, Cài đặt (chặn đăng xuất khi chờ đồng bộ rồi mở lại, đặt lại dữ liệu, đăng xuất), các trạng thái lưu (Chưa lưu, Đã lưu trên máy, Đã đồng bộ, Lỗi lưu).
- **Tester 3** (cổng 5183): ma trận 17 route × 8 viewport (320×568, 375×667, 390×844, 430×932, 844×390, 1280×900, 1024×768, 1023×768) cho tràn ngang và vùng chạm; 17 route với chữ gốc 32px ở 390; ngưỡng đổi layout đúng giữa 1023 và 1024; A3–A6; bảng tương phản; ba route cũ chuyển hướng đúng. Tràn ngang chỉ xảy ra ở 320 (F-01); từ 375 đến 1280 không có.
- **Lead** (cổng 5184, 390×844 DPR 3 touch; một số lượt 375/320): đăng nhập, `/lop`, chi tiết buổi, nhập điểm, báo cáo, Học sinh; đo nền, font, thanh tab dưới, nút dính đáy, thanh tab con; nhập lại các lỗi T1-01, T1-02, T3-01, T3-03, T3-04; Tab bằng phím thật cho focus; đối chiếu `ClassList.dc.html`, `Main.dc.html`.

### Không kiểm được

- iPhone thật, bàn phím ảo che nút lưu, safe-area runtime, vuốt cảm ứng thật, nút Back cử chỉ của iOS. Công cụ của ba tester **không đặt được DPR/touch** (DPR 1, `maxTouchPoints = 0`); công cụ của Lead có, nhưng cũng chỉ là giả lập.
- Zoom chữ hệ thống 200% thật: tester 3 chỉ mô phỏng bằng `html { font-size: 32px }` ở 390 (không lỗi), không phải zoom trình duyệt hay Dynamic Type.
- `prefers-reduced-motion` (chỉ xác nhận có `@media` trong CSS, không chạy giả lập).
- Chặn mạng thật ở tầng trình duyệt: dùng công tắc "Mô phỏng mất mạng" và `navigator.onLine = false`. Trạng thái "Lỗi lưu" chỉ tạo được qua validate/offline, không qua lỗi ghi thật.
- Bất biến 7.3 mục 7 (nháp điểm lớp A, sang lớp B, bấm Lưu): không ai kiểm được bằng giao diện.
- Đối chiếu pixel desktop với `Web*.dc.html`: tester 3 chỉ so số đo, tôi không mở lại desktop.
- Vuốt ngang bảng điểm bằng cử chỉ (tester 1 bị timeout; chỉ đo được khung `overflow-x:auto`, cột Học sinh `position: sticky`).
- Tester 1 không mở `/lop/6a/bai-kiem-tra/moi`, `6a-test-0` và route cũ; các route này do tester 2 và 3 phủ.
- Bàn phím thật của bàn phím vật lý với ô giờ `type=time` (xem mục 4): không nhập được giờ bằng phím bằng công cụ của Lead.

## 4. Báo cáo của tester đã bác bỏ sau kiểm lại

| ID | Tester nói | Tôi thử | Kết luận |
|---|---|---|---|
| T1-01 (Blocker) | Giờ đến muộn và ghi chú bị xoá khi đổi sang tab Nhận xét rồi quay lại. | Ghi chú giữ nguyên sau khi đổi tab. Giờ đặt bằng `fill` không vào được state React (ô còn `--:--`); đặt bằng sự kiện `input`/`change` chuẩn thì giữ nguyên sau khi đổi tab và sau khi render lại bằng thao tác khác. Mã cũng cho thấy hai ô là controlled, state `Draft` giữ `lateAt` và `note`. | **Không phải lỗi**; nhiều khả năng do cách công cụ đặt giá trị cho `input[type=time]`. Chưa gõ được giờ bằng phím thật nên chưa loại trừ hẳn trên iPhone. |
| T1-02 (Blocker) | Back của trình duyệt bỏ bản nháp mà không hỏi. | Điều hướng trong app (Buổi học → buổi 7), đổi một trạng thái, `history.back()`: hiện đúng `Bạn có thay đổi chưa lưu. Rời đi và bỏ thay đổi?`. Back chỉ không chặn được khi mục lịch sử trước đó là tải trang mới bằng URL (khác tài liệu), không phải đường đi thật của người dùng. | **Không phải lỗi.** |
| T3-04 (Major) | Focus không nhìn thấy (`:focus-visible` false, `outline: none`), skip link nằm y = -100. | Bấm phím Tab thật: `:focus-visible` = true, `outline: solid 3px rgb(47, 91, 234)` trên liên kết "CL" và nút "Buổi tiếp…". CSS skip link đưa `top` về 8px khi `:focus`. | **Không phải lỗi**; tester gọi `focus()` bằng script nên `:focus-visible` luôn false. Chưa kiểm được việc focus có chuyển vào `main` sau khi dùng skip link. |

## 5. Quyết định cần người dùng

1. **Tab Điểm có hiện học sinh đã nghỉ không (F-03)?** Brief ghi chỉ học sinh đang học; AGENTS.md ghi "giữ lịch sử". Hai thứ đang kéo ngược nhau.
2. **Lưu điểm danh một buổi chưa tới ngày có chuyển buổi sang "Đã diễn ra" không (F-10)?** Hiện chuyển và mất nút "Hủy buổi".
3. **Giữ khung xanh quanh thẻ lớp hiện tại (F-07)?** Thiết kế mobile không có.
4. **Placeholder chữ xám nhạt (F-11):** giữ đúng thiết kế hay đậm hơn để đạt 4,5:1?

## 6. Việc đã làm với môi trường

- Ba server Vite (5181–5183) và một server thứ tư (5184) cho vòng kiểm của Lead (thêm một cổng so với brief để không dùng chung localStorage với tester). Cả bốn đã dừng, `curl` trả mã 000. Trang Chrome DevTools của Lead đã đóng.
- Không có tệp nguồn nào trong `design/prototype/src`, `public`, `index.html`, `package.json`, `design/export`, `docs`, `AGENTS.md`, `CLAUDE.md` bị đổi sau khi tester bắt đầu (kiểm bằng `find -newer`). Trong `plans/` chỉ có ba file `ui-test-N.md` của tester và file này. Không commit.
- Ba tester Paseo còn ở trạng thái `idle` (ui-tester-1/2/3), chưa archive.

Status: DONE_WITH_CONCERNS
Summary: Ba tester và Lead đã kiểm 17 route ở tám viewport; không có Blocker được xác nhận, ba Major (tên lớp dài và 320px làm tràn ngang, tab con đang chọn nằm ngoài màn hình, tab Điểm ẩn học sinh đã nghỉ) và mười một Minor, mỗi mục ghi rõ ai đã kiểm lại.
Concerns/Blockers: Không kiểm được trên iPhone thật, bàn phím ảo, safe-area, zoom chữ 200% thật và việc gõ giờ bằng phím vào `input[type=time]`; ba tester Paseo không có DPR 3/touch. Ba báo cáo lỗi của tester (T1-01, T1-02, T3-04) bị bác sau khi kiểm lại.

# Báo cáo kiểm thử giao diện — Tester 3

## 1. Môi trường

- PHẠM VI: Tester 3 (N=3), độ bền viewport.
- Trình duyệt: Paseo 0.11.4 / Chrome 152.0.7977.76 (UA đọc từ trình duyệt trên macOS).
- Origin riêng: http://127.0.0.1:5183. Đã đăng nhập một lần bằng email thử nghiệm và mật khẩu bất kỳ.
- Công cụ resize đặt được các kích thước viewport liệt kê trong ma trận. DPR đo được là 1; API không cho đổi DPR hoặc bật giả lập touch, nên chỉ đo hình học vùng chạm bằng DOM, không mô phỏng thao tác cảm ứng.
- Font lớn: trên mỗi route đặt `document.documentElement.style.fontSize = '32px'` (390×844). Đây là mô phỏng tăng cỡ gốc yêu cầu; không phải browser zoom 200%. API Paseo không có điều khiển zoom trang 200%.
- Ảnh bằng chứng nằm ngoài repo tại `/tmp/ui-test-3/`. Không chạy server mới, không thay mã hoặc dữ liệu trong repo.

## 2. Phát hiện

| ID | Mức | Route | Viewport | Bước tái hiện | Thực tế so với mong đợi | Bằng chứng | Đề xuất sửa |
|---|---|---|---|---|---|---|---|
| T3-01 | Major | `/lop` | 320×568; với tên dài còn tái hiện ở 390×844 | Mở danh sách lớp; ở lượt tên dài, qua giao diện tạo lớp tên “Lớp Tiếng Anh nâng cao dành cho học sinh lớp Một tại Hà Nội 2026”, rồi quay lại danh sách. | 320px: `scrollWidth=338`, `innerWidth=320`, thẻ lớp bắt đầu x=20 và kết thúc x=338, xuất hiện thanh cuộn ngang và phần thẻ/nút bị cắt. Tên lớp dài làm `scrollWidth=713` ở innerWidth 390; tiêu đề có ellipsis nhưng nội dung flex vẫn kéo rộng card/trang. Mong đợi trang không tràn ngang và tên dài không đẩy bố cục. | `/tmp/ui-test-3/320x568-lop.png`, `/tmp/ui-test-3/390x844-long-class.png`; DOM đo card phải x=338 ở 320px và scrollWidth 713 sau khi tạo tên dài. | Cho các hàng tiêu đề co lại trong grid/flex (min-width:0, max-width:100%); giới hạn card theo container, đặt ellipsis trên chính phần tên và giữ hành động trong hàng. |
| T3-02 | Major | `/lop/6a/buoi-hoc`, `/lop/6a/buoi-hoc/6a-session-7`, `/lop/6a/bai-kiem-tra`, `/lop/6a/diem`, `/lop/6a/hoc-sinh`, `/lop/6a/bao-cao` (các route cũ tương ứng chuyển tới đây) | 320×568 | Mở từng route trong ma trận ở 320px. | Tràn ngang trang: các route tab lớp báo `scrollWidth=330` so với 320; chi tiết buổi đã diễn ra lên tới 367. Mong đợi `scrollWidth <= innerWidth`; chỉ bảng điểm mới được cuộn trong khung riêng. Ảnh chi tiết buổi cho thấy trạng thái điểm danh bị cắt bên phải và thanh cuộn ngang toàn trang. | `/tmp/ui-test-3/320x568-attendance.png`; các số đo nằm trong ma trận bên dưới. | Tìm phần tử rộng tối thiểu trong header/tab con và hàng điểm danh; giữ cuộn ngang riêng cho bảng/tab có chủ đích, không để tràn lên document. |
| T3-03 | Major | `/lop/moi` | 320×568, 375×667 | Mở Tạo lớp mới, chạy script vùng chạm trên các nút ngày T2–CN. | Mỗi nút cao 44px nhưng rộng 33px ở 320px và 41px ở 375px (<43.5px). Mong đợi mỗi vùng chạm tối thiểu 44×44px. 390px các nút rộng 45px. | Script ở mục 3; `/tmp/ui-test-3/320x568-lop-moi.png`. | Dùng lưới/scroll riêng hoặc giảm khoảng cách ngang để mỗi nút ngày có chiều rộng tối thiểu 44px. |
| T3-04 | Major | `/lop`, chi tiết buổi, nhập điểm, `/cai-dat` | 390×844 | Dùng Tab từ đầu trang; xem vị trí focus và outline; thử Tab qua các control. | Tab đi theo các control, nhưng mọi focus đo được trả `:focus-visible=false` và `outline-style:none`. Liên kết “Đến nội dung” nhận focus ở y=-100 nên vẫn ngoài màn hình; Tab kế tiếp vào “Cài đặt” ở thanh dưới trước các hành động card. Enter trên skip link đổi URL sang `#noi-dung`, nhưng focus trở về BODY. Mong đợi focus thấy rõ, skip link xuất hiện và thứ tự gần với thứ tự đọc/hiển thị. | `/tmp/ui-test-3/390x844-keyboard-focus.png`; eval: skip `rect=[8,-100]`, `focusVisible=false`; CTA sau Tab cũng không có viền nhìn thấy. | Hiện skip link khi focus, đặt focus đích vào main, xác nhận token outline với keyboard thật; sắp lại thứ tự Tab của thanh điều hướng mobile. |
| T3-05 | Major | `/lop/6a/buoi-hoc` (điều hướng tab con) | 390×844 | Mở route Buổi học và đọc cây accessibility/DOM cho các tab Buổi học, Bài kiểm tra, Điểm, Học sinh, Báo cáo. | Nhóm tab con có 0 `role=tablist` và 0 `role=tab`; mục đang chọn chỉ có `aria-current=page`. Tab Điểm danh/Nhận xét trong chi tiết buổi có tablist và 2 tab đúng. Mong đợi nhóm tab con đáp ứng role tablist/tab theo chuẩn chất lượng. | Kết quả DOM: `tablists=0, tabs=0` tại `/lop/6a/buoi-hoc`; chi tiết buổi: `tablists=1, tabs=2`. | Dùng tab semantics đầy đủ, gồm tablist, tab, selected state và keyboard behavior; hoặc xác nhận chúng là nhóm link điều hướng và cập nhật kiểm tra tiếp cận tương ứng. |
| T3-06 | Major | `/lop/moi` (placeholder) | 390×844 | Đọc computed style của `input::placeholder`; tính tương phản WCAG trên nền field trắng và nền trang. | Placeholder `rgb(138,147,160)`: 3.11:1 trên trắng, 2.90:1 trên `rgb(246,247,249)`, thấp hơn 4.5:1 cho chữ thường. Các cặp màu còn lại trong bảng tương phản đạt. | Computed style `::placeholder=rgb(138, 147, 160)`; tỷ lệ tự tính tại mục 3. | Tăng độ đậm của token placeholder hoặc đổi nền/kiểu chữ để đạt tối thiểu 4.5:1. |
| T3-07 | Minor | `/lop/6a/bao-cao` | 1280×900 | Mở bộ chọn tháng trong trang Báo cáo. | Bộ chọn hiện “October 2026” bằng tiếng Anh trong giao diện còn lại là tiếng Việt; nhãn kỳ bên cạnh là “Tháng 10 Năm 2026”. Mong đợi cách hiển thị tháng nhất quán tiếng Việt. | Ảnh `/tmp/ui-test-3/1280x900-reports.png`. | Đặt locale tiếng Việt cho bộ chọn tháng hoặc dùng nhãn tháng tùy biến. |

### Ma trận route × viewport

`OK` = route đã render và các phép đo scrollWidth/vùng chạm không phát hiện vi phạm. `OW+n` = scrollWidth vượt innerWidth n px. `TA` = có vùng chạm nhỏ hơn 43.5px. Mũi tên là redirect quan sát được; redirect route cũ đúng đích theo bảng route. `ellipsis` = tên lớp trên lịch được rút gọn có dấu ba chấm, không tràn document. Với `/dang-nhap`, đăng nhập hoàn tất trước lượt ma trận nên route chuyển về `/lop`; giao diện đăng nhập chỉ được mở trực tiếp lúc 390×844.

| Route | 320x568 | 375x667 | 390x844 | 430x932 | 844x390 | 1280x900 | 1024x768 | 1023x768 | 390×844 html 32px |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `/dang-nhap` | →/lop OW+18 | →/lop | →/lop | →/lop | →/lop | →/lop | →/lop | →/lop | →/lop |
| `/lop` | OW+18 | OK | OK | OK | OK | OK | OK | OK | OK |
| `/lop/moi` | TA | TA | OK | OK | OK | OK | OK | OK | OK |
| `/lop/6a/buoi-hoc` | OW+10 | OK | OK | OK | OK | OK | OK | OK | OK |
| `/lop/6a/buoi-hoc/6a-session-8` | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| `/lop/6a/buoi-hoc/6a-session-7` | OW+47 | OK | OK | OK | OK | OK | OK | OK | OK |
| `/lop/6a/bai-kiem-tra` | OW+10 | OK | OK | OK | OK | OK | OK | OK | OK |
| `/lop/6a/bai-kiem-tra/moi` | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| `/lop/6a/bai-kiem-tra/6a-test-0` | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| `/lop/6a/diem` | OW+10 | OK | OK | OK | OK | OK | OK | OK | OK |
| `/lop/6a/hoc-sinh` | OW+10 | OK | OK | OK | OK | OK | OK | OK | OK |
| `/lop/6a/bao-cao` | OW+10 | OK | OK | OK | OK | OK | OK | OK | OK |
| `/lich` | ellipsis | OK | OK | OK | OK | OK | OK | OK | OK |
| `/cai-dat` | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| `/lop/6a/diem-danh` | →…/buoi-hoc OW+10 | →…/buoi-hoc | →…/buoi-hoc | →…/buoi-hoc | →…/buoi-hoc | →…/buoi-hoc | →…/buoi-hoc | →…/buoi-hoc | →…/buoi-hoc |
| `/lop/6a/nhan-xet` | →…/buoi-hoc OW+10 | →…/buoi-hoc | →…/buoi-hoc | →…/buoi-hoc | →…/buoi-hoc | →…/buoi-hoc | →…/buoi-hoc | →…/buoi-hoc | →…/buoi-hoc |
| `/lop/6a/diem/bai-moi` | →…/bai-kiem-tra/moi | →…/bai-kiem-tra/moi | →…/bai-kiem-tra/moi | →…/bai-kiem-tra/moi | →…/bai-kiem-tra/moi | →…/bai-kiem-tra/moi | →…/bai-kiem-tra/moi | →…/bai-kiem-tra/moi | →…/bai-kiem-tra/moi |

### A3–A6 và tương phản

| Đo | 390×844 | 1280×900 | 1024×768 / 1023×768 |
|---|---|---|---|
| A3 nền body | `rgb(246, 247, 249)` | `rgb(234, 236, 241)` | 1024: canvas `rgb(234,236,241)`; 1023: mobile `rgb(246,247,249)` |
| Khung app / sidebar | mobile không có khung desktop | frame `1248×868`, bo 16px, nền `rgb(246,247,249)`; sidebar rộng 248px, trắng | 1024 frame `992×736`, sidebar 248px; 1023 chuyển về thanh dưới |
| A4 nút chính | “Tạo lớp” `rgb(47,91,234)`, chữ trắng, cao 52px | ảnh trang lớp cho thấy nút chính xanh | ngưỡng layout đổi đúng giữa 1023 và 1024 |
| A5 font | `"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif`; `document.fonts.check('16px "Plus Jakarta Sans"') = true` | giống; font check true | layout breakpoint đo được |
| A6 card lớp | nền trắng, border 0px, radius 16px, padding 14px 16px | card không viền, radius 16px | card grid hiện trong khung desktop |
| A6 chip / pill | chip `rgb(246,247,249)`, radius 10px, 14px; pill success radius 999px, 13px | cùng token; sidebar và khung đúng màu đo | — |

Đo tương phản theo computed token và computed style, công thức WCAG:

| Cặp chữ/nền | Tỷ lệ | Kết quả |
|---|---:|---|
| Chữ phụ `#4A5361` / trắng | 7.77:1 | Đạt |
| Chữ phụ `#4A5361` / `#F6F7F9` | 7.25:1 | Đạt |
| Chữ trắng / nút chính `#2F5BEA` | 5.52:1 | Đạt |
| Pill success `#14663F` / `#E7F6EC` | 6.26:1 | Đạt; pill “Đã đồng bộ” được đo trực tiếp |
| Pill warning `#8A5300` / `#FFF3D6` | 5.74:1 | Đạt, tính từ computed token |
| Pill error `#B42318` / `#FDECEC` | 5.76:1 | Đạt, tính từ computed token |
| Pill primary `#1E43B8` / `#E8EEFE` | 7.09:1 | Đạt, tính từ computed token |
| Pill neutral / “Vắng thi”: `#4A5361` / `#F0F2F5` | 6.93:1 | Đạt; “Vắng thi” đo trực tiếp trong bảng điểm |
| Tab dưới chưa chọn `#4A5361` / thanh trắng | 7.77:1 | Đạt |
| Placeholder `#8A93A0` / trắng | 3.11:1 | Không đạt 4.5:1 |
| Placeholder `#8A93A0` / `#F6F7F9` | 2.90:1 | Không đạt 4.5:1 |

SaveStatus quan sát được: “Đã đồng bộ” (chữ `rgb(20,102,63)` trên `rgb(231,246,236)`, 6.26:1), “Chưa lưu” sau khi đổi ngày học, và “Đã lưu trên máy” sau khi tạo lớp kiểm tra tên dài. “Lỗi” không tái hiện; không chặn được mạng để kiểm các trạng thái offline/ lỗi qua giao diện. Các tỷ lệ warning/error/primary ở bảng là phép tính từ token computed, không phải tất cả đều được làm xuất hiện trên màn hình.

### Desktop đối chiếu

Đã lưu ảnh prototype 1280×900: `/tmp/ui-test-3/1280x900-classes.png`, `.../1280x900-attendance.png`, `.../1280x900-scores.png`, `.../1280x900-students.png`, `.../1280x900-reports.png`. Quan sát thấy lưới 2 thẻ lớp, bảng điểm trong card, bảng học sinh và báo cáo chia hai cột. 1024×768 đã đo frame/sidebar và ngưỡng layout, không lưu ảnh viewport này. KHÔNG KIỂM ĐƯỢC đối chiếu pixel trực tiếp với các file Web*.dc.html trong lượt này; số đo desktop được so theo brief và DOM prototype.

## 3. ĐÃ KIỂM

- Đăng nhập một lần tại 390×844 bằng tài khoản thử nghiệm; sau đó 17 route được điều hướng ở 8 viewport (136 cặp). Ma trận ghi rõ redirect của ba route cũ; dữ liệu lịch cố định phù hợp ngày máy 2026-10-17 và có các buổi 19–20/10.
- Viewport thường: 320×568, 375×667, 390×844, 430×932, 844×390, 1280×900, 1024×768, 1023×768.
- Mô phỏng html gốc 32px: 17 route ở 390×844; không phát hiện tràn trang hoặc vùng chạm dưới ngưỡng trong số đo.
- Bảng điểm ở 1280×900, trang báo cáo hai cột, danh sách học sinh và điểm danh ở desktop; ảnh được lưu theo các đường dẫn trên.
- Bottom tab bar và sidebar: 3 mục Lớp, Lịch, Cài đặt; breakpoint đổi tại 1024px.
- Kiểm tra cuộn đến cuối form Tạo lớp, chi tiết điểm danh, chi tiết điểm: nút lưu/CTA không bị thanh tab dưới che. Ở 320×568, cuối form: nút Tạo lớp y=352–404, tab dưới bắt đầu y=504; chi tiết buổi: stickyBar y=347–453, thanh tab y=489–553.
- Bàn phím: Tab tại danh sách lớp, chi tiết buổi, nhập điểm, Cài đặt; Esc đóng sheet xác nhận “Đặt lại dữ liệu mẫu” mà không xác nhận thao tác. Link skip đổi URL sang `#noi-dung`. Chi tiết buổi có tablist/tab cho Điểm danh/Nhận xét.
- A3–A6, A10 bằng computed style và script vùng chạm. Console không có error/warning trong log quan sát; có các dòng info Vite và React DevTools.

## 4. KHÔNG KIỂM ĐƯỢC

- Zoom trình duyệt 200%, DPR khác 1 và touch emulation: API browser hiện tại chỉ resize CSS viewport.
- Login page ở mọi kích thước sau đăng nhập: `/dang-nhap` chuyển hướng về `/lop` khi đã có session; login page chỉ được mở ở 390×844 trước khi đăng nhập.
- Tên học sinh rất dài: không hoàn tất luồng thêm học sinh; tên lớp dài đã tạo được qua giao diện và cho thấy tràn trang.
- Block mạng, trạng thái SaveStatus “Lỗi” và kiểm runtime offline; API browser không cung cấp network interception. “Đã lưu trên máy” đã quan sát được sau khi tạo lớp.
- Runtime safe-area inset và prefers-reduced-motion emulation. Đọc CSSOM thực tế thấy app dùng `env(safe-area-inset-top)` và `env(safe-area-inset-bottom)`, có quy tắc `@media (prefers-reduced-motion: reduce)`; không giả lập được notch/setting để kiểm hiệu ứng runtime.
- Focus bàn phím của trang đăng nhập sau khi đã đăng nhập; các trang chính đã được Tab qua. Không có kiểm tra pixel trực tiếp với file thiết kế Web*.dc.html.
- Nghiệp vụ bất biến sâu A11 nằm ngoài phạm vi tester giao diện độ bền viewport.

## 5. Lỗi console quan sát được

- Không có lỗi hoặc warning. Info quan sát lặp lại: `%cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold` (các trang tải lại trên origin 5183).
- Info Vite: `[vite] connecting...`, `[vite] connected.`.

Status: DONE_WITH_CONCERNS
Summary: Đã đo đủ 136 cặp route × viewport thường và 17 cặp mô phỏng html 32px. Có lỗi tràn ngang ở 320px, tên lớp dài làm trang rộng 713px ở 390px, nút chọn ngày dưới 44px, focus bàn phím không nhìn thấy và placeholder thiếu tương phản.
Concerns/Blockers: Chưa kiểm được zoom 200%, login ở các viewport sau đăng nhập, runtime safe area/reduced motion, offline/error state và đối chiếu pixel trực tiếp với file Web*.dc.html.


# Đề xuất mascot · gói khám phá đã có 10 mockup

Status: DONE_WITH_CONCERNS · 2026-10-22

[Gallery](index.html) · [Contact sheet cả 10 ảnh](evidence/contact-sheet.png) · [Đối chiếu từng ảnh với nền](evidence/compare.html) · [Kết quả tự kiểm](evidence/visual-check.md)

## Chọn hướng nào

Đề xuất **Nếp**: thẻ ghi chú ngăn nắp, gợi phiếu buổi học và thẻ từ vựng. Nét gọn, mắt nhỏ, biểu cảm vừa phải phù hợp người lớn; hình hỗ trợ giáo viên/phụ huynh, không trở thành phần thưởng hay đánh giá học sinh.

| Hướng | Ý tưởng, tính cách và hình thức | Mặt được | Điều cần cân nhắc |
|---|---|---|---|
| [Nếp](directions/nep.html) | Thẻ gấp góc, hình học mềm, nét 3–4; #F4F6FF / #CBD7FF / #24334B | Hợp phiếu buổi học; đọc rõ ở 64–80 px | Có thể bị hiểu là icon tài liệu; ở 32 px chỉ nên là trang trí |
| [Mầm](directions/mam.html) | Chậu cây kiên nhẫn, nét mực biên tập 1.5–3, lá bất đối xứng; #DEE8D9 / #F7EEE0 / #375B4C | Gợi tiến bộ đều qua từng buổi, bình tĩnh | Nét lá và mắt khó thấy khi thu nhỏ |
| [Nhịp](directions/nhip.html) | Chim giấy nhẹ nhàng, mảng phẳng góc cạnh; #ECD6BD / #A4B9FF / #24334B | Gợi kết nối lớp và gia đình; silhouette khác hẳn hai hướng kia | Có thể bị hiểu nhầm là biểu tượng gửi; màu giấy nhạt |

Cả ba dùng điểm nhấn **#2F5BEA**, nền trong suốt, không font/ảnh từ xa, gradient hoặc thư viện animation. Giữ nguyên 18 SVG gốc: SHA-256 của bộ SVG nối theo thứ tự tên vẫn là `377fb3c37b8e196479f88b6db6b18a33b28fc701acf306aec0009624d939234d`.

## Nghiên cứu và UI template

Tổng hợp từ [research.md](research.md): thông tin học tập → chữ/trạng thái hệ thống → hình trang trí. Tham khảo tính nhất quán nhân vật và phản hồi có ngữ cảnh; không lấy nhân vật thương hiệu, cơ chế điểm thưởng hoặc tần suất hiển thị từ sản phẩm trẻ em. Nguồn research chủ yếu marketing/help/store, chưa chứng minh mascot làm tăng tương tác.

Ba nguồn UI template chỉ để đối chiếu pattern: **shadcn login-01** gần nhất cho form một cột; **Tabler** tham khảo mật độ desktop; **Flowbite** tham khảo bảng/CRUD. Không nhập Tailwind, Bootstrap hoặc framework mới; prototype đã duyệt vẫn là nguồn chuẩn. Research ghi MIT cho ba nguồn và yêu cầu giữ notice khi sao chép phần đáng kể. Packet này không sao chép code/template hoặc asset Open Peeps/OpenMoji/unDraw.

## 10 mockup và tư thế

Các HTML chia rõ nền prototype hiện có với SVG đề xuất; ghi route, component, scenario và giới hạn ngay dưới khung ảnh. Mỗi PNG là **390×844**, Nếp 6 + Mầm 2 + Nhịp 2; nền dùng chung, không base64.

| Scenario | Route thật | Component dưới design/prototype/src/ | Pose, vùng đặt SVG x/y/size |
|---|---|---|---|
| Đăng nhập (3 hướng) | /dang-nhap | features/auth/LoginPage.tsx | welcome · 286/88/64, khoảng trống phải tiêu đề |
| Lớp chưa có học sinh (3 hướng) | /lop/6a/hoc-sinh | features/students/StudentsPage.tsx | empty · 155/292/80, dưới thẻ giải thích |
| Phiếu cả lớp đã gửi | /lop/6a/buoi-hoc/6a-session-0?tab=nhan-xet | features/comments/CommentsPanel.tsx | celebration · 286/380/80, dưới nút gửi hiện có |
| Tổng quan phụ huynh | /ph | roles/guardian/GuardianOverviewPage.tsx | welcome · 262/108/80, trống bên phải thẻ chuyên cần |
| Báo cáo đã phát hành | /ph/bao-cao | roles/guardian/GuardianReportPage.tsx | celebration · 294/16/56, trống cạnh tiêu đề |
| Lỗi lưu | /lop/6a/buoi-hoc/6a-session-0 | features/attendance/AttendancePanel.tsx | gentle-error · 318/2/32, dải lỗi đầu màn |

Tổng quan dùng **welcome trung tính**, không dấu tích hay ăn mừng theo số buổi/điểm của con. Báo cáo dense nên hình nhỏ ở đầu, không đặt vào bảng. Hình lỗi 32 px cố ý thứ yếu; chữ lỗi và nút Thử lại vẫn là thông tin chính.

Mỗi hướng đủ 6 pose: welcome, complete, thinking, empty, celebration, gentle-error. Complete dành cho tác vụ nhỏ đã xác nhận; thinking chỉ hỗ trợ trạng thái tải thật, không tự tạo chờ hay thay spinner; empty giữ lý do và CTA hiện có; celebration chỉ sau gửi/phát hành đã xác nhận; gentle-error không nói đã lưu/đồng bộ. Các pose không có trong 10 scenario vẫn xem được trên bảng hướng.

**Giới hạn trạng thái:** sent là bản ghi local `sent` dựng sẵn; published là bản ghi local `published` mà GuardianReportPage thật đọc. Đây là minh hoạ trạng thái sau gửi/phát hành, không kiểm luồng gửi hay ACK backend. Màn lỗi được kích hoạt qua thao tác Lưu điểm danh thật khi Storage.setItem ném QuotaExceededError; chưa kiểm mất kết nối mạng. Không thêm badge offline thường trực hay toast thành công giả.

## Quy tắc xuất hiện, chuyển động và tắt

Nên ưu tiên đăng nhập, empty state và phản hồi hiếm gặp trong vùng trang trí trống đã kiểm. Không đặt vào danh sách điểm danh, ô điểm, nhận xét của giáo viên, nội dung báo cáo, CTA, bàn phím hoặc modal xác nhận; không ép mascot vào màn dense khi thiếu vùng hợp lệ. Không đổi chữ, điều hướng, thứ tự tab hoặc vị trí nút. Trang trí không được gán nghĩa “giỏi/kém” cho chuyên cần hoặc điểm của trẻ.

Mặc định SVG tĩnh, không âm thanh, không lặp hoặc phủ confetti. Nếu người dùng duyệt motion, một nhịp transform/opacity 180–240 ms sau kết quả hiếm gặp để giúp nhận ra phản hồi; Reduced Motion dùng đúng ảnh tĩnh. Các mockup đã render với reduced_motion=reduce, không có CSS/SVG animation.

Sau lựa chọn, đề xuất công tắc “Hiện mascot” trong Cài đặt hiện hữu, nhớ trên thiết bị; tắt ảnh vẫn giữ mọi chữ/biểu tượng lỗi/kết quả. Chưa thêm công tắc hay workflow vào app. Decorative image dùng alt rỗng, pointer-events:none; ảnh không thay thế trạng thái có thể đọc bằng trình đọc màn hình.

## Dung lượng và tác động nếu tích hợp sau này

| Asset | Raw bytes | Tổng gzip từng SVG (mtime=0) |
|---|---:|---:|
| Nếp · 6 pose | 6.077 | 2.460 |
| Mầm · 6 pose | 5.951 | 2.658 |
| Nhịp · 6 pose | 4.760 | 2.608 |
| Tổng 18 | **16.788** | **7.726** |

Ước lượng giao thêm cho client nếu chỉ chọn Nếp: **6.077 raw / khoảng 2.460 gzip bytes** cho sáu SVG; đây là cộng dung lượng file, chưa phải số đo bundle/network. Presenter, HTTP headers và cache chưa đo. Baseline, PNG mockup và contact sheet là hồ sơ khám phá, không giao cho client sản phẩm. Toàn thư mục mascot đã đo dưới 15.000.000 bytes; số đo cuối nằm trong evidence/validation.json và visual-handback.md.

Srcwalk xác nhận sáu đường dẫn component trong bảng trên và shared/features.ts, data/store.ts, app/routes.tsx. Nếu được duyệt mới thêm presenter dùng chung/tài sản cục bộ rồi nối vào các component; không sửa hệ thống dữ liệu chỉ để trang trí. Không nêu đường dẫn iOS vì chưa kiểm file native cụ thể; cần chọn cách chuyển vector phù hợp trước triển khai. Chỉ General Lead cập nhật spec/kiến trúc sau lựa chọn; packet này không sửa sản phẩm hay docs.

## Bằng chứng, giới hạn và lịch sử

Chạy prototype đang có tại **http://127.0.0.1:5173**, PID 37020 thuộc phiên khác. Lệnh khởi động khi chưa có server: `cd design/prototype && npm run dev -- --host 127.0.0.1`. Xem gallery: `open plans/20261021-mvp/design/mascot/index.html`.

Tái tạo ảnh bằng `PYTHONDONTWRITEBYTECODE=1 python3 plans/20261021-mvp/design/mascot/evidence/complete.py`; tạo contact sheet/cặp đối chiếu bằng `... evidence/render_evidence.py`; kiểm bằng `.../validate.py`. Chi tiết đầy đủ tại [evidence/visual-check.md](evidence/visual-check.md). Fixture dùng createSeed chỉ để tạo dữ liệu, thay định danh/ghi chú, nạp localStorage trước app load; interception features.skipLogin=false chỉ trong response của browser, không sửa nguồn và không mutate module store/router.

Đã mở xem từng ảnh cạnh baseline và contact sheet. Pixel ngoài box SVG thay đổi **0** ở cả 10 ảnh; text/control/icon có clearance 8 px theo DOM gốc; không đổi geometry hay che CTA. SVG nằm trọn canvas, bottom navigation và FAB không bị phủ; notch/Safari/iPhone thật chưa kiểm. Chỉ theme sáng và cỡ chữ prototype mặc định được chụp; static background không chứng minh Dynamic Type/large text, dark theme hay VoiceOver. Không claim tích hợp hoặc hiệu năng iPhone.

Lịch sử 21-10: ENOSPC chặn Chromium/ghi log, một recovery brief04 đã dừng theo giới hạn; hai ảnh thử sai role picker được xoá. Ngày 22-10 General Lead cho tiếp tục sau phục hồi đĩa, đã hoàn tất ảnh theo brief05. Không cài/build; browser context riêng đóng, thư mục tạm do worker tạo được dọn; server có trước được giữ nguyên. 18 SVG gốc không đổi.

## Cần người dùng chọn

Chọn Nếp/Mầm/Nhịp; chọn các vị trí được bật (khuyến nghị bắt đầu đăng nhập + empty + phản hồi hiếm); chọn mặc định bật/tắt. Có thể quyết motion sau bản tĩnh. Original artwork không lấy asset bên thứ ba, nhưng chưa rà nhãn hiệu/khả năng trùng hình trên thị trường; không khẳng định độc quyền pháp lý.

# Review sol 5 — kiểm lại màn chi tiết buổi học sau 4929b05

Ngày 24/10/2026. Worktree: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`.
Candidate/HEAD: `4929b051dc42f560c9e734db9b36e54d28fc08cc`; đối chiếu `113730b..4929b05 -- ios/`.

**Kết luận: CHƯA ĐẠT cổng nghiệm thu UI.** Bằng chứng mới đủ khép phần G1 trên iPhone 16 cho đường Lớp → lớp → buổi → back hai lần, hình thức nút Lưu ghim, menu bốn trạng thái và sheet info. V1, V3, T1 đã khép; C1/C2 khép theo quyết định đã chốt. G1 còn **Chặn** vì chưa có ảnh app thật SE 3 theo gate bắt buộc. Không phát hiện hồi quy mới trong diff 4929b05; thiếu bằng chứng không đồng nghĩa đã xác nhận lỗi runtime.

## Phạm vi và bằng chứng đã kiểm

- Chỉ đọc mã/diff, tài liệu, ảnh và artifact có sẵn; không build, chạy simulator, đăng nhập hay chạy test mới; không thao tác staging.
- Đã đọc `git show 4929b05`, toàn bộ `git diff 113730b..4929b05 -- ios/`, review-sol-4.md, p7-report.md, session-feedback-report.md, docs/spec.md, docs/architecture.md và ios/docs/ui-verification-gate.md.
- Đã mở và **XEM đủ 26 ảnh hiện tại** trong `shots/after-session-fb/`: 8 ảnh tiền tố `real-iPhone16-`, 9 ảnh harness `iPhone16-` và 9 ảnh harness `SE3-`. Không suy nội dung ảnh từ tên file.
- Đã đọc flow có sẵn `/private/tmp/qlh-ux3-p7/flows/real.yaml:3–52`: đi từ gốc vào lớp/buổi, mở rồi đóng menu, cuộn, mở/đóng sheet, vuốt back hai lần; không nhập chữ, không chọn trạng thái khác, không bấm Lưu. Flow + chuỗi ảnh + báo cáo P7 hỗ trợ kết luận đường điều hướng này; reviewer không tự chạy lại.
- `git diff --check 113730b..4929b05 -- ios/` đạt, exit 0. Kiểm đọc bằng Python xác nhận 87 phép gán `static let` cũ trong Tokens.swift vẫn giữ nguyên; chỉ thêm hairline=1 và pillChevronSize=10.
- `/private/tmp/qlh-ux3-p7/test.log` có tổng kết **160 tests, 1 skipped, 0 failures; TEST SUCCEEDED**, khớp p7-report.md:4. Đây là đọc kết quả có sẵn, không phải reviewer chạy lại; chưa chứng minh độc lập binary/ảnh khớp chính xác mã sau sửa token. Lệnh đọc summary xcresult bị từ chối quyền ghi cache TestReport; không dùng kết quả lệnh đó để chứng nhận test.
- Bốn file M của người dùng vẫn là Info.plist, Localizable.xcstrings và hai entitlements; cả ba file trong commit 4929b05 không bao gồm chúng. Không sửa các file này.

## G1 — ảnh app thật đã chứng minh đến đâu?

Tiền tố dưới đây là `shots/after-session-fb/real-iPhone16-`.

| Ảnh đã xem | Quan sát và giới hạn |
|---|---|
| 01-goc-lop-tab-bar-hien.png | Gốc Lớp có tab bar hệ thống, không có back. |
| 02-chi-tiet-lop-tab-bar-an.png | Chi tiết lớp có back, indicator Buổi học, không tab bar. |
| 03-diem-danh-dau.png | Chi tiết buổi có ba nhãn tab, Điểm danh được gạch chân, info, pill có chevron; không dòng phụ/thẻ Người dạy/hướng dẫn vuốt. Thanh Lưu nằm đáy, tab bar ẩn. |
| 04-menu-trang-thai.png | Menu mở rõ Có mặt/Vắng/Muộn/Có phép, dấu chọn Có mặt. Không chứng minh chọn từng mục hoặc lưu. |
| 05-diem-danh-cuoi.png | Nội dung đã cuộn đến dòng cuối, dòng cuối nằm trên thanh Lưu; nút giữ cùng vị trí so với 03. Không có bàn phím. |
| 06-sheet-thong-tin.png | Sheet mở, đọc đủ lớp/ngày/giờ và hai vị trí người dạy; GV chính khớp tên tài khoản ở gốc, trợ giảng Không có. Không chứng minh dữ liệu phân công — điều đó đã được giới hạn theo quyết định chốt. |
| 07-back-ve-chi-tiet-lop.png | Sau back từ buổi, chi tiết lớp vẫn không có tab bar. |
| 08-back-ve-goc-tab-bar-hien.png | Sau back tiếp về gốc, tab bar xuất hiện lại. |

**Đủ cho các hành vi/hình thức nêu trên trên iPhone 16 trong phiên staging có sẵn.** “App thật iPhone 16” ở đây phân biệt app staging với harness DemoScreens; bộ ảnh không tự chứng minh đã thử trên iPhone phần cứng hoặc với giáo viên sử dụng thực tế. Không lấy chữ “demo” trong tên tài khoản làm bằng chứng đó là DemoScreens; dữ liệu khác fixture, flow đi bằng điều hướng thường, và P7 mô tả phiên staging sẵn có.

**Chưa đủ để khép toàn bộ G1.** Gate `ios/docs/ui-verification-gate.md:3–4,8,15,39,43–44` yêu cầu app thật, hai máy và không coi ô chưa chụp là đạt. Chưa có bộ app thật SE 3. Cấm đăng nhập mới giải thích vì sao chưa bổ sung được; không tự động miễn yêu cầu này. Không yêu cầu reviewer tự đăng nhập hoặc đổi dữ liệu để gỡ chặn.

| Khoảng trống | Đánh giá trong lượt này |
|---|---|
| App thật SE 3: chi tiết lớp/buổi, menu, sheet, đầu/cuối và back | **Chặn G1** do thiếu máy bắt buộc. Harness SE tốt chỉ hỗ trợ bố cục fixture, không thay app thật. |
| Chọn tab Nhận xét/Bài tập về nhà | **Vừa**, chưa có ảnh indicator khi chọn và nội dung thật của hai tab. Nhãn thấy đủ khi Điểm danh được chọn không chứng minh hai tab hoạt động; không coi là hồi quy đã xác nhận hoặc blocker độc lập bổ sung. |
| Chi tiết buổi hủy/chưa tới ngày | **Vừa**, chưa có ảnh nhánh đó. Ảnh root/lớp có thẻ buổi tương lai hoặc đã hủy không phải ảnh màn chi tiết. Mã vẫn giữ cancelled branch và readOnly/gesture guard; 4929b05 không đổi điều kiện nghiệp vụ. |
| Bàn phím giờ muộn/ghi chú; Dynamic Type lớn | **Vừa**, chưa nghiệm thu tránh che/cắt chữ, nhất là SE 3. Không có bằng chứng lỗi mới. |
| Lưu thành công/lỗi/loading/disabled, chọn trạng thái rồi lưu | **Vừa**, giới hạn chấp nhận được cho review chỉ đọc hiện tại, chưa phải nghiệm thu đường ghi. Không yêu cầu bấm Lưu/đổi staging trái ràng buộc. Nhãn “Đã lưu trên máy” trong ảnh không chứng minh một lần lưu thành công. |
| Lịch → buổi → back, đổi tab gốc, push sâu Tạo bài kiểm tra | **Vừa**, chỉ đường Lớp → lớp → buổi → back đã có bằng chứng mới. Không suy rộng cho mọi đường điều hướng. |

Các mục Vừa có thể ghi nhận như giới hạn trong phạm vi kiểm này, nhưng không được diễn đạt thành đã kiểm PASS. Không mở lại toàn bộ ma trận màn không đổi của P5.

## C1/C2, V1/V3 và T1

| Mục cũ | Kết luận sau kiểm lại |
|---|---|
| C1 — nguồn người dạy | **Khép.** Theo quyết định người dùng/GL: giữ nguồn thẻ cũ, không schema/API mới. TeacherSessionDetailView.swift:67,197–198 dùng data.displayName và trợ giảng nil. p7-report.md:22–25 ghi đúng giới hạn; session-feedback-report.md:18–22 nói rõ không phải phân công và cả tài khoản Admin/trợ giảng vẫn thấy tên mình ở GV chính. Không đòi thêm phân công/chưa phân công để chặn P7. |
| C2 — ba/bốn trạng thái | **Khép.** Giữ bốn theo spec:34–35,210 và quyết định chốt ở hai báo cáo. Ảnh menu app thật/harness khớp. Không đề nghị bỏ Có phép. |
| V1 — menu SE 3 | **Khép phần bằng chứng harness.** Đã xem SE3-01 và SE3-02: 02 mới mở menu bốn mục rõ ràng, khác 01 đang đóng. So byte trả false; SHA256 01 bắt đầu 0d51400c, 02 bắt đầu 65d533e0. Không chỉ dựa vào hash vì ảnh còn khác giờ hệ thống. Chưa chứng minh lưu trạng thái trên app thật SE. |
| V3 — token | **Khép.** Tokens.swift:72–75 thêm AppMetrics.hairline=1 và pillChevronSize=10; TeacherUI.swift:17 giữ listGap=8. Attendance:63,75,94,122–123 dùng listGap; :126 dùng hairline; :268 dùng pillChevronSize. Sheet:220–221 tái dùng cardPaddingHorizontal/Vertical=16/14. Giá trị bằng literal trước đó, tên phù hợp mục đích, không sửa token dùng chung để ép bố cục. Không yêu cầu dọn toàn bộ literal cũ ngoài phần bị nêu. |
| T1 — báo cáo vượt bằng chứng | **Khép.** P7:16 thừa nhận ảnh SE cũ sai rồi chụp lại; :18 phân biệt ảnh thật, ghi chính xác tác giả chỉ xem 04/05/07/08; :28–32 liệt kê thiếu và phân biệt harness. Reviewer lượt này đã xem thêm cả 01/02/03/06. Test log khớp số báo cáo. Câu “không còn literal mới” chỉ chấp nhận trong phạm vi các call site V3 đã sửa, không hiểu là toàn dự án sạch literal. |

## Hồi quy từ 4929b05

Toàn bộ delta chỉ gồm Tokens.swift, TeacherAttendanceView.swift và TeacherSessionDetailView.swift. Tokens chỉ thêm hai khai báo, không đổi màu, radius, typography, tap size hay giá trị cũ. listGap đã là 8; padding card đã là 16/14. Divider vẫn 1 pt, chevron vẫn 10 pt. Không đổi nhánh cancelled/future, Menu/Picker binding, save/draft/outbox, hidden-tab-bar modifier, schema hay API.

**Không phát hiện hồi quy mới bằng kiểm mã và ảnh có sẵn.** Kết luận này không thay cho chạy app/test sau commit hoặc chứng nhận mọi trạng thái runtime.

“Đã lưu trên máy” thường trực ở ảnh app thật 03–05 và harness là **tồn tại cũ, Vừa, không chặn P7** theo phạm vi yêu cầu. TeacherAttendanceView.swift:110–118 giữ nhánh AppSaveStatus cũ; lệch spec.md:188,217 và architecture.md:98,105–106 chỉ hiện lỗi. P7:31 đã nêu trung thực. Không dùng nhãn đó làm bằng chứng người dùng đã bấm Lưu.

## Flow 03 / người dùng thật

Có bằng chứng tài liệu rằng **một lần chạy staging trước đã được thử và thất bại**, không có bằng chứng bản flow hiện tại đã PASS:

- `ios/docs/report-i18.md:60–65,74` ghi lần 22/10 đăng nhập thành công nhưng flow 03 fail vì không tải được dữ liệu phụ huynh; không xác nhận UI điểm danh/BTVN.
- `p4-report.md:12–18` chỉ báo bốn flow demo PASS; bản `staging/03-guardian-read.yaml` đã sửa chưa chạy.
- Bản flow hiện tại :22–35 chờ “Nhận xét mới nhất”, “Đi học”, Báo cáo, “Chuyên cần”, “Bài tập về nhà”. Có mã flow không phải có kết quả thực thi.
- 8 ảnh P7 app thật là phiên **giáo viên**, không thể chứng minh flow phụ huynh 03. Không có biên bản cho thấy giáo viên/phụ huynh là người dùng thực tế đã chạy thử; tài khoản staging và automation không tự chứng minh điều đó.

**Tôi không thể xác minh điều này vì chưa có artifact PASS của flow 03 hiện tại hoặc bằng chứng chạy thử với người dùng thực tế trong bộ tài liệu đã kiểm, và nhiệm vụ cấm đăng nhập/chạy app mới.** Không suy lỗi cũ vẫn còn ở candidate; cũng không tuyên bố đã sửa hay đã PASS. Xếp **Vừa — khoảng trống xác minh dự án**, không gán thành hồi quy của commit token.

## Mục còn mở theo mức độ

- **Chặn:** G1 thiếu ảnh app thật SE 3 theo ma trận gate; chưa thể báo nghiệm thu hoàn tất.
- **Cao:** không còn mục Cao mở trong phạm vi re-review này; C1/C2 đã khép.
- **Vừa:** các ca tab, nhánh buổi, bàn phím, trạng thái lưu và đường điều hướng ngoài chuỗi đã chụp; bằng chứng flow 03 hiện tại; trạng thái lưu thường trực là tồn tại cũ không chặn.
- **Thấp:** không còn T1; nên ghi hash commit token 4929b05 trực tiếp trong P7 để truy vết thuận tiện, nhưng reviewer không sửa báo cáo đó.

**Tôi không thể xác minh điều này hoạt động đầy đủ trên cả hai máy và mọi trạng thái vì thiếu bằng chứng app thật SE 3 cùng các ca đã liệt kê, và phạm vi reviewer cấm build/simulator/đăng nhập.** Review đã kiểm chứng phần khả dụng bằng diff, mã, đủ 26 ảnh, flow có sẵn, hash ảnh và tổng kết test log; không chứng nhận vượt các bằng chứng đó.

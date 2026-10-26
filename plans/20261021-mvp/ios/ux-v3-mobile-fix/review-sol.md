# Review sol — ux-v3 mobile fix

Ngày: 24/10/2026. Candidate: `5991ede..2f2a5cb`, chỉ `ios/`; HEAD xác nhận là `2f2a5cb6af8da12ef043e622e36adf61503f0ba5`. **Kết luận: CHƯA ĐẠT cổng nghiệm thu.** Các lỗi khung màn chính đã được sửa rõ rệt; còn lỗi hiển thị thang điểm, rủi ro đường dẫn khi đổi con và thiếu bằng chứng bắt buộc.

Review chỉ đọc mã/ảnh; không sửa app, build, xcodegen, simulator hay đăng nhập. Bốn file người dùng đang sửa không thuộc candidate và được bỏ qua. Đã đọc AGENTS.md, toàn bộ spec/architecture và sáu tài liệu proposal/before/P1–P4. Đã mở bằng công cụ đọc ảnh **toàn bộ 61 ảnh**: 5 user-refs, 10 before, 20 after-p1, 6 after-p2, 20 after-p3. Không chép số điện thoại hoặc nội dung nhận xét từ ảnh vào báo cáo.

Mọi đường dẫn `ios/...` dưới đây thuộc worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`; đường dẫn ảnh/tài liệu tương đối thuộc thư mục báo cáo này. Giữ nguyên quyết định người dùng: nav/tab hệ thống, một stack mỗi tab, large title ở gốc, inline ở màn con, back hệ thống, không avatar nổi, không thêm chuỗi vào Localizable.xcstrings.

## Bảng tiêu chí

| # | Tiêu chí | Kết quả | Bằng chứng và giới hạn |
|---|---|---|---|
| 1 | Đủ 5 lỗi proposal mục 2 | **CHƯA** | Các lỗi tràn status bar, lề nút thêm và Cài đặt đã sửa qua ảnh; bảng điểm vẫn cắt metadata. Trạng thái lỗi của ảnh 02 chưa có ảnh sau tương ứng. Chi tiết đối chiếu ở bảng tiếp theo. |
| 2 | Stack/nav/header/safe area/padding token | **CHƯA** | Đã bỏ stack ngoài ở `AuthFlowView.swift:101`; stack từng tab ở `TeacherRootView.swift:20` và `GuardianRootView.swift:59`. Không còn `.toolbar(.hidden, for: .navigationBar)` hoặc `safeAreaPadding` trong Features. Các stack trong sheet sửa lớp/sửa lịch/chọn con là presentation riêng, không phải lỗi lồng stack của shell. Tuy nhiên GuardianScroll ghi cứng padding (`GuardianComponents.swift:265`); đổi mật khẩu GV vẫn back tự dựng (`AuthFlowView.swift:121`, `AuthSettingsView.swift:333`). |
| 3 | Bảng điểm hàng chung, tên ghim, không cắt/lệch | **CHƯA** | Cả 6 ảnh after-p2 xác nhận hàng tên/điểm đã thẳng, tên đứng yên khi cuộn ngang, hàng cuối/chú thích cuộn lên trên tab bar. Nhưng ngày/thang điểm bị ellipsis ngay ở cột đầu trong cả hai ảnh `*-lop-diem-top.png`; tên HS nghỉ cũng bị rút gọn trong `*-cuoi-doc.png`. Mã vẫn là các VStack cột riêng (`ScoreGridTabView.swift:88`, `:124`), dùng chung số đo `Grid`, chưa có component hàng chung như gate yêu cầu. |
| 4 | TabView hệ thống GV/PH; Cài đặt gốc không back | **ĐẠT** | `TeacherRootView.swift:19`, `GuardianRootView.swift:58`; Cài đặt dùng `isRootTab: true` ở `AuthFlowView.swift:103`, `GuardianRootView.swift:115`. Ảnh `after-p1/{iPhone16,SE3}-cai-dat.png` và `after-p3/iPhone16-ph-cai-dat.png`: không back/avatar nổi, large title chuẩn. |
| 5 | Không hồi quy nghiệp vụ/quyền/offline/restoreSession/PDF; test không yếu đi | **CHƯA** | Không đổi tầng dữ liệu, AuthModel, repository, core, renderer PDF hoặc file test Swift. Restore task vẫn ở `AuthFlowView.swift:39`; quyền lọc tab giữ nguyên tại `TeacherClassDetailView.swift:184`; sheet PDF và cleanup giữ tại `MonthlyReportView.swift:77`. Tuy nhiên path PH không xoá khi đổi con (phát hiện V2), và fixture ảnh menu mất trạng thái mở (V4). 160 test hợp lý về số lượng nhưng không chứng minh các flow UI mới. |
| 6 | Chuỗi mới riêng, không số/chuỗi sai quy ước, không log nhạy cảm | **CHƯA** | Diff không đổi resource/localization; không có chuỗi UI mới cần catalog, không thêm lệnh log. Phần này đạt. Padding mới vẫn có literal thay token (`GuardianComponents.swift:265`, `AuthSettingsView.swift:28`, `TeacherClassDetailView.swift:34`), nên toàn tiêu chí chưa đạt. `Grid` là hằng có tên, không coi các kích thước bảng đó tự thân là vi phạm. |
| 7 | Ma trận ảnh sau đủ hai máy | **CHƯA** | Tổng hợp P1/P2/P3 đủ 10 màn GV cơ bản trên cả hai máy, menu lớp hai máy; PH chỉ có iPhone 16. Thiếu 7 ô PH bắt buộc trên SE 3; menu buổi SE cũng thiếu nếu kiểm riêng hai menu. Xem ma trận bên dưới. |
| 8 | Maestro và UI gate đúng mã/thực tế | **CHƯA** | Flow PH đổi sang 3 tab + push Điểm/Báo cáo và vuốt back phù hợp `GuardianRootView.swift:91`. Nhưng flow GV settings vẫn chạy harness có back/title cũ (`DemoScreens.swift:228`, `auth/09-settings-teacher.yaml:1`). Gate là yêu cầu tốt, song hiện chưa được thoả: ảnh thiếu, padding literal, bảng chưa dùng hàng chung. Không có script chụp ma trận hoặc XCUITest mới trong candidate như proposal mục 4/5 dự kiến. |
| 9 | Phân loại ba tồn tại ngoài phạm vi | **CHƯA** | “Đã lưu trên máy” là vi phạm spec thật, có từ trước. Dialog hủy tự dựng và màn đổi mật khẩu GV có back riêng không được spec nghiệp vụ cấm; cái sau chưa theo quyết định nav hệ thống của người dùng. Không gán cả ba thành lỗi spec. Xem bảng cuối. |

## Đối chiếu đúng 5 dòng proposal mục 2

| Dòng | Trước/tham chiếu đã xem | Sau đã xem | Kết quả |
|---|---|---|---|
| 1 — Báo cáo tràn status bar/hở nội dung | `user-refs/01.png`, `shots/before/iPhone16-lop-bao-cao.png` | `shots/after-p1/{iPhone16,SE3}-lop-bao-cao.png` | **ĐẠT cho lỗi tràn đầu màn**: title lớp, thanh tab và bộ chọn tháng nằm dưới status bar; thẻ có lề. `MonthlyReportView.swift:64`, `:113` thêm scroll + padding token. Ảnh chỉ ở đầu danh sách, chưa chứng minh dòng/nút cuối Báo cáo. |
| 2 — “+ Bài mới” sát mép; ô lỗi lưu | `user-refs/03.png`, `user-refs/02.png`, `shots/before/iPhone16-lop-bai-kiem-tra.png` | `shots/after-p1/{iPhone16,SE3}-lop-bai-kiem-tra.png` | **CHƯA toàn dòng**: lỗi lề đã sửa (`TestsTabView.swift:21`, `:30`). Ảnh 02 thực chất là trạng thái lỗi phía Báo cáo, không có ảnh sau lỗi. `MonthlyReportView.swift:187` vẫn Text đỏ, không đổi sang TeacherErrorBanner như biện pháp đã đề xuất. Không có bằng chứng lỗi lưu đã được tái hiện/xử lý. |
| 3 — Bảng điểm lệch/cắt | `user-refs/04.png`, `shots/before/iPhone16-lop-diem.png` | Toàn bộ 6 ảnh `shots/after-p2/` | **CHƯA trọn vẹn**: lệch hàng/tràn khung đã sửa; header metadata còn bị cắt. Không xem ảnh P1 của Điểm là bằng chứng cuối vì P2 đã thay thế. |
| 4 — Cài đặt khoảng trống/back/avatar | `user-refs/05.png`, `shots/before/iPhone16-cai-dat.png` | `shots/after-p1/{iPhone16,SE3}-cai-dat.png`; PH `after-p3/iPhone16-ph-cai-dat.png` | **ĐẠT**: bỏ cả back và avatar ngoài, không còn khoảng trống do stack ngoài; phần trống cho large title là chrome hệ thống. |
| 5 — Nav lớn tự dựng, thiếu HIG | Các ảnh 01/03/04/05 và before | P1 nav GV; P3 nav GV/PH, menu lớp/buổi, Tạo lớp | **ĐẠT cho các màn mục tiêu đã chụp**: native title/back/Menu/TabView. `TeacherClassDetailView.swift:211`, `TeacherSessionDetailView.swift:37`, `TestsTabView.swift:184`. Ngoại lệ Đổi mật khẩu GV được ghi riêng, không coi đã quét sạch toàn app. |

## Phát hiện theo mức độ

### Chặn cổng nghiệm thu

**C1 — Thiếu bằng chứng bắt buộc; chưa thể duyệt toàn candidate.** `ios/docs/ui-verification-gate.md:15` quy định ô thiếu không coi đạt, `:44` không duyệt khi chưa có ảnh app thật. Thiếu toàn bộ PH SE 3; thiếu ảnh trạng thái lỗi tương ứng user-refs/02. Ảnh PH Báo cáo iPhone 16 là empty state (`shots/after-p3/iPhone16-ph-bao-cao.png`), nên chưa kiểm nội dung báo cáo dài, nút PDF/chia sẻ. Không có ảnh app thật màn GV nhập điểm/tạo bài sau đổi nav, cũng không có bằng chứng cuộn cuối Báo cáo. Những ảnh bổ sung sau không nằm hết trong ma trận tối thiểu nhưng cần để kết luận tiêu chí 5.

Cách khép: người triển khai bổ sung ảnh app thật còn thiếu và một lượt flow đổi con giữa hai tab; chụp đầu/cuối Báo cáo, error banner, nhập điểm/tạo bài. Không dùng các lượt Maestro demo đã PASS để thay cho cổng ảnh. Đây là chặn bằng chứng, không phải kết luận app crash. Reviewer không tự chạy theo giới hạn task.

### Cao

Không xác nhận được lỗi mức Cao từ phạm vi chỉ đọc này. Không suy diễn hồi quy phân quyền hoặc mất dữ liệu chỉ từ việc đổi shell.

### Vừa

**V1 — Header bảng điểm vẫn giấu điểm tối đa, dù lỗi “không cắt” được báo đã sửa.** `ios/QuanLyLop/Features/Scores/ScoreGridTabView.swift:35` giới hạn cột 112pt; `:135` ghép ngày và thang điểm trên một dòng, `:142` lineLimit 1. Cột đầu đã hiển thị ellipsis trong cả `shots/after-p2/iPhone16-lop-diem-top.png` và `SE3-lop-diem-top.png`, nghĩa là cuộn ngang cũng không làm đủ chữ bên trong cột. Hai bài dùng thang điểm khác nhau nên metadata này có ý nghĩa trực tiếp (spec `docs/spec.md:43`). Số điểm và đường kẻ đã thẳng; việc cột tiếp theo bị khuất trước cuộn là bình thường, không phải lỗi riêng.

Cách sửa: tách ngày/thang điểm thành hai dòng hoặc tăng chiều rộng cột; giữ chung chiều cao header của tên và điểm. Cho tên HS nghỉ hai dòng hoặc đặt badge ở dòng phụ để tên không bị ép còn vài ký tự (`:104`). Kiểm lại hai máy, bài có max 1000, tên dài và ít nhất 4 cột. Không cần viết lại toàn bảng chỉ để đổi tên cấu trúc.

**V2 — Path của tab PH giữ phiếu của con trước sau khi đổi con ở tab kia.** `ios/QuanLyLop/Features/Guardian/GuardianRootView.swift:34` giữ riêng `classesPath/commentsPath`; chọn tab không xoá chúng (`:49`), chọn con chỉ đổi selectedChildID/month (`:230`). Destination lại tra session ID trên **con đang chọn** (`:168`). Tình huống: mở phiếu con A ở tab Nhận xét → qua Lớp → chọn con B khác lớp → quay lại Nhận xét. Path vẫn chứa ticket của A, tra trong B sẽ vào “Không tìm thấy buổi học”; nếu hai con cùng lớp thì màn phiếu tự chuyển ngữ cảnh sang B. Trước candidate, chọn tab gọi `select` và xoá `detail`, nên trường hợp giữ path qua tab này là mới.

Cách sửa nhỏ: xoá cả hai path khi selectedChildID đổi; hoặc lưu path theo từng con nếu muốn giữ lịch sử điều hướng. Thêm ca kiểm A/B khác lớp và cùng lớp. Đây là kết luận tĩnh có đường đi cụ thể, chưa tái hiện runtime; dữ liệu vẫn đi qua bộ lọc child hiện hành nên không kết luận rò quyền.

**V3 — Trạng thái thành công thường trực ở Tạo lớp trái spec; tồn tại từ trước.** `ios/QuanLyLop/Features/Classes/TeacherClassDetailView.swift:122` luôn nhúng saveStatus; `:156` hiện mọi `source.kind`, không chỉ lỗi. Cả `shots/before/iPhone16-tao-lop.png` lẫn `shots/after-p3/{iPhone16,SE3}-gv-tao-lop.png` hiện trạng thái đã lưu ngay khi form còn trống. Spec `docs/spec.md:188`, `:217`, `:249` và architecture `docs/architecture.md:98`, `:105` chỉ cho hiện lỗi; ngoại lệ duy nhất là thông báo gửi nhận xét khi offline, không áp dụng Tạo lớp.

Cách sửa: chỉ vẽ trạng thái lỗi tại màn này; giữ theo dõi nội bộ. Không cần thay nghiệp vụ hay sửa spec. Không quy đây là hồi quy do candidate.

**V4 — Flow/harness GV Cài đặt chưa phản ánh cấu hình app thật; ảnh menu test bị mất coverage.** `ios/maestro/auth/09-settings-teacher.yaml:2` nói tab gốc không back, nhưng cờ `settings-teacher` chạy `DemoAuthFlow`; `ios/QuanLyLop/Features/Auth/DemoScreens.swift:228` vẫn truyền `onClose` và không truyền `isRootTab: true`, nên dựng back/title riêng trong stack có sẵn. Flow chỉ kiểm tên/đổi vai trò, không assert không back. Ngoài ra `TeacherDemoScreens.swift:138` bỏ `menuOpen: true`, khiến case classDetailMenu giờ giống classDetail; `QuanLyLopTests/Classes/TeacherScreenshotTests.swift:19` vẫn render mọi case như cũ. File XCTest không đổi, nhưng coverage ảnh menu đã giảm gián tiếp.

Cách sửa: cho harness GV dùng cùng `isRootTab` như app; thêm kiểm không back ở tab gốc. Chụp Menu hệ thống bằng flow tương tác app thật thay vì giữ một case ảnh menu thực chất đang đóng. PASS của các flow demo PH trong P4 không xác minh hai vấn đề này.

### Thấp

**T1 — Khung mới chưa dùng token nhất quán.** `ios/QuanLyLop/Features/Guardian/GuardianComponents.swift:264` ghi trực tiếp spacing 12, padding 20/8/16; `AuthSettingsView.swift:28` và `:365` thêm khoảng 8 trực tiếp; `TeacherClassDetailView.swift:34` thêm padding đáy 16. Trong khi `ui-verification-gate.md:35` yêu cầu padding theo token. Khung Tests/Score/Report đã dùng TeacherMetrics đúng ở lề màn.

Cách sửa: dùng token có sẵn phù hợp, hoặc thêm tên token dùng chung cho khung PH/auth. Không đánh đồng các literal biểu tượng, route, dấu phân cách và kích thước Grid có tên với chuỗi UI chưa localize.

**T2 — SE vẫn rút gọn nhãn tab “Bài kiểm tra”.** Thấy rõ trong `shots/after-p3/SE3-gv-lop-chi-tiet.png` và `after-p1/SE3-lop-bai-kiem-tra.png`; `ios/QuanLyLop/Features/Classes/TeacherUI.swift:337` lineLimit 1 trong hàng tab cố định. Đây là tồn tại sẵn trong component; chưa đạt câu “không cắt chữ” tại gate `:39`, nhưng không mất chức năng chọn tab.

Cách sửa: cho nhóm tab cuộn ngang hoặc bố trí nhãn đủ chỗ; kiểm default Dynamic Type trên SE. Không thu nhỏ toàn bộ typography chỉ để ép 5 nhãn.

## Ma trận ảnh sau đã xem

Đây là ma trận **tổng hợp các pha**, không tuyên bố mọi ô được chụp lại ở HEAD cuối. Các thay đổi P3 của menu/khung GV có thể tác động màn P1; nên ít nhất smoke lại trên build cuối. `P1/P2/P3` dưới đây là `shots/after-p1`, `after-p2`, `after-p3`.

| Màn | iPhone 16 — ảnh đã xem | SE 3 — ảnh đã xem / thiếu |
|---|---|---|
| GV · Lớp | P3 `iPhone16-gv-lop.png` | P3 `SE3-gv-lop.png` |
| GV · Lịch | P3 `iPhone16-gv-lich.png` | P3 `SE3-gv-lich.png` |
| GV · Cài đặt | P1 `iPhone16-cai-dat.png` | P1 `SE3-cai-dat.png` |
| GV · Chi tiết lớp/Buổi học | P3 `iPhone16-gv-lop-chi-tiet.png` | P3 `SE3-gv-lop-chi-tiet.png` |
| GV · Bài kiểm tra | P1 `iPhone16-lop-bai-kiem-tra.png` | P1 `SE3-lop-bai-kiem-tra.png` |
| GV · Điểm | P2 `iPhone16-lop-diem-{top,cuoi-doc,cuoi-ngang}.png` | P2 `SE3-lop-diem-{top,cuoi-doc,cuoi-ngang}.png` |
| GV · Học sinh | P1 `iPhone16-lop-hoc-sinh.png` | P1 `SE3-lop-hoc-sinh.png` |
| GV · Báo cáo | P1 `iPhone16-lop-bao-cao.png` | P1 `SE3-lop-bao-cao.png` |
| GV · Chi tiết buổi | P3 `iPhone16-gv-menu.png` (menu đóng), P1 `iPhone16-buoi-hoc.png` | P1 `SE3-buoi-hoc.png` |
| GV · Tạo lớp | P3 `iPhone16-gv-tao-lop.png` | P3 `SE3-gv-tao-lop.png` |
| GV · Menu lớp | P3 `iPhone16-gv-menu-lop.png` | P3 `SE3-gv-menu-lop.png` |
| GV · Menu buổi (tách riêng để rõ coverage) | P3 `iPhone16-gv-menu-buoi.png` | **THIẾU** |
| PH · Lớp học của con | P3 `iPhone16-ph-lop.png` | **THIẾU** |
| PH · Nhận xét của cô | P3 `iPhone16-ph-nhan-xet.png` | **THIẾU** |
| PH · Cài đặt | P3 `iPhone16-ph-cai-dat.png` | **THIẾU** |
| PH · Điểm | P3 `iPhone16-ph-diem.png` | **THIẾU** |
| PH · Báo cáo | P3 `iPhone16-ph-bao-cao.png` — chỉ empty state | **THIẾU** |
| PH · Phiếu buổi học | P3 `iPhone16-ph-phieu.png` | **THIẾU** |
| PH · Đổi mật khẩu | P3 `iPhone16-ph-doi-mat-khau.png` | **THIẾU** |
| PH · Chọn con (bổ sung ngoài ma trận tối thiểu) | P3 `iPhone16-ph-chon-con.png` | **THIẾU** |

Rủi ro thiếu PH SE: nhãn tab PH dài hơn GV, profile có nhiều con và form mật khẩu cần cuộn khi bàn phím mở; ảnh iPhone 16 không chứng minh vừa màn SE. Chưa có ảnh bàn phím ở cả hai máy. P3 giải thích đăng nhập SE thất bại và đã dừng; đó là lý do hợp lệ để dừng thao tác, không biến ô thiếu thành đạt. Không yêu cầu reviewer thử đăng nhập lại.

Ảnh trước: đã xem đủ 10 màn GV iPhone 16; thiếu toàn bộ GV SE và PH cả hai máy như before-report ghi. Do đó không có so sánh trước–sau trực tiếp PH/SE. Các ảnh P1 Điểm còn tràn đã được xem và được P2 thay thế; không báo lỗi P1 như lỗi vẫn còn ở candidate.

## Đánh giá test và giới hạn xác minh

- Đếm tĩnh được **160 hàm `func test...` trong 30 file Swift**, khớp P1/P2/P3 báo 160 tests, 1 skipped, 0 failures. `TeacherScreenshotTests.swift:14` skip khi không cấu hình thư mục ảnh, giải thích hợp lý 1 skipped; chưa xác nhận đó chính là test bị skip trong từng lần chạy vì không có result bundle/log ở bộ tài liệu được giao.
- `git diff 5991ede..2f2a5cb -- ios/QuanLyLopTests` rỗng: không xoá assertion hay test Swift. Không thêm test mới cho các path/geometry UI. Các test hiện có có nội dung phù hợp: restore offline/thu hồi quyền (`RestoreSessionOfflineTests.swift:8`, `:44`), PH chỉ thấy phiếu đã gửi/đúng con (`GuardianAccessTests.swift:7`, `:44`), PDF có dữ liệu/đường dẫn/chỉ gửi yêu cầu phát hành (`ReportPDFLocalTests.swift:6`, `:23`). Chúng không kiểm được alignment hay path khi đổi con.
- P4 chỉ báo PASS bốn flow demo trên iPhone 16; staging/03-guardian-read và hai flow launch-arguments chưa chạy. Flow staging đợi “Chuyên cần” chỉ phù hợp tài khoản có báo cáo đã phát hành; ảnh PH thật P3 đang empty state nên không thể lấy ảnh đó làm bằng chứng flow này PASS.
- `git diff --check 5991ede..2f2a5cb -- ios/` đã chạy trong review và đạt (exit 0). Chỉ xác minh whitespace của diff.
- **Tôi không thể xác minh điều này hoạt động bằng một lần chạy app/test mới vì nhiệm vụ reviewer cấm build, xcodegen, simulator và đăng nhập.** Kết luận runtime giới hạn ở ảnh đã xem và báo cáo người triển khai, cộng phân tích mã tĩnh; không xác nhận độc lập 160 test đã PASS trên HEAD.

## Ba tồn tại ngoài phạm vi được yêu cầu đối chiếu

| Tồn tại | Vi phạm spec thật? | Đánh giá/cách xử lý |
|---|---|---|
| Tạo lớp hiện “Đã lưu trên máy” | **Có** | Spec `:188/:217/:249`, architecture `:98/:105`; ảnh before lẫn P3 và `TeacherClassDetailView.swift:153` xác nhận. V3 là lỗi cũ, nên sửa bằng chỉ hiển thị lỗi. |
| Xác nhận hủy buổi là overlay tự dựng | **Không có căn cứ coi là vi phạm spec** | Spec `docs/spec.md:209` yêu cầu hủy buổi bằng nút, không quy định API dialog. `TeacherSessionDetailView.swift:53` vẫn có xác nhận và hành động; `TeacherUI.swift:459` chỉ cho scrim bỏ safe area, không cho nội dung bỏ safe area. Có thể đổi `.confirmationDialog`/`.alert` để đồng bộ native sau; chưa có ảnh dialog mở để kết luận chất lượng tương tác. Không đánh đồng Menu hệ thống P3 với dialog xác nhận. |
| Đổi mật khẩu GV là màn riêng có back tự dựng | **Không vi phạm spec nghiệp vụ; chưa theo quyết định HIG/nav của người dùng** | Spec `docs/spec.md:148/:174` liệt kê tính năng, không quy định push/back. `AuthFlowView.swift:121` gọi `AuthChangePasswordView` mặc định `isPushed=false`; `AuthSettingsView.swift:333` dựng back/title. PH đã push đúng (`GuardianRootView.swift:116`), GV chưa. Có từ trước, ngoài màn mục tiêu đã chụp; nên cho GV push trong stack Cài đặt như PH rồi bổ sung ảnh hai máy. Không được tuyên bố toàn app đã dùng back hệ thống. |

Không đề xuất đảo TabView/nav về prototype cũ, sửa spec để hợp thức hoá trạng thái lưu, hay đụng bốn file người dùng đang sửa.

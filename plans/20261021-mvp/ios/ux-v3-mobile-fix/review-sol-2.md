# Review sol 2 — ux-v3 mobile fix

Ngày 24/10/2026. **Kết luận: CHƯA ĐẠT cổng nghiệm thu.** Các lỗi V1/V2/V3, token T1, nhãn tab T2 và cách mở Đổi mật khẩu GV đã được sửa đúng trong phạm vi mã/ảnh đã xem. Chặn còn lại là bằng chứng trạng thái lỗi Báo cáo, đúng một mục sửa trực tiếp từ ảnh người dùng. Không xác nhận được hồi quy chức năng mức Cao trong sáu commit.

## Phạm vi và cách kiểm

- Candidate chính xác: `git diff 2f2a5cb..fa61c9e -- ios/`; HEAD xác nhận `fa61c9e8c04e151efd71433a9195308b1fb2bfdc`. Sáu commit: `d7fec92`, `3d23fab`, `6460485`, `d37782b`, `1dc9bfb`, `fa61c9e`; 12 file, +72/-56 dòng.
- Chỉ đọc mã, tài liệu và ảnh. Không sửa app, build, xcodegen, simulator, đăng nhập hoặc chạy Maestro. Đã đọc toàn bộ spec/architecture, review-sol.md, p5-report.md và cổng UI.
- Đã mở và xem **đủ 39/39 ảnh P5**, cùng 6 ảnh P2/P3 để đối chiếu và `user-refs/02.png`: tổng 46 ảnh trong lượt này. Ảnh Cài đặt chứa SĐT; không chép SĐT hoặc nội dung nhận xét vào báo cáo.
- Bốn file người dùng đang sửa (Info.plist, Localizable.xcstrings, hai entitlements) không thuộc candidate, không đánh giá nội dung và không sửa. Giữ nguyên quyết định native NavigationStack/TabView/Menu, HIG và chuỗi riêng của người dùng.
- Đường dẫn mã bên dưới thuộc worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`. Đường dẫn ảnh tương đối thuộc thư mục báo cáo này. `P5` là `shots/after-p5/`.

## Kiểm lại từng mục còn CHƯA

| Mục | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| C1 — PH trên SE 3 | **ĐẠT phần thiếu ma trận PH** | Đã xem đủ `P5/SE3-ph-{lop,nhan-xet,cai-dat,diem,bao-cao,phieu,doi-mat-khau}.png`; thêm `chon-con` và `doi-con-*`. Nhãn ba tab đủ chữ, các màn con có back và title hệ thống. Báo cáo chỉ là empty state; không coi đó là bằng chứng nhánh có dữ liệu/PDF. |
| C1 — Báo cáo GV đầu/cuối | **ĐẠT bố cục đã chụp** | `P5/{iPhone16,SE3}-gv-bao-cao-{dau,cuoi}.png`: title/tháng dưới status bar; cuối danh sách, nút phát hành và dòng giải thích nằm trên tab bar. Không có banner lỗi trong cả bốn ảnh. |
| C1 — ảnh lỗi Báo cáo | **CHƯA — Chặn bằng chứng** | `p5-report.md:11/:18` xác nhận chưa tái hiện được. `user-refs/02.png` là chính trạng thái lỗi cần đối chiếu. Mã đã đổi component ở `MonthlyReportView.swift:187`, nhưng chưa có ảnh app thật xác nhận nội dung lỗi dài, vị trí và khả năng cuộn tới lỗi trên hai máy. Không kết luận nhánh này hỏng; cũng không đánh dấu sửa xong toàn mục bằng ảnh trạng thái bình thường. |
| C1 — PH Báo cáo có dữ liệu; bàn phím mật khẩu | **CHƯA xác minh — giới hạn chấp nhận được cho diff này** | Hai ảnh `P5/*-ph-bao-cao.png` đều rỗng. Bốn ảnh `P5/*-{gv,ph}-doi-mat-khau.png` đều đóng bàn phím. Nhánh báo cáo có dữ liệu/PDF không đổi trong sáu commit; GuardianScroll chỉ thay literal bằng token có cùng giá trị. Form mật khẩu vẫn dùng AuthPage/ScrollView (`AuthComponents.swift:71`), không có thay đổi bỏ keyboard safe area. Giữ là khoảng trống kiểm thử Vừa; không tự nâng thành lỗi chức năng hoặc chặn riêng. Không chứng nhận PDF/chia sẻ hay thao tác nhập trên SE đã chạy. |
| V1 — header/tên HS nghỉ | **ĐẠT lỗi cụ thể đã báo** | `ScoreGridTabView.swift:31` dùng header 84, hàng 60, cột tên 136/cột bài 132; metadata cho hai dòng ở `:135–143`; tên hai dòng/badge dưới tên ở `:104–121`. Đã xem đủ sáu ảnh `P5/*-gv-diem-{dau,cuoi,cuoi-ngang}.png`: thang 15 đọc đủ ở cột đầu, tên/badge không còn ép ngang, hàng điểm và tên thẳng, tên giữ vị trí khi đổi offset ngang. So với `P2/SE3-lop-diem-top.png` và `SE3-lop-diem-cuoi-doc.png`, ellipsis cũ được khép cho dữ liệu này. |
| V2 — xoá path đổi con | **ĐẠT mã + ca cùng lớp trên hai máy** | `GuardianRootView.swift:80–83` xoá cả classesPath/commentsPath khi selectedChildID đổi; chọn con ở `:234`. Đã xem `P5/{iPhone16,SE3}-ph-phieu.png`, `*-ph-doi-con-lop.png`, `*-ph-doi-con-nhan-xet.png`: từ phiếu con đầu, đổi con ở Lớp, quay lại Nhận xét là danh sách gốc của con mới. Ca khác lớp chưa chạy do fixture; handler không phụ thuộc classID nên khép được nguyên nhân tĩnh cũ, không yêu cầu thêm kiến trúc/test giả để truy cập @State. |
| V3 — Tạo lớp chỉ hiện lỗi | **ĐẠT** | `TeacherClassDetailView.swift:153–157` giữ lỗi saveController và lỗi đồng bộ, bỏ savedLocal/pending/offline. Lỗi nhập/lưu riêng vẫn ở `:28–29`, `:137–149`; không xoá theo dõi nội bộ hay thao tác lưu. Hai ảnh `P5/*-gv-tao-lop.png` không còn dòng thành công thường trực; đối chiếu `P3/SE3-gv-tao-lop.png` thấy dòng cũ đã mất. Phù hợp spec `docs/spec.md:188/:217/:249`, architecture `:98/:105`; ngoại lệ gửi nhận xét offline không áp dụng màn này. |
| V4 — harness Cài đặt GV + flow 09 | **ĐẠT cấu hình màn gốc; CHƯA chạy flow mới** | `DemoScreens.swift:228–230` dùng isRootTab:true, cùng cấu hình màn gốc app tại `AuthFlowView.swift:102`; flow `09-settings-teacher.yaml:12` thêm assertNotVisible Quay lại. Đây là assertion hữu ích cho nút custom cũ, không chứng minh mọi loại native back hoặc tương tác push. `p5-report.md:9` nói chưa chạy lại flow 09; không ghi PASS. |
| V4 — bỏ case ảnh menu | **ĐẠT cách thay thế coverage thủ công, có giới hạn** | `TeacherDemoScreens.swift:100–108` bỏ case vốn chỉ vẽ menu đóng, giải thích hệ thống Menu cần tương tác. `TeacherScreenshotTests.swift:19` vẫn lặp allCases: số ảnh fixture giảm một, số hàm test không giảm; không được coi 160 tests là coverage menu. Đã mở lại P3 `iPhone16-gv-menu-lop.png`, `SE3-gv-menu-lop.png`, `iPhone16-gv-menu-buoi.png`: Menu thật mở. Mã menu không đổi trong sáu commit, nên dùng ảnh P3 là chấp nhận được. Menu buổi SE vẫn chưa có ảnh; menu lớp đủ hai máy đáp ứng ô menu tối thiểu. |
| Đổi mật khẩu GV push trong Cài đặt | **ĐẠT cấu trúc và ảnh tĩnh** | `AuthFlowView.swift:76` dùng chung mainRoot cho main/settings/changePassword, `:103–112` đăng ký destination + binding pop; `TeacherRootView.swift:19–24/:43` giữ tab Cài đặt và stack riêng. `AuthChangePasswordView` nhận isPushed:true nên bỏ back tự dựng (`AuthSettingsView.swift:333`) và dùng title inline (`:220–227`). Hai ảnh `P5/*-gv-doi-mat-khau.png` có back hệ thống và tab Cài đặt được chọn. Chưa có bằng chứng video/flow back, đổi tab, lưu rồi pop trên HEAD. |
| MonthlyReport error banner | **ĐẠT mã; CHƯA xác minh hiển thị nhánh lỗi** | `MonthlyReportView.swift:187–188` dùng TeacherErrorBanner(message:error), component cho text co giãn và nền lỗi (`TeacherUI.swift:527–553`). Các nhánh gán lỗi vẫn giữ: lưu nhận xét `:355–357`, phát hành `:396/:653`, PDF `:668`. Không che/xoá lỗi bằng điều kiện thành công. Chưa có ảnh nhánh lỗi: gộp vào C1, không đếm thành lỗi thứ hai. |
| T1 — token/sectionGap | **ĐẠT phạm vi literal được nêu** | `GuardianComponents.swift:264–267` dùng token cho 12/20/8/16; `AuthSettingsView.swift:28/:365` dùng token; Tạo lớp `TeacherClassDetailView.swift:34/:116/:125` dùng token. `TeacherMetrics.sectionGap = 24` (`TeacherUI.swift:18`) là tên khoảng cách có nghĩa, dùng ở form mật khẩu chưa push, giữ đúng 24 cũ; chấp nhận dù hiện chỉ một chỗ dùng. Không cần tạo lớp token mới chỉ vì tên Teacher được dùng chung. Các literal cũ khác trong app không được tuyên bố đã quét sạch. |
| T2 — nhãn tab chi tiết lớp SE | **ĐẠT dữ liệu/cỡ chữ đã chụp** | `TeacherUI.swift:329–332` cuộn ngang + scrollTo khi selection đổi; `:341/:353` ID ổn định + intrinsic width; màu, nền chọn và trait ở `:347/:358/:362` giữ nguyên. `P5/SE3-gv-{lop-chi-tiet,bai-kiem-tra,diem-dau,bao-cao-dau}.png` cho đủ nhãn Bài kiểm tra và trạng thái chọn tương ứng. fillsWidth:true của ba tab buổi học vẫn đi nhánh cũ (`:326`). Không thấy mất chọn/cắt nhãn do thay đổi này. |

## Hồi quy và điểm chưa khép

**Chặn — C1: ảnh trạng thái lỗi Báo cáo vẫn thiếu.** Đây là hạng mục trực tiếp từ ảnh người dùng, đã nằm trong kết luận chưa đạt trước và được sửa ở commit `1dc9bfb`; cần một bộ ảnh app thật trạng thái lỗi tương ứng trên iPhone 16/SE 3 trước khi khép toàn mục. Có thể tái hiện bằng lỗi lưu/đồng bộ trong môi trường thử có kiểm soát; không yêu cầu tạo lỗi trên dữ liệu người dùng. Reviewer không thực hiện theo giới hạn nhiệm vụ. Không bắt chụp lại toàn ma trận hoặc đổi kiến trúc để đóng điểm này.

**Cao: không có lỗi được xác nhận.** Không có bằng chứng mất dữ liệu, rò quyền, hỏng đăng xuất hoặc crash từ diff/ảnh đã xem.

**Vừa — giới hạn kiểm thử/độ tương đồng harness, không coi là hồi quy app đã tái hiện:**

1. Harness vẫn không kiểm luồng GV đổi mật khẩu như app thật. `DemoScreens.swift:232` mở AuthChangePasswordView mặc định isPushed:false, `:233` tạo TeacherRootView khác khi về main; app thật dùng một shell + destination. Flow 09 chỉ đứng ở root, vì vậy cấu hình root nay đúng nhưng không thể lấy nó chứng minh back/tab/logout của flow mới. Điểm lệch này chưa được P5 xoá hết. Nên smoke chính app: mở mật khẩu → back; mở lại → đổi tab → quay Cài đặt; sau back kiểm đăng xuất/bị chặn khi có lệnh chờ. Không yêu cầu reviewer chạy.
2. Chưa có ảnh báo cáo PH đã phát hành/PDF và form mật khẩu có bàn phím. Chấp nhận như giới hạn nêu tại C1; cần bổ sung khi có fixture. Hai ảnh mật khẩu đóng bàn phím không chứng minh nút Lưu với bàn phím trên SE.
3. Checklist hàng chung của design system ở `ios/docs/ui-verification-gate.md:37` vẫn **CHƯA theo nghĩa cấu trúc**: `ScoreGridTabView.swift:88/:124` vẫn là hai nhóm cột riêng dùng chung Grid. V1 về metadata/tên đã đạt và không cần viết lại toàn bảng để chữa lỗi ấy; không được suy từ V1 đạt sang tuyên bố toàn bộ checklist cấu trúc đã đạt. Đây là tồn tại từ trước, không phải hồi quy của sáu commit.

**Thấp — giới hạn/bằng chứng phụ:**

- Bảng điểm chưa có ≥4 bài, max 1000 hoặc tên HS dài thực sự trong ảnh. Header vẫn ghép một chuỗi và cho wrap hai dòng, chưa tách cứng ngày/thang điểm; P5 chỉ chứng minh cột đầu thang 15. Ảnh cuộn ngang chụp ở phần cuối danh sách nên không xác nhận header cột cuối sau cuộn. Chưa xác nhận lại toàn chú thích cuối bảng SE: hai ảnh SE cuối còn scrollbar cho thấy có thể cuộn tiếp. Không suy đó là dòng cuối bị che cố định.
- Không có ảnh menu buổi SE; menu lớp hai máy và menu buổi iPhone 16 P3 đã xem. Chấp nhận dùng lại vì không đổi mã menu, không gán ảnh cũ cho HEAD mới.
- `P5/SE3-gv-lop.png` là trạng thái đang tải, không phải danh sách lớp đã tải. Không dùng ảnh này để tuyên bố dữ liệu Lớp đã được kiểm; bộ ảnh trước đã có màn tương ứng theo review-sol.md. Đây là ghi nhận chính xác chứng cứ, không kết luận app kẹt tải.

## Kiểm các rủi ro được yêu cầu

- **Tab cuộn ngang mất chọn/cắt:** chưa thấy hồi quy. Selection do view cha giữ (`TeacherClassDetailView.swift:171/:231`), ScrollViewReader không sở hữu trạng thái chọn. Ảnh có trạng thái chọn đúng ở Buổi học/Bài kiểm tra/Điểm/Báo cáo. Chưa kiểm giảm quyền làm items đổi hoặc Dynamic Type lớn; không đưa hai ca ấy vào PASS.
- **Ẩn trạng thái lưu làm mất lỗi:** không thấy. Chỉ lọc trạng thái không lỗi ở Tạo lớp, giữ cả lỗi thao tác và lỗi source. `SaveStatusKind.resolve` ưu tiên rejected thành .error (`Core/DesignSystem/SaveStatus.swift:16–20`); AppSaveController giữ failure (`SaveController.swift:48–51`). Không đổi controller/source/outbox.
- **Push đổi mật khẩu làm hỏng back/đăng xuất:** binding pop chỉ đổi screen nếu hiện còn changePassword (`AuthFlowView.swift:112`), nên không tự đẩy screen login trở lại settings sau logout. Đổi tab đặt tab rồi show main (`TeacherRootView.swift:21–23`); back/success về settings (`AuthService.swift:313–315`). Đăng xuất vẫn qua model/logout, giữ chặn lệnh chờ (`AuthSettingsView.swift:162`, `AuthService.swift:344–369`). Đây là lập luận tĩnh, chưa phải PASS tương tác. Sau khi cho tab bar xuất hiện ở form, nên kiểm thêm chuyển tab khi đang lưu; chưa có căn cứ báo lỗi đã xảy ra.
- **Quyền/offline/restore/PDF:** sáu commit không thay AuthService, tầng dữ liệu, core hoặc test Swift. Restore task tại `AuthFlowView.swift:39`, scheduler tại `:63`, lọc tab theo quyền tại `TeacherClassDetailView.swift:184`, sheet PDF/cleanup tại `MonthlyReportView.swift:77` giữ nguyên. Không thêm log hoặc chuỗi mới vào catalog trong diff candidate.
- **Test yếu đi:** không xoá assertion Swift. Case fixture menu bị bỏ có chủ ý, đã đối chiếu ảnh thật thay thế; không gọi đó là coverage tự động tương đương. Flow 09 mạnh hơn ở root nhưng chưa chạy lại.

## Danh mục ảnh đã mở trong lượt này

Mỗi mẫu `{iPhone16,SE3}` bên dưới là **cả hai file đã mở**.

| Nhóm | Ảnh P5 đã xem | Số |
|---|---|---:|
| GV | `SE3-gv-lop.png`; `{iPhone16,SE3}-gv-lop-chi-tiet.png`; `*-gv-bai-kiem-tra.png` | 5 |
| GV bảng điểm | `{iPhone16,SE3}-gv-diem-{dau,cuoi,cuoi-ngang}.png` | 6 |
| GV báo cáo | `{iPhone16,SE3}-gv-bao-cao-{dau,cuoi}.png` | 4 |
| GV form | `{iPhone16,SE3}-gv-{tao-lop,doi-mat-khau}.png` | 4 |
| PH ma trận | `{iPhone16,SE3}-ph-{lop,nhan-xet,cai-dat,diem,bao-cao,phieu,doi-mat-khau}.png` | 14 |
| PH đổi con | `{iPhone16,SE3}-ph-{chon-con,doi-con-lop,doi-con-nhan-xet}.png` | 6 |
| Tổng P5 | Đủ 39 file; không có ảnh lỗi báo cáo/bàn phím/báo cáo PH có dữ liệu | **39** |

Ảnh đối chiếu đã mở thêm: `shots/after-p2/SE3-lop-diem-{top,cuoi-doc}.png`; `shots/after-p3/SE3-gv-tao-lop.png`; `shots/after-p3/{iPhone16,SE3}-gv-menu-lop.png`; `shots/after-p3/iPhone16-gv-menu-buoi.png`; `user-refs/02.png` (7 file). Không nhận đã mở lại toàn bộ ảnh P1–P4 của review trước.

## Xác minh và kết luận cổng

`git diff --check 2f2a5cb..fa61c9e -- ios/` đạt (exit 0). Đã xác nhận HEAD, đủ sáu commit, danh sách 12 file và trạng thái worktree chỉ có bốn file M của người dùng trước khi ghi báo cáo. `p5-report.md:3` báo 160 tests, 1 skipped, 0 failures; đây là báo cáo worker, chưa có result bundle được reviewer kiểm độc lập, và flow 09 chưa được chạy lại (`:9`).

**Tôi không thể xác minh điều này hoạt động bằng một lần chạy app/test mới vì nhiệm vụ reviewer cấm build, xcodegen, simulator và đăng nhập.** Các nhận định runtime ở đây giới hạn ở ảnh đã xem; các đường đi back/logout/lỗi đồng bộ còn lại là phân tích mã, không phải kết quả thực thi mới.

**CHƯA ĐẠT cổng nghiệm thu**: giữ C1 cho ảnh lỗi Báo cáo cần khép; checklist cấu trúc hàng chung cũng chưa được thoả theo nghĩa đen. Không còn lý do giữ V1/V2/V3/T1/T2 là lỗi cũ chưa sửa trên dữ liệu đã chụp. Không yêu cầu đảo HIG/TabView, sửa spec, đụng chuỗi của người dùng hoặc viết lại hệ thống để đóng các tồn tại này.

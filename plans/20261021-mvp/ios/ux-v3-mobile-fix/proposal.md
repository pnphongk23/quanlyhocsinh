# ux-v3 mobile fix — proposal (Pha 1, chưa sửa mã)

Căn cứ: ảnh người dùng 01–05, đọc mã worktree mvp-ios (HEAD 5991ede), ux-v2 verify-e/plan/review. **Chưa chụp simulator** (Pha 1 chỉ đọc mã); các kết luận "gốc" dưới đây là từ mã, worker luna phải xác nhận bằng ảnh trước khi sửa.

## 1. Gốc chung (3 gốc, không phải 5 lỗi rời)

**G1. Hai lớp NavigationStack lồng nhau, thanh nav ẩn kiểu "nửa vời".**
`AuthFlowView.swift:102` bọc `TeacherRootView` trong `NavigationStack` + toolbar nút `person.crop.circle`; `TeacherRootView.swift:33,38,43` lại có NavigationStack riêng cho từng tab. Mọi màn con gọi `.toolbar(.hidden, for: .navigationBar)` (TeacherRootView:177,393; TeacherClassDetailView:39,230; TestsTabView:178…) chỉ ẩn thanh của stack trong, còn thanh của stack ngoài vẫn chiếm chỗ và vẽ nút avatar nổi. Hệ quả: khoảng trống lớn trên Cài đặt, nút avatar thừa (05), khoảng hở trên các tab chi tiết lớp (01/03).
Tiêu đề, nút back, "…" đều tự dựng (`TeacherClassDetailView.header` :241, `TeacherNewClassView.header` :43, `AuthSettingsView.backRow`) thay vì `navigationTitle` + toolbar, nên không theo HIG (tiêu đề to `titleCompact`, nút 48pt).

**G2. Các tab con của chi tiết lớp không có khung màn chuẩn.**
`TeacherClassDetailView.tabBody` :263 nhúng thẳng `TestsTabView`, `ScoreGridTabView`, `MonthlyReportView` vào `VStack` gốc. Ba view này **không có ScrollView, không padding ngang, không padding đáy** (TestsTabView:20, ScoreGridTabView:31, MonthlyReportView:63); trong khi Buổi học/Học sinh dùng `TeacherScroll` + `screenPaddingHorizontal`. Đó là lý do "+ Bài mới" dính mép (03), bảng điểm tràn/cắt (04), nội dung Báo cáo dài hơn màn nên bị đẩy lên dưới status bar (01). Các view này chỉ được kiểm trong harness `DemoScreens.swift:144-170` vốn tự bọc `TeacherScroll` + padding — **harness không giống cây view thật**.
Cài đặt: `TeacherRootView` bọc trong tab `.settings` rồi `AuthSettingsView` truyền `onClose` ⇒ `backRow` luôn hiện (tab gốc không được có back); `AuthPage` thêm `topPadding` 16 + GeometryReader/`minHeight` riêng.

**G3. Bảng điểm là 1 cột tên + N cột điểm xếp độc lập.**
`ScoreGridTabView.swift:53-141`: mỗi cột là một `VStack` riêng, chiều cao hàng đặt tay (header 60 + `.padding(8)` ở cột test nhưng chỉ `.padding(8)` bên trong cột tên; ô điểm 56 nhưng nội dung căn giữa còn ô tên căn trên) ⇒ lệch dòng, số lệch tên. Không có ScrollView dọc, không lề trong thẻ → cột cuối bị cắt.

## 2. Bảng lỗi → gốc → biện pháp

| # | Lỗi (ảnh) | Gốc | Biện pháp (sửa nền) |
|---|---|---|---|
| 1 | Báo cáo tràn dưới status bar (01); hở ở tab khác | G1+G2 | Một `TeacherTabScreen` (ScrollView + padding token + `safeAreaInset` đáy) bọc mọi tab con; bỏ `safeAreaPadding(.top)`/ignoresSafeArea chồng; chỉ một NavigationStack |
| 2 | Bài kiểm tra không padding, "+ Bài mới" dính mép (03); ô "Lỗi lưu" (02) | G2 | Cùng khung; nút thêm chuyển sang `toolbar` (+) hoặc dòng có padding token; thông báo lỗi dùng `TeacherErrorBanner` có padding |
| 3 | Bảng điểm lệch/cắt (04) | G3 | Component `ScoreTable` dùng `Grid` (hàng chung) hoặc `LazyVStack` hàng + `ScrollView([.horizontal,.vertical])`, cột tên ghim (`pinnedViews`/overlay), hàng cao cố định chung, số căn `monospacedDigit` |
| 4 | Cài đặt: khoảng trống, back thừa, avatar nổi (05) | G1+G2 | Bỏ NavigationStack ngoài + toolbar avatar; avatar chỉ ở header danh sách Lớp (đã có); bỏ `onClose`/`backRow` khi là tab gốc; `AuthPage` không cộng top padding khi nhúng |
| 5 | Nav to, không theo HIG | G1 | `navigationTitle` + `.navigationBarTitleDisplayMode(.inline)` cho màn con, large title cho 3 tab gốc; back mặc định hệ thống; tab bar: cân nhắc `TabView` hệ thống (xem Rủi ro) |

## 3. Vì sao ux-v2 không bắt được

- Xác minh E1 chỉ chụp tab **Điểm** qua harness dữ liệu giả; không chụp Bài kiểm tra/Báo cáo/Học sinh, không chụp cây view thật có NavigationStack ngoài.
- Không có checklist safe area/HIG; `plan.md`, `audit.md`, `review.md` ux-v2 không ghi lần nào gọi skill `app-design` hay đối chiếu HIG ⇒ skill bắt buộc trên giấy nhưng không có bằng chứng thực thi.
- Review đối chiếu spec/prototype web (token CSS) nên "đúng px prototype" bị coi là đạt, dù iOS native phải theo HIG.
- Chỉ iPhone 16 + SE ở vài màn; không ma trận màn × máy.

## 4. Cổng kiểm mới (đề xuất)

1. Ma trận ảnh bắt buộc: {Lớp, Lịch, Cài đặt, 5 tab chi tiết lớp, buổi học, tạo lớp, PH 5 tab} × {iPhone 16, SE 3} từ **app thật** (đăng nhập demo/staging giả), không qua harness.
2. Checklist HIG: một NavigationStack/tab; không back ở tab gốc; không `ignoresSafeArea` ngoài nền; mọi ScrollView có padding token; bảng căn hàng.
3. UI test chụp ảnh (XCUITest) theo ma trận, so sánh tay lần đầu, sau đó snapshot.
4. Reviewer sol bắt buộc xem ảnh ma trận, không chỉ diff.

## 5. Thứ tự gói (Pha 2, luna/deepseek, review cuối sol)

- **P1 Khung màn + nav (G1, G2):** bỏ stack ngoài, `TeacherTabScreen`, nav chuẩn HIG, sửa Cài đặt. File: AuthFlowView, TeacherRootView, TeacherClassDetailView, TestsTabView, MonthlyReportView, AuthSettingsView/AuthPage, TeacherUI.
- **P2 ScoreTable (G3):** ScoreGridTabView + test.
- **P3 Quét phần còn lại:** Lịch, Lớp, buổi học, phụ huynh (GuardianRootView:204 cũng NavigationStack), tạo lớp.
- **P4 Cổng kiểm:** script chụp ma trận + checklist vào docs.

P1 trước vì P2/P3 phụ thuộc khung chung.

## 6. Rủi ro

- Đổi tab bar tự dựng sang `TabView` hệ thống đổi nhiều hơn mức lỗi báo; đề xuất giữ tab bar tự dựng nhưng đặt trong `safeAreaInset(.bottom)` đúng cách, **cần người dùng chọn** (spec có chỉ định tab bar giống prototype).
- Spec mô tả header giống prototype web; đổi sang navigationTitle là lệch prototype ⇒ theo AGENTS.md "lệch spec thì hỏi". Cần người dùng xác nhận ưu tiên HIG.
- 4 file M của người dùng (Info.plist, xcstrings, entitlements) không đụng; thêm chuỗi mới vào `Localizable.xcstrings` sẽ xung đột ⇒ dùng bảng chuỗi riêng hoặc báo trước.
- Không xcodegen trong worktree; build/chụp trên bản sao /tmp.

## 7. Cách kiểm

Build + test trên bản sao /tmp; ma trận ảnh ở mục 4 trước/sau; reviewer sol đối chiếu từng dòng bảng mục 2 với ảnh.

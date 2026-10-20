# Review độc lập prototype giáo viên

Ngày kiểm tra: 2026-10-17. Phạm vi: reviewer-brief.md và plan.md; chỉ ghi báo cáo này, không sửa mã nguồn.

Đã đọc hết AGENTS.md, docs/spec.md, docs/architecture.md, plan.md và bốn báo cáo foundation/worker-a/worker-b/worker-c. Kết quả dưới đây được kiểm chứng lại bằng lệnh, trình duyệt và đọc mã, không lấy kết luận của các worker làm bằng chứng nghiệm thu.

## Phát hiện, theo mức nghiêm trọng

Không tìm thấy Blocker trong phạm vi prototype cục bộ. Có **7 Major và 4 Minor** cần xử lý.

### R01 — Major: Bấm lưu ở lớp mới ghi điểm đang ẩn của lớp trước

- **Vị trí:** `src/features/scores/ScoresPage.tsx:29`, `src/features/scores/ScoresPage.tsx:48`; chuyển lớp tại `src/app/TeacherShell.tsx:67`.
- **Tái hiện:** tại `/lop/6a/diem`, sửa điểm một học sinh nhưng chưa lưu; đổi bộ chọn “Lớp hiện tại” sang IELTS; bấm “Lưu điểm” trên `/lop/ielts/diem`.
- **Bằng chứng:** đã tái hiện ở 390px: URL và bảng đang hiển thị IELTS, nhưng điểm 6A đổi từ 8.5 thành 9.7. `drafts` còn nguyên khi `classId` đổi và vòng lưu gửi tất cả khóa, kể cả khóa không còn hiển thị. Repository kiểm cùng lớp giữa bài và học sinh nên vẫn chấp nhận cặp khóa cũ hợp lệ.
- **Đề xuất:** ràng buộc bản nháp theo lớp; xử lý lưu/bỏ/giữ bản nháp trước khi chuyển lớp. Khi lưu, chỉ chấp nhận các khóa thuộc lớp đang hiển thị và thông báo rõ lớp được lưu.

### R02 — Major: Thêm học sinh mới làm lỗi lưu điểm danh buổi cũ

- **Vị trí:** `src/features/attendance/AttendancePage.tsx:23`, `src/features/attendance/AttendancePage.tsx:49`; kiểm thời gian theo học tại `src/data/repositories/attendance.ts:10`.
- **Tái hiện:** thêm học sinh hôm nay (17/10) ở lớp 6A, mở Điểm danh; màn hình mặc định chọn buổi đã diễn ra gần nhất (14/10); bấm “Lưu điểm danh”.
- **Bằng chứng:** học sinh mới xuất hiện trong danh sách của buổi trước ngày nhập học, mặc định Có mặt; lưu báo “Học sinh không thuộc buổi học này.” Danh sách chỉ lọc `status === active`, không lọc `enrolledAt/leftAt` theo ngày buổi học. Vòng lặp commit từng dòng còn có thể lưu một phần các dòng trước khi gặp lỗi.
- **Đề xuất:** dựng danh sách theo ngày của buổi, bao gồm học sinh đã nghỉ nhưng còn theo học tại ngày đó; loại học sinh chưa nhập học. Kiểm hợp lệ toàn bộ lô trước khi ghi hoặc lưu cả lô nguyên tử để tránh lưu một phần.

### R03 — Major: Chuyển học sinh làm mất nhận xét đang soạn, không cảnh báo

- **Vị trí:** `src/features/comments/CommentsPage.tsx:33`, `src/features/comments/CommentsPage.tsx:53`, `src/features/comments/CommentsPage.tsx:115`.
- **Tái hiện:** nhập thêm nội dung vào nhận xét của em A, chưa bấm Lưu nháp; chọn em B rồi trở lại em A. Chuyển buổi học cũng thay `key` và chạy cùng effect.
- **Bằng chứng:** nội dung đánh dấu thử có trong textarea trước khi chuyển và biến mất sau khi quay lại; không có xác nhận bỏ thay đổi. Nhãn vẫn có thể hiện “Chưa lưu” dù nội dung vừa bị thay bằng bản cũ. Nội dung mới chỉ nằm trong state React, bị effect ghi đè.
- **Đề xuất:** giữ bản nháp theo lớp/buổi/học sinh qua repository, hoặc chặn chuyển và yêu cầu lưu/bỏ rõ ràng; đồng thời cập nhật trạng thái lưu theo đúng bản nháp đang xem. Cần bảo vệ cả khi rời route.

### R04 — Major: Sửa lớp chấp nhận tên rỗng và không có ngày học

- **Vị trí:** `src/features/classes/ClassListPage.tsx:38`, `src/data/repositories/classes.ts:42`.
- **Tái hiện:** mở “Sửa lớp”, nhập tên chỉ gồm dấu cách, bỏ chọn mọi ngày học, bấm “Lưu thay đổi”.
- **Bằng chứng:** hộp thoại đóng; repository lưu `name: ""`, `weekdays: []` và không báo lỗi. Tên trong bộ chọn lớp trở thành trống. Thuộc tính HTML `required` không từ chối chuỗi toàn khoảng trắng; `updateClass` chỉ `Object.assign`, trong khi `createClass` có kiểm tra tên và lịch.
- **Đề xuất:** dùng chung validation cho tạo và sửa trong repository: tên sau trim phải có nội dung, ít nhất một ngày hợp lệ, giờ hợp lệ; khi thất bại giữ hộp thoại và dữ liệu nhập.

### R05 — Major: “Sẽ gửi khi có mạng” nhưng không lưu ý định gửi nhận xét

- **Vị trí:** `src/features/comments/CommentsPage.tsx:83`, `src/data/repositories/comments.ts:32`.
- **Tái hiện:** bật “Mô phỏng mất mạng”, soạn và bấm “Lưu và gửi”; tắt mô phỏng rồi phát sự kiện online hoặc mở lại màn.
- **Bằng chứng:** UI hiện “Đã lưu trên máy · sẽ gửi khi có mạng”, nhưng bản ghi vẫn là `draft` sau khi tắt mô phỏng và phát online. Nhánh offline chỉ return; không có lệnh gửi hay bộ xử lý gửi lại. Đã kiểm cả mã và trạng thái repository trong trình duyệt. Việc outbox mô phỏng xóa pending sau đó cũng không chuyển nhận xét sang sent.
- **Đề xuất:** trong phạm vi prototype, đổi thông báo thành “Đã lưu nháp trên máy; hãy bấm gửi khi có mạng” và không hứa tự gửi; hoặc lưu ý định gửi và thực thi sau khi online. Không cần thêm SMS hay backend để sửa thông báo sai.

### R06 — Major: Báo cáo coi ô điểm trống là đã đủ dữ liệu

- **Vị trí:** `src/features/reports/reportModel.ts:48`; nút phát hành tại `src/features/reports/ReportsPage.tsx:166`.
- **Tái hiện:** dùng seed, gửi một nhận xét tháng 10 cho Hoàng Thu Hà; mở báo cáo tháng 10 và chọn em này. Điểm bài Nói đang có bản ghi `value: null, absent: false`.
- **Bằng chứng:** phần điểm hiện “Chưa có điểm”, không có cảnh báo còn thiếu, nút “Phát hành” vẫn bật. Kiểm riêng model cũng trả `ready: true`, `missing: []` khi còn điểm null không phải vắng thi. Code chỉ kiểm có object `score`, không kiểm giá trị.
- **Đề xuất:** đánh dấu thiếu nếu không có bản ghi hoặc `value === null && !absent`. Vắng thi vẫn được tính là đã nhập trạng thái và không đưa vào trung bình. Thêm ca kiểm cho bản ghi tồn tại nhưng điểm trống.

### R07 — Major: Báo cáo đòi điểm bài kiểm tra ngoài thời gian theo học

- **Vị trí:** `src/features/reports/reportModel.ts:38`; đối chiếu `src/data/repositories/scores.ts:10`.
- **Tái hiện:** học sinh vào ngày 17/10; lớp có bài 05/10 và 18/10. Điền đủ điểm danh, điểm bài 18/10 và nhận xét đã gửi trong tháng; dựng báo cáo tháng 10.
- **Bằng chứng:** đã tạo fixture qua repositories trong trình duyệt: điểm danh đầy đủ nhưng `ready: false`, thiếu điểm bài trước nhập học. Thử ghi điểm bài cũ bị repository từ chối, nên giáo viên không thể làm báo cáo đủ dữ liệu. Model đã lọc ngày vào/rời cho buổi học nhưng chưa áp dụng cho bài kiểm tra.
- **Đề xuất:** lọc bài kiểm tra theo ngày vào và ngày rời lớp, đồng nhất với điều kiện `eligible` của repository. Kiểm cả nhập học giữa tháng và nghỉ giữa tháng; không xóa lịch sử.

### R08 — Minor: Form phần A báo “Đã đồng bộ” khi dữ liệu mới chưa lưu

- **Vị trí:** `src/features/classes/NewClassPage.tsx:24`, `src/features/classes/NewClassPage.tsx:28`; tương tự form sửa lớp `src/features/classes/ClassListPage.tsx:38` và thêm học sinh `src/features/students/StudentsPage.tsx:42`.
- **Tái hiện:** khi hàng chờ bằng 0, mở `/lop/moi`, nhập tên và chọn ngày nhưng chưa submit.
- **Bằng chứng:** tên mới có trong input nhưng cả SaveStatus toàn cục và trong form vẫn là “Đã đồng bộ”. Form không gọi `markUnsaved`; các hộp thoại phần A cũng không có trạng thái riêng cho nội dung đang nhập. Điều này không đạt yêu cầu luôn phản ánh đúng trạng thái lưu.
- **Đề xuất:** dùng `useSaveStatus` cho form; đánh dấu chưa lưu khi sửa, chỉ clear sau commit, hiển thị lỗi khi ghi thất bại. Đặt trạng thái ngay trong hộp thoại để người dùng thấy khi nền bị khóa.

### R09 — Minor: Một số vùng chạm chưa đạt 44 × 44px

- **Vị trí:** `src/features/classes/classesForm.module.css:1`, `src/features/attendance/AttendancePage.module.css:1`.
- **Bằng chứng đo DOM:** tại viewport 390×844, bảy nút ngày `/lop/moi` khoảng **39.6×44px**; ô giờ muộn và ghi chú Điểm danh cao **38px**. Tại 1280×900, select “Chọn buổi học” cao **40px**. Đây là kích thước thực, không chỉ suy ra từ CSS. Các checkbox nhỏ ở Điểm số/Nhận xét có label bao quanh từ 44px trở lên nên không tính là lỗi.
- **Đề xuất:** cho nút ngày xuống dòng hoặc giảm khoảng đệm ngoài để mỗi nút đủ 44px; nâng các input/select kể trên lên tối thiểu 44px. Kiểm cả chiều rộng và chiều cao.

### R10 — Minor: UI vẫn import và gọi store ngoài repositories

- **Vị trí:** ví dụ `src/features/classes/ClassListPage.tsx:5`, `src/features/classes/ClassListPage.tsx:13`, `src/features/comments/CommentsPage.tsx:6`, `src/app/TeacherShell.tsx:10`; `useStore` định nghĩa tại `src/data/store.ts:51`.
- **Bằng chứng:** tìm bằng srcwalk và đọc các file xác nhận 9 page trong features import/gọi `useStore` trực tiếp; shell/router cũng dùng hook này. Đây là subscription, không phải ghi localStorage trực tiếp, nhưng vẫn lệch tiêu chí trong reviewer brief “UI không gọi store/localStorage trực tiếp ngoài repositories”. Báo cáo foundation còn hướng dẫn cách dùng này, nên cần thống nhất hợp đồng.
- **Đề xuất:** đưa hook subscription/snapshot dùng cho UI qua giao diện repositories; giữ store là chi tiết nội bộ. Không phát hiện feature tự gọi localStorage, fetch hay ghi store trực tiếp.

### R11 — Minor: Bố cục và điều hướng lệch đáng kể so với thiết kế tham chiếu

- **Vị trí:** `src/app/TeacherShell.tsx:36`, `src/app/TeacherShell.tsx:89`, `src/app/shell.module.css:5`, `src/features/attendance/AttendancePage.tsx:76`, `src/features/students/students.module.css:1`.
- **Bằng chứng:** screenshot 390px cho thấy header chung chiếm khoảng 180px trước tiêu đề màn; Điểm danh còn cộng padding của shell và page, còn khoảng 303px ngang cho thẻ danh sách. Nút Lưu ở đầu danh sách nên phải cuộn lên sau khi thao tác các em cuối; `design/export/Main.dc.html:45` đặt nút này sát thanh tab phía dưới. Học sinh/Báo cáo bị đưa vào nhóm link sau toàn bộ nội dung thay vì tab/sidebar như `design/export/Main.dc.html:53` và `design/export/WebStudents.dc.html:33`. Ở 1280px, Học sinh vẫn là các thẻ dọc lớn (trang khoảng 1356px với seed 10 em), thay cho bảng gọn trong `design/export/WebStudents.dc.html:49`.
- **Đề xuất:** rút gọn header mobile, bỏ padding lồng, đặt thao tác lưu trong vùng dễ chạm sau khi nhập, đưa Học sinh/Báo cáo vào điều hướng thường trực; cân nhắc bảng học sinh trên desktop. Chỉ khôi phục bố cục, không thêm các chức năng mời phụ huynh trong mẫu.
- **Màu/chữ:** nền #F6F7F9, màu chữ, bảng màu trạng thái, bo góc và sidebar 248px tương đối sát mẫu. Font hệ thống thay Plus Jakarta Sans phù hợp architecture.md, không coi là lỗi. Không yêu cầu khôi phục hệ số, TB lớp, thang tùy chỉnh, giao diện phụ huynh hay báo cáo 3 tháng có trong design.

## Kiểm chứng đã thực hiện

### Lệnh

| Lệnh | Kết quả thực tế |
| --- | --- |
| `npm run typecheck` | Exit 0 |
| `npm run build -- --outDir /tmp/quanlyhocsinh-review-dist` | Exit 0; 93 modules; main JS 106.27 kB gzip; output tạm ngoài repo |
| `npm run test` | Exit 0; 3 test files, 16/16 tests passed |
| `npm run dev -- --host 127.0.0.1` | Vite chạy tại 5174 vì 5173 đã có tiến trình khác |

Không cài thêm dependency hay viết test/mã nguồn. Build dùng thư mục tạm để không ghi bundle vào cây dự án.

### Trình duyệt

Dùng Paseo browser, viewport **390×844** và **1280×900**. Mỗi route đều được điều hướng trực tiếp, đợi nội dung màn tải xong, đọc DOM, đo scrollWidth và kích thước điều khiển. Xem thêm screenshot đại diện mobile Điểm danh/Lớp và desktop Học sinh. Không lưu ảnh thành file trong repo.

| Route | 390px | 1280px |
| --- | --- | --- |
| `/dang-nhap` | Mở được; không tràn ngang | Mở được; không tràn ngang |
| `/lop` | Mở được; tab dưới | Mở được; sidebar 248px |
| `/lop/moi` | Mở được; lỗi vùng chạm R09 | Mở được |
| `/lop/6a/hoc-sinh` | Mở được | Mở được |
| `/cai-dat` | Mở được | Mở được |
| `/lop/6a/diem-danh` | Mở được; lỗi vùng chạm R09 | Mở được; lỗi vùng chạm R09 |
| `/lop/6a/diem` | Mở được; nhập theo bài | Mở được; bảng nhiều bài |
| `/lop/6a/diem/bai-moi` | Mở được | Mở được |
| `/lop/6a/nhan-xet` | Mở được | Mở được; hai cột |
| `/lop/6a/bao-cao` | Mở được | Mở được; hai cột |

Không route nào tràn ngang ở lượt duyệt seed: document scrollWidth không vượt viewport. Layout đăng nhập độc lập; 9 route còn lại đúng dạng tab dưới/sidebar theo breakpoint. Một số desktop có thanh cuộn dọc nên clientWidth nhỏ hơn innerWidth 15px, không phải tràn ngang.

Đã mở và đo hộp thoại **sửa lớp, thêm học sinh, đánh dấu nghỉ, xác nhận đặt lại dữ liệu** ở cả hai kích thước: không tràn ngang; bề rộng khoảng 337px trên mobile và 520px trên desktop, các trường/nút chính đạt 44px. Đã thử đăng nhập dùng thử, tạo lớp (sinh 4 buổi theo lịch một ngày/tuần trong 28 ngày), sửa lớp, lưu trữ lớp mẫu thử, thêm học sinh và xác nhận nghỉ học.

Console cuối lượt có 117 entries, chỉ log kết nối Vite và lời nhắc React DevTools; không error/warning ứng dụng, không thấy SĐT hoặc nội dung nhận xét trong console. Tra mã `src` không tìm thấy `console`/`fetch`; localStorage nằm ở store và test. Đã kiểm lại lỗi nghiệp vụ bằng thông báo trên UI/repository, không nhầm chúng với lỗi console.

### Bất biến và luồng dữ liệu

| Tiêu chí | Bằng chứng/kết luận |
| --- | --- |
| 4 trạng thái điểm danh | UI và code có Có mặt/Muộn/Có phép/Vắng; thay đổi và lưu qua repository được |
| Muộn tính đi học; Có phép không trừ | Test logic pass; gọi logic trong browser với Có mặt + Muộn + Có phép + Vắng trả 66.67%, bỏ Có phép khỏi mẫu số |
| Vắng 2 buổi liên tiếp | Seed có cảnh báo Nguyễn Minh Anh; kiểm `studentAbsenceWarning` trả true; test logic bao gồm buổi hủy/planned và học sinh nghỉ |
| Lịch sử sửa | Sửa một điểm danh và một điểm trong browser thêm đúng 2 changeLogs, có entity, trước/sau, actor và thời gian; tests tương ứng pass. Chỉ là lịch sử local, chưa phải trigger D1 |
| Thang 10, TB cộng đơn giản | Nhập 11 bị chặn, báo lỗi và hiện trạng thái lỗi; nhập `8,5` lưu được. Dữ liệu [0,10,vắng thi,trống] cho TB 5; vắng thi/trống không tính |
| Không hệ số/TB lớp/thang tùy chỉnh | Không thấy control hay giá trị vi phạm; tạo bài offline vẫn có max=10 |
| Nghỉ học giữ lịch sử | Xác nhận nghỉ Trần Gia Bảo bằng UI: status=left, enrolledAt=2026-09-01, leftAt=2026-10-17; trước/sau đều giữ 8 attendance và 4 scores |
| Offline và hàng chờ | Mô phỏng navigator.onLine=false: ghi điểm/điểm danh lưu local với pending; snapshot localStorage chứa cùng pending; tạo bài và nhập điểm qua UI được; nháp nhận xét lưu được. R05 là lỗi riêng của ý định gửi |
| Chặn logout | Repository logout từ chối khi có pending; Settings vô hiệu nút và nêu rõ số thay đổi chờ. Sau online, hàng chờ mô phỏng từ 3 về 0 và trạng thái synced |
| Trạng thái lưu | Kiểm được unsaved/local/synced/error ở điểm; form A còn sai như R08 |
| Sửa điểm sau phát hành | Publish trạng thái mẫu rồi sửa điểm: needsRepublish=true và UI hiện “Điểm có cập nhật, cần phát hành lại” |
| Báo cáo | Preview HTML có điểm từng bài, chuyên cần, nhận xét và nút In; đã mở bản preview trên desktop. Hai lỗi đánh giá đủ dữ liệu là R06/R07 |
| Phạm vi | Không thấy SMS/OTP/kích hoạt/mời phụ huynh, màn phụ huynh, học phí, chat, hệ số hay thang tùy chỉnh. Gửi/phát hành chỉ đổi trạng thái như plan cho phép |

## Giới hạn và phần chưa xác minh

- Prototype không có Worker/D1/R2: không thể xác minh phân quyền máy chủ, OTP, trigger lịch sử D1 hay ACK thật. Đây là phần plan đã loại ra, không đánh Blocker vì thiếu backend. Outbox `src/data/outbox.ts:29` xóa các ID sau timer 800ms, không nhận xác nhận máy chủ; trạng thái “Đã đồng bộ” chỉ là mô phỏng, **chưa đạt bất biến production** chỉ xóa sau ACK thật.
- Không xác minh đồng bộ đa thiết bị, xử lý xung đột, retry mạng thật, phân tách dữ liệu theo tài khoản thật hay migration Dexie. localStorage/auth giả chỉ được đánh giá ở mức prototype. Không dùng dữ liệu/mật khẩu thật khi thử.
- Kiểm offline bằng mô phỏng trạng thái navigator và thao tác trên app đang mở, không phải ngắt đường truyền vật lý. Không có service worker; chưa xác minh mở app từ đầu khi mất mạng.
- Tôi không thể xác minh cài PWA, safe area/bàn phím cảm ứng và hành vi Safari trên iPhone thật vì môi trường chỉ có trình duyệt desktop đổi viewport.
- Tôi không thể xác minh PDF/in thực tế vì không chạy hộp thoại in hệ điều hành hay tạo file PDF; chỉ kiểm preview HTML, nút gọi in và CSS print. Bản phát hành chưa có snapshot cố định; nội dung preview dựng từ dữ liệu hiện tại, đúng giới hạn đã nêu trong báo cáo C và chưa đáp ứng cơ chế lưu phiên bản production.
- Không làm visual diff theo pixel cho toàn bộ design. Đã đọc HTML/CSS các mẫu liên quan, đối chiếu cấu trúc/đo DOM và xem screenshot đại diện; chỉ nêu các sai khác bố cục đáng kể ở R11. Login/Settings là mẫu hướng phụ huynh nên không yêu cầu chép lại nghiệp vụ của mẫu vào prototype giáo viên.
- Đã khôi phục dữ liệu mẫu trên origin thử sau các ca làm thay đổi dữ liệu. Những vấn đề đã được foundation ghi trước (sửa lịch lớp chưa tái sinh buổi, localStorage, sync giả, không snapshot) không được coi là đã giải quyết chỉ vì tests đang pass.

Status: DONE_WITH_CONCERNS

## Kiểm lại

Vòng kiểm lại sau sửa, ngày 2026-10-17. Đã đọc phần “Vòng sửa” trong worker-a.md, worker-b.md, worker-c.md và phần R11/R10 trong foundation.md. Các kết quả dưới đây được chạy lại độc lập trên bản mới tại `http://127.0.0.1:5175`, không lấy báo cáo worker làm kết luận. Dùng Paseo browser ở **390×844** và **1280×900**; thao tác form/chuyển route trên UI, đọc repository để đối chiếu dữ liệu. Fixture R07 và kiểm tra batch lỗi của R02 được tạo/gọi qua repositories trong trình duyệt, không sửa source hay thêm test file.

Kết quả này cập nhật kết luận của vòng đầu: **10 kịch bản R01–R09, R11 đã đạt mục tiêu sửa; có 1 Minor mới về nhãn trạng thái Nhận xét (N01). R10 là quyết định giữ nguyên được chấp nhận, không còn tính là lỗi.**

### Kết quả từng mục

| Mục | 390px | 1280px | Bằng chứng kiểm lại |
| --- | --- | --- | --- |
| **R01 — Lưu nhầm điểm lớp trước** | **Đã đạt** | **Đã đạt** | Sửa điểm Nguyễn Minh Anh bài Nói ở 6A thành 9.7, chưa lưu; chuyển bộ chọn sang IELTS, bấm “Lưu điểm lớp”. URL là `/lop/ielts/diem`; toàn bộ điểm của bốn bài 6A so với snapshot trước sửa **không đổi**, pending=0. Có thông báo còn bản nháp 6A. Chuyển về 6A vẫn thấy draft 9.7 và “Chưa lưu”. Đã chạy riêng ở cả hai cỡ, không chỉ kiểm helper của draft. |
| **R02 — Học sinh mới làm lỗi điểm danh buổi cũ** | **Đã đạt** | **Đã đạt** | Thêm học sinh qua form, xác nhận enrolledAt=2026-10-17. Mở buổi mặc định 14/10: không có học sinh mới; bấm “Tất cả có mặt” rồi “Lưu điểm danh” không báo lỗi. Buổi 19/10 có học sinh mới và không có Đỗ Hải Nam đã nghỉ 09/10; quay về 07/10 vẫn có Hải Nam, không có học sinh mới. Kiểm bổ sung batch: đưa dòng sửa hợp lệ trước dòng học sinh chưa nhập học; repository từ chối và snapshot attendance/pending/changeLogs/sessions đều giữ nguyên ở cả hai cỡ. Lô UI có thay đổi tạo 1 pending; lô không đổi không tạo pending thừa. |
| **R03 — Mất nhận xét khi chuyển học sinh/buổi/route** | **Đã đạt về giữ nội dung** | **Đã đạt về giữ nội dung** | Gõ nội dung thử ở em A, không bấm Lưu nháp; chọn B rồi A: nội dung còn nguyên. Đổi từ buổi 14/10 sang 12/10 rồi về: còn nguyên và đã có trong repository. Gõ nội dung thử khác, bấm tab/sidebar Điểm, rồi Nhận xét: nội dung vẫn nguyên. Đã làm đủ ba biến thể ở cả hai cỡ. Phần nhãn “Chưa lưu” sau chuyển ngữ cảnh còn sai, ghi riêng N01 bên dưới; không còn tái hiện mất nội dung. |
| **R04 — Sửa lớp lưu tên/lịch rỗng** | **Đã đạt** | **Đã đạt** | Mở Sửa lớp, nhập toàn dấu cách và bỏ hết ngày, submit. Hộp thoại vẫn mở; hiện “Nhập tên lớp, chọn ít nhất một ngày và kiểm tra giờ học.” và trạng thái “Lỗi lưu — vui lòng thử lại”. Đối chiếu object lớp 6A trước/sau bằng JSON: không đổi, tên/lịch cũ còn nguyên. |
| **R05 — Hứa tự gửi khi online nhưng không gửi** | **Đã đạt** | **Đã đạt** | Bật “Mô phỏng mất mạng”, bấm “Lưu và gửi”. Thông báo thực tế là **“Đã lưu nháp trên máy; hãy bấm gửi khi có mạng.”** Tắt mô phỏng và phát online: bản ghi vẫn draft, phù hợp thông báo mới; không còn hứa tự gửi. Đây là sửa thông báo theo phương án đã nêu ở vòng đầu, không yêu cầu triển khai gửi tự động. |
| **R06 — Coi điểm null là đủ dữ liệu báo cáo** | **Đã đạt** | **Đã đạt** | Từ seed, gửi nhận xét cho Hoàng Thu Hà qua UI, mở báo cáo tháng 10, chọn em này. Bài Nói hiện “Chưa có điểm”; cảnh báo **“Còn thiếu: Thiếu điểm Nói”**, nút Phát hành disabled=true. Đổi đúng bản ghi đó sang vắng thi qua repository: hiển thị “Vắng thi”, hết cảnh báo thiếu, nút Phát hành bật; TB=6,5 từ hai điểm 6 và 7. Đã kiểm cả trường hợp trống và ngoại lệ vắng thi ở hai cỡ. |
| **R07 — Đòi điểm trước ngày nhập học** | **Đã đạt** | **Đã đạt** | Tạo fixture như vòng đầu: nhập học 17/10, bài kiểm tra 05/10 và 18/10, đủ điểm danh/điểm/nhận xét đã gửi cho ngày 18/10. Mở route Báo cáo của lớp fixture, chọn tháng 10 bằng input trên UI. Chỉ liệt kê bài 18/10 điểm 8,0; không đòi điểm 05/10; “Sẵn sàng 1/1”, không có cảnh báo còn thiếu, nút Phát hành bật ở cả hai cỡ. |
| **R08 — Form A báo đồng bộ khi chưa lưu** | **Đã đạt** | **Đã đạt** | Form Tạo lớp: nhập tên/chọn ngày → “Chưa lưu”. Form Sửa lớp: đổi tên/ngày → “Chưa lưu”; submit dữ liệu sai của R04 → “Lỗi lưu”. Modal Thêm học sinh: nhập tên → “Chưa lưu”; submit tạo được học sinh. Kiểm thêm tạo lớp hợp lệ ở cả hai cỡ với tên có khoảng trắng ngoài: lưu được tên đã trim, sinh 4 buổi theo lịch thứ Hai, trạng thái trở về “Đã lưu trên máy” khi giữ offline mô phỏng. |
| **R09 — Vùng chạm dưới 44px** | **Đã đạt** | **Đã đạt** | Đo lại bảy nút ngày: 390px rộng 44.28–44.30px, cao 44px; 1280px rộng 86px, cao 44px. Ô giờ đến muộn và ghi chú đều cao 44px ở cả hai cỡ; select chọn buổi desktop 170×44px. Các kích thước cũ 38/40px không còn. Scan các control hiển thị trên 10 route không phát hiện thêm vùng chạm dưới 44px sau khi tính vùng label của checkbox. |
| **R11 — Shell, thao tác lưu và bảng Học sinh** | **Đã đạt** | **Đã đạt** | Header mobile còn **83,5px**. Thẻ danh sách điểm danh x=16px, rộng **343px** trên clientWidth 375px; bỏ được lề lồng cũ. Nút Lưu điểm danh cao **52px**, nhìn thấy và hit-test được cả đầu trang (y=718) lẫn khi cuộn hết (y≈649,9); tab Thêm vẫn ở y=792–836. Sheet Thêm có đủ Học sinh/Báo cáo/Cài đặt và 2 shortcut; đã bấm lần lượt cả 5 link, đúng route và sheet tự đóng; link cao 44px. Desktop sidebar rộng **248px**, đủ **7 mục**, từng mục cao 44px; đã bấm từng mục, đúng route và active. Cuộn trang sidebar vẫn ở y≈0. Học sinh desktop là bảng 10 dòng, bảng cao khoảng 828,5px, trang khoảng 1117px; chuyên cần hai em đầu 75% và 100%. Mobile vẫn là thẻ. Xem screenshot thực tế ở cả hai layout; không tràn ngang. |

**R10 — Giữ nguyên theo quyết định:** `useStore` dùng đăng ký cập nhật là hợp đồng được chấp nhận trong vòng này. Không đánh lỗi và không yêu cầu đổi implementation. Phát hiện R10 ở vòng đầu chỉ được giữ như lịch sử review.

### Phát hiện mới

#### N01 — Minor: Nhận xét đã tự lưu nhưng trạng thái của học sinh mới vẫn “Chưa lưu”

- **Vị trí bản mới:** `src/features/comments/CommentsPage.tsx:34`, `src/features/comments/CommentsPage.tsx:40`, `src/features/comments/CommentsPage.tsx:176`; override được giữ trong `src/shared/SaveStatus/index.tsx:11`.
- **Tái hiện ở cả 390px và 1280px:** từ seed, ở Nhận xét nhập thêm nội dung cho Nguyễn Minh Anh, chưa bấm Lưu nháp; chọn Trần Gia Bảo, không sửa gì ở Bảo. Đợi sự kiện store xác nhận hàng chờ mô phỏng về 0 (không polling).
- **Bằng chứng:** nội dung Minh Anh đã nằm trong repository; object nhận xét của Gia Bảo trước/sau hoàn toàn không đổi; pending=0, trạng thái toàn cục **“Đã đồng bộ”**, nhưng trạng thái trong editor Gia Bảo vẫn **“Chưa lưu”**. Đã tái hiện cùng kết quả ở hai cỡ. Effect đổi `key` chỉ reset content/message/error; cleanup lưu nháp nhưng không clear override `unsaved` cho ngữ cảnh mới.
- **Đề xuất:** tính trạng thái theo bản nháp của lớp/buổi/học sinh đang xem; sau autosave thành công và chuyển key, clear override cũ nếu ngữ cảnh mới không có thay đổi. Nếu lưu thất bại thì giữ draft và trạng thái lỗi phù hợp. Không cần thay đổi quyết định R10.

### Duyệt hồi quy 10 route

| Route | 390×844 | 1280×900 |
| --- | --- | --- |
| `/dang-nhap` | Đã đạt; form độc lập, đăng nhập được | Đã đạt; form độc lập |
| `/lop` | Đã đạt; 5 tab, có Thêm | Đã đạt; 7 mục sidebar |
| `/lop/moi` | Đã đạt; đủ control, không tràn | Đã đạt; đủ control, không tràn |
| `/lop/6a/hoc-sinh` | Đã đạt; thẻ, Thêm active | Đã đạt; bảng, Học sinh active |
| `/cai-dat` | Đã đạt; Thêm active | Đã đạt; Cài đặt active |
| `/lop/6a/diem-danh` | Đã đạt; nút lưu dính, Điểm danh active | Đã đạt; chọn buổi và lưu được |
| `/lop/6a/diem` | Đã đạt; nhập theo bài | Đã đạt; bảng nhiều bài |
| `/lop/6a/diem/bai-moi` | Đã đạt; route con giữ Điểm active | Đã đạt; route con giữ Điểm active |
| `/lop/6a/nhan-xet` | Mở/thao tác được; còn Minor N01 | Mở/thao tác được; còn Minor N01 |
| `/lop/6a/bao-cao` | Đã đạt; Thêm active | Đã đạt; Báo cáo active |

- Duyệt trực tiếp đủ 20 lượt route/kích thước, đợi nội dung page tải xong rồi đo DOM. Không route nào có document scrollWidth vượt viewport. Các giá trị 375/1265px là clientWidth khi có scrollbar, không phải lỗi tràn.
- Ngoài thao tác link Thêm và từng mục sidebar, đã thử mở Sheet rồi đổi breakpoint 390→1280: sheet đóng, không còn dialog mở, sidebar xuất hiện đủ 7 mục. Không còn nhóm link điều hướng ở cuối nội dung.
- Kiểm hồi quy đăng xuất với thay đổi mới tạo đang chờ: nút bị vô hiệu ở cả hai cỡ, thông báo nêu đúng 1/2 thay đổi chưa đồng bộ tương ứng. Không dùng thông báo worker để suy ra kết quả này.
- Console cuối lượt đọc **147 entries**, chỉ mức debug/info của Vite và React DevTools; không warning/error ứng dụng, không thấy SĐT hay nội dung nhận xét trong log. Lỗi validation R04 hiển thị trên UI và không tạo console error.

### Lệnh và giới hạn vòng kiểm lại

| Lệnh chạy độc lập | Kết quả |
| --- | --- |
| `npm run typecheck` | Exit 0 |
| `npm run test` | Exit 0; **7 files, 25/25 tests** |
| `npm run build -- --outDir /tmp/quanlyhocsinh-rereview-dist` | Exit 0; **95 modules**, main JS **106.79 kB gzip**; output ngoài repo |
| `npm run dev -- --host 127.0.0.1` | Chạy tại **5175** vì 5173/5174 đã được dùng |

Chỉ bổ sung báo cáo này, không sửa mã. Đã khôi phục origin thử về seed: 2 lớp, 20 học sinh, pending=0, changeLogs=0, auth=null và trở lại màn đăng nhập. Đã dừng dev server do reviewer khởi chạy, không dừng các server có sẵn.

Các giới hạn production, backend/ACK thật, iPhone thật, PDF/in thực tế và visual diff theo pixel ở vòng đầu vẫn chưa được xác minh trong vòng này. Kết luận “Đã đạt” bên trên áp dụng cho đúng các kịch bản prototype đã tái hiện, không mở rộng thành nghiệm thu production.

Status: DONE_WITH_CONCERNS

# Báo cáo P1 · Prototype web Chi tiết lớp (desktop) khớp thiết kế round-4

Ngày: 2026-10-21 · Thư mục làm việc: `design/prototype` (thư mục chính, giữ nguyên thay đổi chưa commit của người dùng)
Brief: `plans/20261021-mvp/briefs/30-proto-class-detail-web.md`

## 1. Đã làm

Khung chung web desktop (≥ 1024 px, giữ nguyên mobile):

- `ClassDesktopHeader.tsx`: breadcrumb `Lớp / <tên lớp> / <tab>` (buổi: `Lớp / <tên lớp> / Buổi học / Buổi N`), tiêu đề 30/700, phụ đề "n học sinh · lịch lặp · hôm nay <thứ dd/mm>", nút "…" (Sửa lớp / Sửa lịch học / Lưu trữ lớp), nút chính theo tab, hàng 5 tab Buổi học / Bài kiểm tra / Điểm / Học sinh / Báo cáo.
- `ClassSpaceLayout` trên desktop chỉ giữ kiểm quyền; mỗi màn tự dựng khung đầu. Sidebar desktop thêm hộp "Đang xem lớp" như ảnh 01.
- CSS desktop dùng chung: `features/class-space/desktop.module.css` (thẻ 16 px, chữ 13/14/15/17/30, segmented xám `#E6E9EE`, màu lấy từ token `--color-primary` `#2F5BEA`).

Từng màn:

- Buổi học (`SessionsDesktop.tsx`): hai cột. Trái "Các buổi đã qua" (Buổi, Giờ, Điểm danh, Phiếu, BTVN, "…" mỗi dòng; buổi hủy ghi "Buổi đã hủy", các buổi sau đánh số liên tục bằng `sessionNumber`/`sessionPrefix`). Phải ~360 px: "Buổi hiện tại", "Buổi lẻ sắp tới" (chỉ hiện khi có buổi lẻ planned khác buổi hiện tại; chip "Buổi lẻ"; Xem buổi / Sửa buổi lẻ / Hủy buổi), "Lịch lặp" kèm câu "Buổi lẻ … nằm ngoài lịch lặp".
- Chi tiết buổi (`SessionDetailDesktop.tsx`): 3 tab Điểm danh / Nhận xét / Bài tập về nhà dạng segmented; nút chính nằm cùng hàng tab.
  - Điểm danh (`AttendanceDesktop.tsx`): bảng 4 nút Có mặt / Muộn / Có phép / Vắng, ô "Đến lúc" khi Muộn, dòng đếm 4 trạng thái, "Tất cả có mặt" + "Lưu điểm danh", thẻ "Người dạy" chỉ đọc (không có nút đổi người dạy trên web).
  - Nhận xét (`CommentsDesktop.tsx` + `TicketEditor.tsx`): danh sách em (bộ lọc Tất cả / Chưa chọn sao / Chưa gửi, sao, dòng BTVN buổi trước, pill Đã gửi / Nháp / Chưa chọn sao) cạnh khung soạn phiếu (3 mức sao hiện đủ 3 sao, câu mẫu cố định nguyên văn spec mục 4 kể cả 🌟, ghi chú, BTVN buổi trước chỉ đọc, nút "Chấm ở tab Bài tập về nhà"). Không còn bottom sheet trên desktop. Chọn sao lưu ngay; ghi chú lưu khi rời ô (thiết kế không có nút Lưu).
  - BTVN (`HomeworkDesktop.tsx`): "Bài tập buổi trước" (chọn phần ở trái kèm x/y đã chấm, danh sách cả lớp ở phải với 3 mức, "Đánh dấu cả lớp", chip "Chưa chấm", "Lưu kết quả chấm") và "Bài tập hôm nay" (tối đa 4 phần mỗi loại một, danh sách + khung sửa phần bên cạnh, khoá xoá khi đã chấm), biến thể buổi chưa có BTVN với 4 nút thêm phần. Desktop gom thay đổi chấm thành nháp rồi lưu một lần; mobile vẫn lưu ngay từng ô.
- Bài kiểm tra (`TestsDesktop.tsx`): bảng Tên / Ngày (dd/mm/yy) / Điểm tối đa / Đã có điểm (pill x/y em); tạo & sửa bằng hộp thoại (điểm tối đa 1..1000, mặc định 15, gợi ý "Số nguyên từ 1 đến 1000. Mặc định 15."); xoá bằng hộp xác nhận nói rõ "Chưa có điểm: xoá hẳn" hoặc "Đã có điểm: lưu trữ" kèm câu giải thích đúng spec mục 4.
- Điểm (`ScoreGridDesktop.tsx`): bảng học sinh × bài kiểm tra, tiêu đề cột "tên bài / ngày · /điểm tối đa", ô nhập trực tiếp, ô trống placeholder "Chưa có điểm", cột học sinh + hàng tiêu đề ghim khi cuộn, nút "Lưu điểm". Không có điểm trung bình.
- Học sinh (`StudentsDesktop.tsx` + `parentAccount.ts`): 4 thẻ thống kê (đang học / đang dùng / chờ đổi mật khẩu / chưa cấp), bảng Học sinh (tên, "Mẹ/Bố · SĐT"), Lớp đang học, Chuyên cần dạng x/y, Tài khoản phụ huynh 3 trạng thái kèm nút nhỏ "Cấp mật khẩu"/"Cấp lại", menu "…" (Sửa số điện thoại / Cấp lại mật khẩu / Đánh dấu nghỉ), chú thích dưới bảng đúng chữ ảnh. Cấp mật khẩu mở hộp thoại hiện **mật khẩu tạm giả** (`Tam-xxxxNNNN`), ghi rõ là dữ liệu prototype, hiện một lần, có nút Sao chép; đóng hộp thoại thì chuyển sang "Đã cấp · chờ đổi". Không có màn mời, không có "Thêm từ lớp khác"; "+ Thêm học sinh" dùng form cũ.
- Báo cáo (`ReportsPage.tsx` nhánh desktop): bỏ bộ chọn lớp, thêm stepper "‹ Tháng 10/2026 ›" (một tháng, không có "3 tháng gần nhất"); danh sách "Sẵn sàng n/tổng học sinh" + pill thiếu dữ liệu; thẻ chi tiết có Chuyên cần x/y buổi, "Kiểm tra gần nhất" lấy từ dữ liệu thật (tên bài · điểm/điểm tối đa, bài lưu trữ và ô trống bị bỏ), nhận xét chung + gợi ý, "Dùng gợi ý làm bản nháp", "Xem trước PDF", "Phát hành n báo cáo", chú thích phát hành.

Thêm vào repository (không đổi nghiệp vụ, chỉ bổ sung cho web): `updateStudentPhone` (đổi SĐT phụ huynh, gỡ liên kết tài khoản cũ), trường hiển thị `guardianRelation` ("Mẹ"/"Bố") trong seed.

Test mới: `desktopHeader.test.ts` (13), `desktopRender.test.tsx` (7), `desktopScores.test.ts` (8), `desktopComments.test.ts` (9), `parentAccount.test.ts` (5), `studentsDesktop.test.ts` (4).

## 2. Ảnh chụp desktop 1360×934

`plans/20261021-mvp/design/prototype-shots/p1/`: `01-buoi-hoc.png`, `02-buoi-hoc-menu-dong.png`, `03-diem-danh.png`, `04-nhan-xet.png`, `05-btvn-cham.png`, `06-btvn-giao.png`, `07-btvn-chua-co.png`, `08-bai-kiem-tra.png`, `09-kiem-tra-tao.png`, `10-kiem-tra-sua.png`, `11-kiem-tra-xoa-chua-diem.png`, `12-kiem-tra-xoa-co-diem.png`, `13-diem.png`, `14-hoc-sinh.png`, `15-bao-cao.png` (+ `14b-hoc-sinh-menu.png`, `14c-cap-mat-khau.png`). Bỏ qua `04b-nhan-xet-1-sao` theo quyết định round-4.

Mobile 390 px: `mobile-390-buoi-hoc.png`, `mobile-390-nhan-xet.png` — vẫn là giao diện mobile cũ (danh sách thẻ, bottom sheet nhận xét), không có phần tử desktop.

## 3. Bảng khác biệt còn lại so với ảnh thiết kế

| Màn | Khác gì | Lý do |
|---|---|---|
| Tất cả | Sidebar còn mục ngoài phạm vi: Phân công, Lịch dạy, Học phí, Nhân sự, Vai trò, Cài đặt | Màn có sẵn từ các vòng trước; brief chỉ cho giữ nguyên cờ `features` (payroll/lectures đang tắt). Ảnh 01 chỉ vẽ 5 mục của lớp. |
| 01, 02 | Không có thẻ "Buổi lẻ sắp tới" riêng; buổi hiện tại là chính buổi lẻ 25/10 (seed) | Seed cũ không có buổi lặp 21/10; thẻ lẻ chỉ hiện khi có buổi lẻ planned khác buổi hiện tại. Thẻ "Buổi hiện tại" đã có thêm nút "Sửa buổi lẻ" cho buổi lẻ. |
| 01 | Buổi 19/10 hiện "Chưa điểm danh" (ảnh: đã điểm danh 9/10); BTVN các buổi cũ "Chưa giao" | Seed đánh dấu buổi 19/10 là planned và không có điểm danh/BTVN cho buổi đó; sửa seed sẽ làm hỏng test khoá dữ liệu mẫu (`repositories.test.ts`). |
| 02 | Menu mỗi dòng chỉ có "Hủy buổi" (ảnh: "Sửa buổi lẻ" + "Hủy buổi") | Không có buổi lẻ planned nào trong quá khứ trong seed; "Sửa buổi lẻ" chỉ hiện với buổi lẻ planned. Dùng component menu chung 220 px nên canh phải. |
| 03 | Thêm dòng ghi chú cảnh báo vắng 2 buổi dưới bảng; số liệu 6/1/1/1 theo seed | Cảnh báo vắng 2 buổi là dữ liệu thật của buổi, giữ lại; số liệu mẫu khác ảnh. |
| 04 | Sao/BTVN/trạng thái theo seed; nút "Chấm ở tab Bài tập về nhà" (ảnh chỉ có liên kết chữ) | Dữ liệu mẫu khác; nút dùng `Button` chung. |
| 05 | 3 phần, tất cả "0/9 đã chấm" (ảnh: 4 phần, 8–10/10 đã chấm) | Seed chỉ chấm BTVN buổi 6; thêm điểm chấm cho buổi 7 sẽ làm hỏng test xoá phần (`homeworkActions.test.ts`). |
| 06 | Chụp trên buổi 7 (3 phần) thay vì buổi 9; "Còn có thể thêm: Luyện đọc" | Seed không giao BTVN ở buổi 9; câu "còn có thể thêm" tính từ dữ liệu thật. |
| 07 | Nút "Lưu bài tập" ở trạng thái khoá | Chưa mở khung sửa phần nên chưa có gì để lưu (ảnh có nút lỗi chiều cao — lỗi bảng thiết kế). |
| 08, 13 | 4 bài, thang 10, ngày 30/9…12/10 (ảnh: 5 bài, thang 15/100/20/15) | Seed cũ (spec: dữ liệu cũ giữ điểm tối đa 10, không migrate). |
| 09, 10, 11, 12 | Hộp thoại có thêm nút "Đóng" góc phải; ô ngày dùng input ngày của trình duyệt | `Modal` dùng chung toàn app; input `type=date` cho đúng định dạng và tránh nhập sai. |
| 13 | Thêm câu ghi chú dưới bảng | Giữ hướng dẫn nhập 7,5 / 7.5 như bản mobile; không nhắc tới điểm trung bình. |
| 14 | 9 đang học (seed có 1 em đã nghỉ), mỗi em 1 lớp | Seed có Đỗ Hải Nam đã nghỉ 09/10; lược đồ MVP một học sinh một lớp. |
| 14 (cấp mật khẩu) | Hộp thoại mật khẩu tạm là màn mới (ảnh 14 không có) | Brief yêu cầu luồng đề xuất: hiện mật khẩu giả một lần + sao chép rồi chuyển "Đã cấp · chờ đổi"; nghiệp vụ thật vẫn chờ người dùng xác nhận. |
| 15 | "Sẵn sàng 1/10", phần lớn là "Thiếu dữ liệu", không có nút "Dùng gợi ý" | Seed chưa có nhận xét chung của tháng và ít phiếu đã gửi trong tháng; quy tắc "Thiếu nhận xét chung" là nghiệp vụ có sẵn, không sửa test. |
| 03…07 | Không có màn "Đổi người dạy" trên web | Quyết định R1-01: dạy thay thuộc Nhân sự, ngoài Bản đầu; mobile giữ nguyên hành vi cũ. |

## 4. Xác minh

```
$ cd design/prototype && npm test
Test Files  55 passed (55)
     Tests  537 passed (537)

$ npm run build        # tsc --noEmit && vite build
✓ built in 992 ms (không lỗi TypeScript)
```

Dev server: `npm run dev -- --port 5199` → chụp ảnh bằng Playwright (Chromium 147), viewport 1360×934 cho desktop và 390×844 cho mobile. Không có lỗi console/page error trong lúc chụp.

Tìm chữ cấm bằng `srcwalk discover ... --as text --scope src/features`:

- `trung bình`: 18 kết quả, **tất cả** là comment/test (ví dụ `latestTest.ts`, `ScoreGridDesktop.tsx` dòng chú thích, `scoreReport.ts`, các test cũ). Không có chuỗi nào trong giao diện của 15 màn.
- `Vắng thi`: 4 kết quả, tất cả trong test (`desktopRender.test.tsx`, `scoreReportRender.test.tsx`, `reportsPreview.test.tsx`). Không có trong giao diện.
- `OTP`: 3 kết quả: `features/staff/InvitePage.tsx`, `features/staff/MemberDetailPage.tsx` (màn Nhân sự/Mời có từ trước, ngoài 15 màn này) và 1 test của tôi. Không có trong 15 màn.
- `Mời`: 7 kết quả: `features/staff/MembersPage.tsx`, `features/staff/InvitePage.tsx`, `features/staffing/AssignmentsPage.tsx`, `features/settings/SettingsPage.tsx` — đều là màn ngoài phạm vi brief, có từ các vòng trước, tôi không sửa. Không có trong 15 màn.

## 5. Vấn đề / ghi chú

- Dữ liệu mẫu (seed) chưa giống ảnh ở vài chỗ nêu trên. Tôi **không** sửa các mốc dữ liệu đó vì nhiều test cũ khoá dữ liệu mẫu (`6a-session-8`, `listPlannedSessions`, xoá phần BTVN, seed báo cáo). Brief cho phép số liệu mẫu khác nếu không mâu thuẫn nội bộ; các màn vẫn nhất quán với nhau (cùng seed).
- Các màn Nhân sự / Mời / Học phí / Phân công / Lương / Vai trò vẫn còn trong prototype và sidebar desktop (ngoài Bản đầu, có từ trước). Nếu muốn ẩn để khớp ảnh 01 và phạm vi MVP thì cần một cờ `features` mới + cập nhật test sidebar — ngoài phạm vi brief này.
- Trạng thái cấp mật khẩu phụ huynh và mật khẩu tạm là dữ liệu giả lưu trong bộ nhớ/localStorage của trình duyệt; không phải nghiệp vụ thật, không ghi SĐT/mật khẩu vào log.
- Desktop chấm BTVN và nhập điểm lưu theo lô; rời màn khi còn nháp chưa có cảnh báo (mobile lưu ngay từng ô nên không có tình trạng này). Nếu muốn, thêm blocker như tab Điểm danh ở vòng sau.

Status: DONE_WITH_CONCERNS
Summary: Đã dựng đủ 15 màn web desktop "Chi tiết lớp" khớp bố cục/chữ/trạng thái ảnh round-4, giữ nguyên mobile, test 537/537 và build xanh, ảnh chụp + bảng khác biệt nằm trong `plans/20261021-mvp/design/prototype-shots/p1/`. Còn khác biệt chủ yếu do seed cũ (số bài kiểm tra/thang điểm, buổi 19/10 chưa điểm danh, BTVN buổi 7 chưa chấm, báo cáo thiếu nhận xét chung), sidebar còn mục ngoài phạm vi và màn Nhân sự/Mời cũ vẫn chứa chữ "Mời"/"OTP" ngoài 15 màn này.

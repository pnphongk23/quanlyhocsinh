# Smoke test: Báo cáo khoảng buổi + email khôi phục

**Ngày:** 2026-10-24  
**Môi trường:** web local c933430; backend local D1 theo nguồn bàn giao abb5a52; prototype React local. Không dùng staging/remote. Toàn bộ workspace, học sinh và thông tin đăng nhập dùng cho smoke là dữ liệu giả. Không ghi số điện thoại, địa chỉ email, nội dung nhận xét, mật khẩu hoặc token vào báo cáo.

## Tóm tắt

- **PASS: 15 · FAIL: 0 · PARTIAL: 2**
- Backend local khởi động được; migration local hoàn tất. Seed lớp giả có 3 học sinh và 9 buổi (8 held, 1 cancelled); đồng bộ dữ liệu trả 34 applied, 0 rejected.
- Luồng tạo/phát hành báo cáo, phát hành lại sau khi điểm đổi, khoảng trùng nhau, phụ huynh và cài đặt email đã chạy trên web thật với backend local.
- Smoke live ban đầu thấy Cài đặt web trắng ở 390px; đối chiếu sau đó bằng cùng fixture phiên cho thấy baseline và nhánh hiện tại đều render route này.
- Reset mật khẩu được hoàn tất và xác minh qua API local ở vòng trước; chưa gửi mật khẩu mới qua UI trình duyệt. Prototype auth đã chụp bằng mode test.

## Bảng kiểm

| # | Kịch bản | Kết quả | Bằng chứng / ghi chú |
|---|---|---|---|
| 1 | Khởi động Worker local, migration D1 local | PASS | Wrangler sẵn sàng ở cổng local; migration 0003–0005 thành công. |
| 2 | Đăng ký giáo viên giả, tạo lớp/học sinh/buổi và đồng bộ | PASS | Đăng ký qua UI; dữ liệu học vụ giả tạo qua API local; 8 buổi held, 1 buổi cancelled; sync 34 applied / 0 rejected. |
| 3 | Tab Báo cáo → Thêm báo cáo, mặc định buổi 1 đến buổi held gần nhất; bỏ buổi hủy | PASS | Dialog mở với Buổi 1–8; buổi cancelled không nằm trong lựa chọn. Ảnh web/1280-teacher-add-report.png, web/390-teacher-add-report.png. |
| 4 | Tạo đợt, nhãn khoảng và chi tiết | PASS | Hiển thị “Buổi 1–8 · 01/10–08/10”. Ảnh web/1280-teacher-batch-list.png, web/1280-teacher-batch-detail.png, bản 390px cùng tên. |
| 5 | Xem trước mở popup; sửa nhận xét chung | PASS | Popup mở; nhận xét lưu sau khi rời trường nhập. Ảnh web/1280-teacher-preview-popup.png, web/390-teacher-preview-popup.png. |
| 6 | Phát hành cho một học sinh; đổi điểm rồi phát hành lại | PASS | Sau khi đổi điểm, giao diện báo cần phát hành lại; phát hành lại thành công. |
| 7 | Tạo đợt thứ hai có cùng khoảng | PASS | Danh sách hiển thị hai đợt trùng khoảng. |
| 8 | Phụ huynh không thấy bản nháp; thấy và mở báo cáo đã phát hành | PASS | Trước phát hành: trạng thái chưa có báo cáo. Sau phát hành: danh sách có báo cáo và mở được chi tiết. Ảnh web/1280-parent-report-list.png, web/1280-parent-report-detail.png, bản 390px cùng tên. |
| 9 | Cài đặt: lưu/xóa email, sai mật khẩu hiện lỗi tại trường | PASS | Sai mật khẩu hiện lỗi tại trường; mật khẩu hiện tại hợp lệ cho phép lưu và xóa. Email giả được thêm lại để chạy reset. Ảnh web/1280-settings-email.png. |
| 10 | Quên mật khẩu: tài khoản chưa lưu email | PASS | Live UI chỉ dẫn liên hệ người vận hành. Ảnh trạng thái web/1280-forgot-no-email.png và bản 390px. |
| 11 | Quên mật khẩu: email che, email sai và email đúng | PASS | Live UI hiện email dạng che; email sai báo lỗi; email đúng hiện “Đã gửi”. Trạng thái đã gửi được xác nhận trong UI live trước khi rate limit local chạm ngưỡng. Ảnh các trạng thái ở web/1280-forgot-{masked-email,wrong-email,sent}.png và bản 390px. Ảnh trạng thái sau khi chạm rate limit được dựng bằng route mock để không bỏ qua giới hạn; không thay đổi D1 để né giới hạn. |
| 12 | Mở link reset và kiểm tra URL đã bỏ token | PASS | Mở link lấy từ test_mailbox local; form reset hiện ra và token không còn trong URL. Ảnh web/1280-reset-password-form.png và bản 390px. |
| 13 | Đặt mật khẩu mới, token dùng lại, phiên cũ và đăng nhập mới | PARTIAL | Link mới được yêu cầu qua UI; form hợp lệ đang mở trong tab handoff và URL đã bỏ token. Chưa nhập/gửi mật khẩu mới qua UI. API local từ vòng trước trả 200 cho reset, replay 400, phiên cũ 401, đăng nhập mới 200. Ảnh form live: web/390-reset-password-form-live.png, web/1280-reset-password-form-live.png; chưa có ảnh UI thành công hoặc xác nhận đăng nhập mới qua UI. |
| 14 | Cài đặt web trên viewport 390px | PARTIAL | Smoke live ban đầu thấy trang trắng, nhưng đối chiếu bằng fixture phiên giống nhau cho thấy baseline và nhánh hiện tại đều render Cài đặt ở 390px, không có console/page error. Ảnh hiện tại: web/390-settings-email.png; baseline: web/390-settings-email-baseline.png; ảnh trắng ban đầu: web/390-settings-email-blank-original.png. Chưa tái hiện được nguyên nhân với phiên/cache/API live ban đầu. |
| 15 | Prototype: báo cáo giáo viên, dialog, chi tiết, popup; báo cáo phụ huynh; Cài đặt email | PASS | Màn prototype đã mở và chụp ở cả 390px và 1280px: proto/{390,1280}-teacher-batch-list.png, teacher-add-report.png, teacher-batch-detail.png, teacher-preview-popup.png, parent-report-list.png, parent-report-detail.png, settings-email.png. Fixture prototype là dữ liệu mẫu tĩnh. |
| 16 | Prototype: đăng ký có email, quên mật khẩu ba trạng thái, reset form/error | PASS | Chạy prototype với --mode test để tắt skip-login; fixture local tạo hai tài khoản giả. Đã chụp form đăng ký, tài khoản chưa có email, email che, email sai, đã gửi, reset form có link hợp lệ và lỗi token giả ở cả 390px/1280px. Ảnh proto/390-{register-email,forgot-no-email,forgot-masked-email,forgot-wrong-email,forgot-sent,reset-password-form,reset-password-error}.png và bộ 1280 tương ứng. |
| 17 | Dọn dẹp dev server | PASS | Đã dừng ba phiên Worker, web và prototype do smoke này khởi chạy; mỗi phiên kết thúc bằng Ctrl-C, mã thoát 130. |

## Chẩn đoán Cài đặt mobile

- So sánh cùng route /cai-dat ở viewport 390×844 trên baseline c5efdab và nhánh hiện tại, với cùng fixture phiên giáo viên và cùng mock API /v1/me. Baseline render tiêu đề Cài đặt; nhánh hiện tại render tiêu đề cùng panel Email khôi phục. Cả hai không phát sinh page error/console error.
- Diff code giữa baseline và hiện tại ở settings chỉ thêm EmailSettings vào SettingsPage.tsx:202 (mobile) và :376 (desktop); SettingsMobile và breakpoint useIsDesktop không đổi. Ở lần đối chiếu hiện tại component render được; không có bằng chứng CSS ẩn nội dung hoặc error boundary nuốt lỗi. Route boundary trong src/app/routes.tsx:14-19 hiển thị trang lỗi khi render throw.
- Kết luận có giới hạn: hiện chưa chứng minh trang trắng ban đầu là hồi quy của nhánh mới, và cũng chưa xác định được nguyên nhân gốc cụ thể. Bản kiểm tra live ban đầu phụ thuộc phiên/cache/API local đã dùng ở vòng trước; xác thực local sau đó bị rate limit, nên không thể tái tạo đúng phiên. Không sửa mã vì fixture cùng điều kiện không tái hiện lỗi.

## Lỗi và giới hạn

1. **Trang trắng ban đầu chưa tái hiện:** ảnh trắng đầu vòng đã giữ làm bằng chứng; lần đối chiếu cùng fixture render bình thường ở cả hai nhánh.
2. **UI reset success và login mới chờ người dùng:** chính sách thao tác trình duyệt yêu cầu người dùng tự nhập, xác nhận và gửi mật khẩu mới. Tab hiện mở tại form có link hợp lệ để người dùng hoàn tất.
3. **Ảnh quên mật khẩu web:** hành vi thật đã smoke qua browser UI; sau khi local rate limit đạt ngưỡng, các trạng thái chụp bổ sung được dựng bằng route mock.

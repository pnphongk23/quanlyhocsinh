# G-A — dữ liệu phụ huynh

## Đã làm

- Thêm `students?: [{id, name, class_id, class_name}]` vào `ApiMembership`. Khi có trường này, danh sách con và `studentIds` lấy theo membership đang chọn; khi API cũ chưa trả trường, quyền đọc suy ra từ snapshot membership như phương án tương thích. Tài khoản phụ huynh không có membership vẫn giữ phiên, có danh sách con rỗng và dùng được luồng đăng xuất/đổi mật khẩu. Khi mở app, `/me` được làm mới để cập nhật membership.
- `updateExtraSession` giữ nguyên chữ ký, kiểm tra buổi lẻ planned, ngày không quá khứ, giờ trùng và trạng thái mạng; gửi `PATCH /sessions/{id}` cùng `base_version`, chỉ cập nhật cache sau phản hồi thành công. Lỗi nghiệp vụ giữ nguyên message máy chủ; lỗi mất mạng báo cần mạng qua trạng thái lưu/lỗi repository.
- Đồng bộ phiên bản buổi học để có `base_version`. Kết quả lệnh `rejected` được giữ trong outbox và đặt `SaveStatus=error`; kiểu `duplicate` không còn nhận `original_status=rejected`.
- Membership phụ huynh là ranh giới quyền truy cập con. Bản phát hành báo cáo được lưu riêng, chỉ chọn publication mới nhất theo tháng và giải mã lỗi cô lập theo từng báo cáo; snapshot sai hình dạng không làm hỏng danh sách.
- Thêm kiểm thử dữ liệu membership đa workspace, tài khoản không con, snapshot báo cáo sai/đúng, PATCH chờ xác nhận và giữ nguyên lỗi máy chủ, cùng outbox rejected.
- Prototype không có UI inbox thông báo; bỏ qua phần repository inbox theo brief.

## Kiểm chứng

- `npm run typecheck`: đạt.
- `npm test -- --run src/test/guardian-data.test.ts src/test/sync-rejection.test.ts`: 9/9 đạt.
- `npm run build`: đạt; JS ban đầu gzip 145,853 byte. Build hiện có cảnh báo Vite về `sync.ts` vừa import động vừa import tĩnh.
- `npm test -- --run`: 190 đạt, 14 lỗi, 1 bỏ qua (205 test). Lỗi nằm trong `guardianRender.test.tsx` (9), `account.test.tsx` (1), `guardianRouting.test.tsx` (4); các file UI này ngoài phạm vi G-A theo brief, cần lead/G-B xử lý. Không ghi nhận lỗi trong hai bộ test G-A ở trên.
- Smoke staging chạy một lần cho đăng ký số không khớp: `register-guardian` trả HTTP 201, `memberships: []`. Tài khoản phụ huynh demo đăng nhập HTTP 200; `/me` HTTP 200, có 1 membership phụ huynh với 2 `students`. Snapshot có 4 publication; publication mới nhất trong tháng có dữ liệu giải mã được.
- Smoke `PATCH /sessions/{id}` với phiên giáo viên demo: HTTP 200, máy chủ xác nhận phiên bản mới. Gửi lại cùng ghi chú hiện có để xác nhận endpoint mà không đổi nội dung buổi học.
- Smoke đã tạo một tài khoản phụ huynh staging bằng SĐT ngẫu nhiên không khớp hồ sơ; SĐT không được ghi vào log hoặc báo cáo.

## Cần lead / rủi ro còn lại

- 14 lỗi suite tổng thuộc UI ngoài phạm vi file G-A; cần lead/G-B xác định và sửa.
- Màn sửa buổi học cần nối `getExtraSessionUpdateError()` để hiện nguyên văn lỗi nghiệp vụ cạnh `SaveStatus`; G-A chỉ sửa lớp data theo giới hạn brief.
- `SettingsPage.tsx` còn comment cũ nói membership chưa trả danh sách con, dù hiện phần hiển thị đọc qua `listMyChildren()`; cập nhật comment cùng phần việc UI.
- Smoke staging đã xác minh hợp đồng trực tiếp, nhưng chưa cập nhật `scripts/smoke-staging.mjs` hiện tại (script đó còn kiểm tra attendance của giáo viên). Có thể bổ sung smoke phụ huynh/PATCH vào script khi lead muốn chuẩn hóa cách chạy lại.

Commit G-A: `c1d2496` (`feat(data): wire guardian membership and session updates`).

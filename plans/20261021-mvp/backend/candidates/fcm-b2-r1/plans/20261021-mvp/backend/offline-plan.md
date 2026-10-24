# Kế hoạch offline cho từng client

Ngày: 2026-10-21 · Đề xuất để controller duyệt trước khi triển khai. Hợp đồng: `api-spec.md` mục 6. Chưa kiểm chứng trên thiết bị thật.

## Hợp đồng chung (không đổi theo client)

- Đọc: `snapshot` lần đầu hoặc khi `409 resync_required`, sau đó `pull` theo `cursor` + `epoch`. Cửa sổ lưu: 90 ngày trước tới 56 ngày sau.
- Ghi: client ghi vào kho cục bộ **và** bảng `outbox` trong cùng một transaction. Mỗi dòng outbox = một lệnh (`id` UUID, `type`, `payload`, `base_version` = phiên bản bản ghi cục bộ lúc sửa, `membership_id`, `created_at`, trạng thái `pending` \| `sending` \| `rejected`).
- Gửi: tuần tự theo `created_at`, tối đa 50 lệnh/request, retry có backoff khi mất mạng. Xóa lệnh khỏi outbox chỉ khi máy chủ trả `applied`/`duplicate`/`conflict`. `rejected` giữ lại, hiện lỗi (spec mục 5.3).
- Gộp lệnh: nhiều lần sửa cùng một ô khi lệnh chưa gửi (`pending`) thay bằng lệnh mới giữ `base_version` cũ; không gộp lệnh đang `sending`.
- Phụ thuộc: lệnh tạo bài (`test.create`) đi trước `score.set` của bài đó; nếu lệnh tạo bị từ chối, các lệnh phụ thuộc cũng bị từ chối `not_found` và được giữ.
- Kích hoạt đồng bộ: mở app, có mạng trở lại, lấy lại focus, sau mỗi thay đổi (trì hoãn ≈ 2 giây), định kỳ 120 giây khi đang mở.
- Chặn đăng xuất khi `outbox` còn lệnh; chỉ hiện lỗi khi lưu hoặc đồng bộ lỗi (không có chip trạng thái thường trực).
- Thu hồi quyền: `pull` trả `409 resync_required` hoặc `push` trả `404` cho membership ⇒ ẩn cache của membership đó; lệnh `rejected` giữ nguyên.
- Cache tách theo (user, workspace, membership). Mọi thay đổi `epoch` ⇒ xóa và tải lại.

## Kho cục bộ

| Client | Kho | Ghi chú |
|---|---|---|
| Web/PWA | Dexie (IndexedDB), một bảng mỗi thực thể ở `api-spec.md` 6.4 + `outbox` + `meta(cursor, epoch)` | đã chốt trong architecture; prototype có sẵn `data/outbox.ts` để lấy ý |
| iOS | **Đề xuất SQLite qua GRDB** (thay SwiftData) | cần chốt: lược đồ cục bộ lặp lại khóa tự nhiên của server nên `INSERT … ON CONFLICT DO UPDATE WHERE version <` áp thay đổi hàng loạt trong một transaction với outbox; `ValueObservation` đẩy dữ liệu lên SwiftUI; SwiftData cần `@ModelActor` cho Swift 6 và kém ở upsert theo khóa/xóa hàng loạt. Đánh đổi: thêm một thư viện SwiftPM. Nếu không muốn phụ thuộc ngoài: SwiftData chạy được với vài nghìn dòng nhưng phải tự bọc upsert. **Chưa đo.** |

## Thứ tự làm

1. **Server + hợp đồng (bước chặn của mọi thứ):** `sync/push`, `pull`, `snapshot`, `conflict.resolve`, test idempotent và xung đột (`authz-matrix.md` T27–T33). Xuất bộ **fixture JSON mẫu** (`worker/tests/fixtures/sync/*.json`: request, response, từng loại kết quả) làm nguồn sự thật cho cả hai client.
2. **iOS: đọc có cache trước, ghi sau.** (a) đăng nhập, chọn vai trò, `snapshot` + `pull` vào SQLite, mọi màn đọc từ kho cục bộ; (b) outbox + `sync/push` cho **điểm danh** (đường quan trọng nhất ở lớp), thử mất mạng giữa chừng và gửi trùng; (c) điểm + tạo bài; (d) phiếu nháp/gửi; (e) BTVN giao/chấm; (f) màn xung đột. Mỗi bước chỉ xong khi test kịch bản ở dưới qua.
3. **Web/PWA: cùng hợp đồng, bắt đầu sau khi bước 2(b) chạy.** Dexie + outbox phỏng theo prototype, dùng cùng fixture; thứ tự các luồng như iOS. Web làm song song được vì khác ngăn xếp, miễn dùng chung fixture ở bước 1.
4. **Phụ huynh (hai client):** chỉ đọc; cache `pull` kèm "cập nhật lúc …" (spec 5.3); không cần outbox.
5. **Sau cùng:** push FCM (iOS qua APNs, web qua FCM web token, đã chốt 2026-10-21), PDF báo cáo trên máy.

## Kịch bản kiểm bắt buộc (chung hai client, chạy với server staging)

Mất mạng giữa lúc gửi (lệnh gửi hai lần ⇒ `duplicate`); hai thiết bị cùng sửa một ô (⇒ `conflict`, chọn bản); tắt app khi còn lệnh rồi mở lại; mất quyền khi offline (⇒ lệnh `rejected` giữ lại, cache ẩn); đổi vai trò khi còn lệnh cũ; hết dung lượng kho cục bộ; đồng hồ máy lệch (không ảnh hưởng vì máy chủ phân xử bằng `base_version`, nhưng `session_not_started` dùng ngày máy chủ).

## Rủi ro đã biết

iOS không đồng bộ khi app đã đóng (cả hai client); Safari có thể thu hồi IndexedDB khi thiếu dung lượng (web); `base_version` cục bộ sai sau khi áp `pull` lỗi ⇒ sinh xung đột giả: khi áp `pull`/`snapshot` luôn cập nhật `version` cục bộ trong cùng transaction với dữ liệu.

## Push và offline (B2)

Push không thay cơ chế đồng bộ. Mở app/token đổi/quyền thông báo đổi: đăng ký lại qua `PUT /device-tokens` khi có mạng; thu hồi quyền thì gỡ đăng ký. Đổi user/role phải chuyển token sang membership hiện hành; đăng xuất gỡ token phía server trước khi xoá phiên. Khi mất mạng chưa thể đăng ký/gỡ token, lưu thao tác quản lý thiết bị để xử lý lúc nối lại, không ghi token vào log. Server kiểm lại phiên/quyền/con được liên kết trước gửi nên không dựa vào client gỡ token để bảo mật. Nhận push chỉ kích hoạt tải qua API, không ghi đè kho cục bộ từ payload. Lưu đề BTVN/điểm offline chỉ tạo sự kiện sau commit server; gửi phiếu/phát hành báo cáo vẫn cần mạng theo spec. Gộp đã chốt Q7: điểm chờ 5 phút sau server commit cuối, BTVN một lần giao (lệnh `homework.assign` chứa 1..4 phần mới và UUID chung), sửa nội dung đề đã giao không push. Chưa triển khai.

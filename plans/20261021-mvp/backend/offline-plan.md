# Kế hoạch offline cho từng client

Ngày: 2026-10-21 · Đề xuất để controller duyệt trước khi triển khai. Hợp đồng: `api-spec.md` mục 6. Chưa kiểm chứng trên thiết bị thật.

## Hợp đồng chung (không đổi theo client)

- Đọc: `snapshot` lần đầu hoặc khi `409 resync_required` / `409 snapshot_required`, sau đó `pull` theo `cursor` + `epoch`. Cửa sổ ảnh chụp: 90 ngày trước tới 56 ngày sau. `change_log` chỉ giữ 120 ngày, nên client offline quá cửa sổ đó sẽ nhận `snapshot_required` (xem dưới).
- Ghi: client ghi vào kho cục bộ **và** bảng `outbox` trong cùng một transaction. Mỗi dòng outbox = một lệnh (`id` UUID, `type`, `payload`, `base_version` = phiên bản bản ghi cục bộ lúc sửa, `membership_id`, `created_at`, trạng thái `pending` \| `sending` \| `rejected`).
- Gửi: tuần tự theo `created_at`, tối đa 50 lệnh/request, retry có backoff khi mất mạng. Xóa lệnh khỏi outbox chỉ khi máy chủ trả `applied`/`duplicate`. `rejected` giữ lại, hiện lỗi (spec mục 5.3). Không có kết quả `conflict`: hai thiết bị sửa cùng ô thì lệnh tới máy chủ sau cùng thắng (đã chốt 2026-10-21, `api-spec.md` 6.5).
- **Ranh giới atomic: từng lệnh, không phải từng lô (B-02).** Máy chủ ghi mỗi lệnh trong một `batch` D1 riêng; lô HTTP 50 lệnh không atomic. Vì vậy: xoá **từng** dòng outbox khi có kết quả của riêng lệnh đó (không xoá cả lô theo một response), lệnh chạy trước không bị hoàn lại khi lệnh sau thất bại, một lệnh bị từ chối không làm hỏng các lệnh còn lại. Mất mạng giữa chừng: giữ nguyên các lệnh chưa có kết quả và gửi lại cả lô ở lần sau — máy chủ trả `duplicate` cho lệnh đã áp dụng nên không ghi hai lần.
- Gộp lệnh: nhiều lần sửa cùng một ô khi lệnh chưa gửi (`pending`) thay bằng lệnh mới giữ `base_version` cũ; không gộp lệnh đang `sending`.
- Phụ thuộc: lệnh tạo bài (`test.create`) đi trước `score.set` của bài đó; nếu lệnh tạo bị từ chối, các lệnh phụ thuộc cũng bị từ chối `not_found` và được giữ.
- Kích hoạt đồng bộ (sửa 2026-10-23): mở app, quay lại app (web: `visibilitychange` → visible, `pageshow`, `focus`; iOS: vào foreground), có mạng trở lại, sau mỗi thay đổi qua outbox (đợi yên 400 ms, tối đa 1 giây tính từ thay đổi đầu tiên chưa đẩy; mọi lệnh đang chờ gom vào một lần push, chỉ một push đang bay, lệnh đến lúc đó chạy thêm một vòng), sau mỗi ghi REST thành công, định kỳ 60 giây chỉ khi app đang hiển thị (nền thì dừng). Yêu cầu đến khi đang đồng bộ ⇒ chạy thêm một vòng sau khi xong (không bỏ qua).
- Tải đầu (`snapshot`): xoá dữ liệu thực thể đã cache của identity trước khi tải (giữ outbox), tải các thực thể song song (web ≤ 4), chỉ lưu `cursor`/`epoch` sau khi MỌI thực thể tải xong; lỗi giữa chừng ⇒ không lưu cursor, lần sau tải lại từ đầu.
- Kiểm phiên (`GET /me`) không chặn giao diện khi đã có phiên lưu: chạy nền khi mở/quay lại app; 401/403/404 vẫn xoá phiên/ẩn cache (thu hồi có hiệu lực ở lần mở/đồng bộ kế tiếp, spec mục 4).
- Chặn đăng xuất khi `outbox` còn lệnh; chỉ hiện lỗi khi lưu hoặc đồng bộ lỗi (không có chip trạng thái thường trực).
- Thu hồi quyền: `pull` trả `409 resync_required` (`scope_changed`) hoặc `409 snapshot_required` (log đã dọn) hoặc `push` trả `404` cho membership ⇒ ẩn cache của membership đó và tải lại bằng `snapshot`; lệnh `rejected` giữ nguyên.
- Cache tách theo (user, workspace, membership). Mọi thay đổi `epoch` ⇒ xóa và tải lại.

## Kho cục bộ

| Client | Kho | Ghi chú |
|---|---|---|
| Web/PWA | Dexie (IndexedDB), một bảng mỗi thực thể ở `api-spec.md` 6.4 + `outbox` + `meta(cursor, epoch)` | đã chốt trong architecture; prototype có sẵn `data/outbox.ts` để lấy ý |
| iOS | **Đề xuất SQLite qua GRDB** (thay SwiftData) | cần chốt: lược đồ cục bộ lặp lại khóa tự nhiên của server nên `INSERT … ON CONFLICT DO UPDATE WHERE version <` áp thay đổi hàng loạt trong một transaction với outbox; `ValueObservation` đẩy dữ liệu lên SwiftUI; SwiftData cần `@ModelActor` cho Swift 6 và kém ở upsert theo khóa/xóa hàng loạt. Đánh đổi: thêm một thư viện SwiftPM. Nếu không muốn phụ thuộc ngoài: SwiftData chạy được với vài nghìn dòng nhưng phải tự bọc upsert. **Chưa đo.** |

## Thứ tự làm

1. **Server + hợp đồng (bước chặn của mọi thứ):** `sync/push`, `pull`, `snapshot`, test idempotent và lệnh tới sau thắng (`authz-matrix.md` T27–T33). Xuất bộ **fixture JSON mẫu** (`worker/tests/fixtures/sync/*.json`: request, response, từng loại kết quả) làm nguồn sự thật cho cả hai client.
2. **iOS: đọc có cache trước, ghi sau.** (a) đăng nhập, chọn vai trò, `snapshot` + `pull` vào SQLite, mọi màn đọc từ kho cục bộ; (b) outbox + `sync/push` cho **điểm danh** (đường quan trọng nhất ở lớp), thử mất mạng giữa chừng và gửi trùng; (c) điểm + tạo bài; (d) phiếu nháp/gửi; (e) BTVN giao/chấm; (f) hai thiết bị sửa cùng ô ⇒ lệnh tới sau thắng, `pull` của cả hai thấy cùng giá trị cuối (không có màn xung đột). Mỗi bước chỉ xong khi test kịch bản ở dưới qua.
3. **Web/PWA: cùng hợp đồng, bắt đầu sau khi bước 2(b) chạy.** Dexie + outbox phỏng theo prototype, dùng cùng fixture; thứ tự các luồng như iOS. Web làm song song được vì khác ngăn xếp, miễn dùng chung fixture ở bước 1.
4. **Phụ huynh (hai client):** chỉ đọc; cache `pull` kèm "cập nhật lúc …" (spec 5.3); không cần outbox.
5. **Sau cùng:** push FCM (iOS qua FCM → APNs bằng SDK Firebase Messaging, web qua FCM web token, đã chốt 2026-10-21), PDF báo cáo trên máy.

## Kịch bản kiểm bắt buộc (chung hai client, chạy với server staging)

Mất mạng giữa lúc gửi (lệnh gửi hai lần ⇒ `duplicate`); hai thiết bị cùng sửa một ô ⇒ cả hai `applied`, ô mang giá trị của lệnh **tới máy chủ sau** và `pull` của cả hai thiết bị thấy cùng giá trị cuối (kể cả khi lệnh tới sau mang `base_version` cũ), lịch sử trước/sau vẫn có; tắt app khi còn lệnh rồi mở lại; mất quyền khi offline (⇒ lệnh `rejected` giữ lại, cache ẩn); đổi vai trò khi còn lệnh cũ; hết dung lượng kho cục bộ; đồng hồ máy lệch (không ảnh hưởng vì máy chủ áp theo thứ tự nhận lệnh, nhưng `session_not_started` dùng ngày máy chủ).

## Rủi ro đã biết

iOS không đồng bộ khi app đã đóng (cả hai client); Safari có thể thu hồi IndexedDB khi thiếu dung lượng (web); `base_version` cục bộ sai sau khi áp `pull` lỗi ⇒ lệnh gửi đi mang giá trị cũ nhưng vẫn thắng vì tới sau (mất bản mới hơn đã có trên mấy chủ): khi áp `pull`/`snapshot` luôn cập nhật `version` cục bộ trong cùng transaction với dữ liệu.

## Push và offline (B2)

Push không thay cơ chế đồng bộ. Mở app/token đổi/quyền thông báo đổi: đăng ký lại qua `PUT /device-tokens` khi có mạng; thu hồi quyền thì gỡ đăng ký thủ công.

**Đổi danh tính cần mạng + xác nhận máy chủ (sửa C-01/R-01).** Đổi vai trò (`PUT /session/membership`), đăng xuất (`POST /auth/logout`) và đổi tài khoản **không** đi qua outbox nghiệp vụ: có token đang đăng ký mà mất mạng thì giữ nguyên identity/cache/UI hiện tại và báo cần mạng. Chỉ sau khi máy chủ trả 200/204 (batch đã gỡ đăng ký token của **đúng phiên hiện tại** và deliveries tương ứng) client mới đổi danh tính, rồi đăng ký FCM theo membership mới; chưa đăng ký lại chỉ mất push, không cản dùng app. Đổi tài khoản: thu hồi phiên/đăng ký cũ xong mới kích hoạt tài khoản mới. Token của phiên/thiết bị khác không bị gỡ.

**Làm mới token trong cùng binding** (cùng user + membership + phiên, ví dụ SDK xoay token) chỉ cập nhật `updated_at`: không bump `registration_version`, không đổi `bound_at`, không xoá deliveries ⇒ không mất quyền nhận job fanout đang chạy. Chỉ khi đổi binding mới bump version, đặt `bound_at` và huỷ deliveries cũ.

Server kiểm lại phiên/danh tính/quyền/con được liên kết trước khi gửi (token phải khớp `auth_sessions.user_id`/`membership_id`, không chỉ cùng `active`) nên không dựa vào client gỡ token để bảo mật. **Giới hạn:** push đã được FCM/OS nhận trước khi máy chủ ack thu hồi không thu hồi từ xa được; client xoá notification cũ khi đổi danh tính và không dùng payload làm quyền truy cập. Nhận push chỉ kích hoạt tải qua API, không ghi đè kho cục bộ từ payload. Lưu đề BTVN/điểm offline chỉ tạo sự kiện sau commit server; gửi phiếu/phát hành báo cáo vẫn cần mạng theo spec. Gộp đã chốt Q7: điểm chờ 5 phút sau server commit cuối, BTVN một lần giao (lệnh `homework.assign` chứa 1..4 phần mới và UUID chung), sửa nội dung đề đã giao không push. Chưa triển khai.

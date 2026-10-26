# Yêu cầu đổi file thuộc B-1 / dùng chung (worker ghi thêm dòng, Domain Lead chuyển cho B-1)

| Từ | File | Thay đổi | Lý do |
|---|---|---|---|
B-1 DONE r2-optional
| B-2b | worker/src/index.ts | Bỏ qua giới hạn JSON 256 KB cho `application/pdf`; cho phép route PDF đọc tối đa 5 MB và trả 413 nếu quá | Api-spec mục 0/8: middleware chung chặn mọi body trên 256 KB trước khi route PDF kịp áp giới hạn 5 MB |

### B-2a classes/sessions — scheduled integration (2026-10-21)
- Hàm sinh buổi đã export: `generateUpcomingSessions(db: D1Database, now?: Date): Promise<{ processed_classes: number; inserted_sessions: number; generated_until: string }>` từ `worker/src/db/session-generation.ts`. B-1 phụ trách nối `scheduled` vào `src/index.ts`/`wrangler.jsonc`.


### B-3 sync — yêu cầu tích hợp (2026-10-21)
- `worker/src/middleware/auth.ts` / `worker/src/db/identity.ts`: với `/v1/sync/*`, xác thực phiên/user/password trước, không buộc active membership còn hiệu lực hoặc đã được chọn; để `db/sync.ts::syncIdentity` kiểm `membership_id` rõ ràng thuộc user và đang active. Hiện middleware trả `403 account_disabled` khi active membership bị vô hiệu (hợp đồng sync yêu cầu `404`), và chặn queue của membership khác còn hợp lệ; sync đã chọn lại membership cục bộ sau middleware, nhưng không vượt được chặn trước route.
- `worker/src/db/sessions.ts`: khi hủy buổi làm thay đổi buổi chấm, phát lại `change_log` của các `homework_grade` chịu ảnh hưởng trong cùng batch để pull có thể ẩn/hiện kết quả đúng phiếu buổi chấm mới (api-spec 6.5). B-3 đã phát lại khi `slip.send` và khi lưu trữ bài kiểm tra (các score cần bị xoá khỏi cache phụ huynh).
- `worker/src/lib/http.ts`: kiểm body theo byte UTF-8 thay vì `text.length` để thực thi đúng trần 256 KiB với nội dung tiếng Việt; B-3 dùng helper chung theo quy ước, không sửa file ngoài quyền sở hữu.
- Fixture JSON trong `worker/tests/fixtures/sync/*.json` được offline-plan đề cập nhưng nằm ngoài danh sách file B-3 được sửa; các fixture hành vi hiện nằm trong `worker/tests/sync.test.ts`. Lead có thể xuất JSON cho hai client khi tích hợp.

### B-2c notifications / devices / FCM sender — yêu cầu tích hợp (2026-10-21)
- `worker/src/index.ts`: nối handler cron vào entrypoint. Thêm
  `export default { fetch: app.fetch, scheduled: (event, env, ctx) => ctx.waitUntil(runScheduledPush(env as unknown as FcmEnv)) }`
  (hoặc `export { app }` + `scheduled`); import `runScheduledPush` (alias của `runNotificationDispatch`) từ `./db/notification-dispatch`.
  Lý do: brief B-2c chỉ cho worker sửa file nhóm, `src/index.ts` thuộc B-1; nếu không nối, inbox/push không bao giờ được mở rộng/gửi.
- `worker/src/types.ts`: thêm vào `Env` hai trường tuỳ chọn `FCM_SERVICE_ACCOUNT?: string` (secret JSON service account) và
  `FCM_PROJECT_ID?: string`. Lý do: `Env` dùng chung chưa khai báo secret FCM; B-2c dùng tạm interface cục bộ `FcmEnv` trong
  `src/db/fcm-sender.ts` để không sửa file dùng chung.
- `worker/wrangler.jsonc`: thêm `"triggers": { "crons": ["* * * * *"] }` (một trigger/phút) và secret `FCM_SERVICE_ACCOUNT`
  (staging: `wrangler secret put FCM_SERVICE_ACCOUNT`), biến `FCM_PROJECT_ID`. Lý do: cron mở rộng inbox + gửi delivery cần lịch và
  credential FCM; chưa có secret thật nên test dùng khoá RSA sinh trong test.
- `worker/src/routes/index.ts`: không cần đổi (nhóm đã mount sẵn). Lưu ý thứ tự: `requireAuth` chạy trước, nên `/device-tokens`
  và `/notifications` đã chặn `must_change_password`/phiên sai trước khi vào tầng `db`.
| Lead | worker/src/index.ts | Mục 256 KB: B-2b yêu cầu ngoại lệ PDF (xem dòng trên) và lib/http.ts đếm byte UTF-8; chuyển cho B-1 sau khi B-3 xong | |

- B-3 cập nhật kiểm chứng: sync đã thêm kiểm byte UTF-8 cục bộ trong route; 17 test sync và typecheck toàn worker PASS. Yêu cầu helper chung ở trên vẫn dành cho endpoint khác; vẫn cần tích hợp middleware sync và replay khi hủy buổi theo mục trên.

### B-2b → B-3 sync — quy tắc ghi tests / điểm / BTVN / phiếu (2026-10-21)
- REST của B-2b chỉ cung cấp GET `/classes/{id}/tests`, `/tests/{id}/scores`, `/sessions/{id}/homework`, `/sessions/{id}/slips`; mọi ghi bài kiểm tra, nhập điểm, giao/chấm BTVN và soạn/gửi/sửa phiếu phải đi qua `/sync/push` theo `api-spec.md` mục 5.5/6.2.
- `test.create`: tên không rỗng, tối đa 100 ký tự; ngày `YYYY-MM-DD`; `max` mặc định 15, số nguyên 1..1000; id chưa dùng. `test.update`: chỉ cập nhật trường truyền vào, version khớp, không hạ `max` dưới điểm hiện có (`max_below_score`). `test.delete`: version khớp; xoá hẳn nếu chưa có hàng điểm, kể cả điểm null; lưu trữ nếu có điểm khác null theo quy tắc api-spec (xác nhận B-3 với lead nếu khác). Điểm phải nằm 0..max; `null` nghĩa là chưa có điểm; điểm lịch sử giữ qua trigger.
- `homework.assign`: 1..4 phần mới, kind duy nhất mỗi buổi; validate toàn bộ/quyền trước, tạo phần và inbox atomically theo command id, retry không giao/gửi trùng. `homework.section.upsert` kiểm version, buổi chưa hủy, một phần mỗi kind; delete trả `section_has_grades`; grade cho phép `excellent|done|not_done|null`, kể cả học sinh vắng buổi giao. Khi đọc, buổi chấm suy ra là buổi held kế tiếp trong cùng lớp.
- `slip.set`: sao 1..3 hoặc null, ghi chú tối đa 1000 ký tự; chỉ học sinh còn học vào ngày buổi; sửa sau gửi giữ trạng thái `sent`/`sent_at`. `slip.send`: tối đa 50 học sinh duy nhất; bỏ qua phiếu đã gửi/thiếu sao với lý do chuẩn, tạo notification và phát lại các hàng `homework_grade` vừa lộ ra cùng batch. Câu mẫu sao cố định phía client.

# B-3: Đồng bộ offline

Status: DONE_WITH_CONCERNS

## Đã làm
- `POST /v1/sync/push`: đủ 12 loại lệnh theo API 6.2 (điểm danh, điểm, tạo/sửa/xoá bài, phiếu, gửi phiếu, giao/sửa/xoá phần BTVN, chấm và giải quyết xung đột).
- UUID idempotent, receipt cùng batch từng lệnh, lệnh trước giữ commit khi lệnh sau lỗi; xử lý cạnh tranh UUID, CAS/version với tối đa 3 lần đánh giá; rejected được giữ kết quả để retry trả duplicate.
- Bốn loại ô giữ cả giá trị server/client; noop cho bản cũ giống giá trị hiện tại; xung đột mở được cập nhật, giải quyết server/client và `conflict_stale`.
- `GET /v1/sync/pull`: một batch/trang, JOIN theo khóa, cursor/limit/has_more, epoch, snapshot_required; xoá khỏi cache những khóa không còn hiện. Không N+1 theo dòng change_log.
- `GET /v1/sync/snapshot` và `/snapshot/:entity`: cursor trước tải trang, cửa sổ -90/+56 ngày, keyset; chiếu đủ thực thể theo vai trò và nhóm quyền.
- Dùng `db/authz.ts`; kiểm membership rõ ràng theo user (không dùng quyền active role cho queue), workspace/lớp/học sinh, phụ huynh chỉ đọc con và dữ liệu đã gửi/phát hành. Không gọi repository miền.
- Prefetch target đã biết trong một batch trước ghi, evict bảng chịu tác động, đọc mới cho dependency/CAS retry. Ghi inbox trong batch nghiệp vụ: điểm gộp 5 phút, BTVN một inbox/lần giao, gửi phiếu idempotent; không gọi FCM trong request.
- Phát lại homework_grade khi gửi phiếu; phát lại score khi bài được lưu trữ để pull loại khỏi cache phụ huynh. Push kiểm kích thước UTF-8 thực tế 256 KiB cục bộ.

## File sở hữu
`worker/src/routes/sync.ts`, `worker/src/db/sync.ts`, `worker/src/db/sync-read.ts`, `worker/tests/sync.test.ts`. Không sửa file nhóm khác, không commit/push/deploy hay tạo tài nguyên Cloudflare.

## Kiểm chứng
- `cd worker && npx vitest run tests/sync`: 17/17 PASS (lượt cuối 2,34 giây), gồm cạnh tranh cùng UUID khi gửi phiếu, giới hạn UTF-8 và sửa phiếu đã gửi.
- `cd worker && npm run typecheck`: PASS ở lượt chạy mới nhất; các lỗi tạm thời trước đó tại test của nhóm khác đã được chủ file sửa song song, B-3 không sửa hộ.
- Typecheck riêng source graph + sync test + helpers/env bằng TypeScript API, giữ nguyên compiler options từ `worker/tsconfig.json`: PASS. Lượt typecheck toàn bộ worker cũng đã xanh.
- Test chạy D1 cục bộ qua Cloudflare Vitest plugin với migrations thật; có retry mất ACK, cạnh tranh UUID, hai thiết bị, bốn loại xung đột, rollback lệnh nhiều phần, batch độc lập, các vai trò, workspace khác/phụ huynh khác/chưa login, thu hồi quyền/membership, đổi active role, cursor/epoch/floor/snapshot, ẩn/hiện phiếu và BTVN, lưu trữ và xoá bài, ràng buộc nghiệp vụ.

## Câu hỏi và yêu cầu tích hợp
- Đã append `briefs/backend-requests.md`: middleware/identity cần xác thực sync theo phiên/user và để membership rõ ràng được kiểm tại sync. Hiện active membership disabled/null vẫn bị middleware chung chặn trước route, nên ca đó chưa đạt mã 404/khả năng đồng bộ membership khác theo hợp đồng; sync cục bộ không thể vượt middleware khi không được sửa file đó.
- Đã yêu cầu nhóm sessions phát lại grade khi hủy buổi đổi buổi chấm; sync đã xử lý phát lại khi gửi phiếu.
- Helper JSON chung cần tính byte UTF-8 cho nhóm khác; sync đã có kiểm byte cục bộ. JSON fixture cho client nằm ngoài allowlist, giữ fixture trong test và yêu cầu lead xuất khi tích hợp.
- Mặc định đã theo Q5 (TA chỉ ghi điểm danh), Q6 (điểm REAL không ép bước), Q13 (title/description BTVN mặc định rỗng). Không có điểm trung bình, vắng thi hoặc tính năng ngoài MVP.
- API 6.1 nói receipt <=1 KiB nhưng `slip.send` tối đa 50 UUID và server_value của phiếu 1000 ký tự có thể vượt mức này; hiện giữ trọn kết quả ban đầu để duplicate đúng hợp đồng (schema không CHECK 1 KiB), cần lead làm rõ giới hạn mô tả.
- Chưa đo CPU 50 lệnh trên staging; không deploy theo brief.

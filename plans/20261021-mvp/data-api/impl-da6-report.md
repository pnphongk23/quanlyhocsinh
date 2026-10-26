# DA-6 · Web repositories (H5, H6-web, H7-changePassword)

## Đã làm
- **H5**: mọi ghi REST thành công (tạo/sửa/lưu trữ lớp, đổi lịch, tạo/sửa học sinh, tạo/sửa buổi lẻ, huỷ buổi, lưu nhận xét/phát hành báo cáo) đi qua `commitRemote` (`repositories/rest-cache.ts`): `await` ghi Dexie cùng khoá `identity|entity|id` như pull (bản có version thấp hơn bản đang lưu bị bỏ qua; phản hồi thiếu trường được gộp vào hàng cũ) → cập nhật bộ nhớ → `scheduleSync(0)`. Bỏ qua nếu đã đổi vai trò trong lúc chờ. Không có phiên/cache identity thì không ghi Dexie, không lên lịch kéo (test UI cũ mock `sync` không có `scheduleSync`).
- Đổi lịch lớp (`updateClassSchedule`, `...WithName`, dùng chung `changeSchedule`): bỏ dựng buổi bằng `crypto.randomUUID()`; sau `PATCH` gọi `syncNow()`. Số removed/added/retimed vẫn là ước tính từ preview.
- Gỡ khôi phục buổi: `setSessionStatus(id, "cancelled")` (kiểu + runtime, trạng thái khác ném "Buổi đã huỷ không thể khôi phục."). UI không còn import chỗ nào gọi khác; chỉ `cancelSession` (SessionsDesktop/SessionsTab/SessionDetailPage).
- **H6-web**: `createClass`, `createStudent`, `createSession`, `createExtraSession` gửi `id` UUID sinh một lần cho mỗi thao tác (`createOnce`, khoá theo identity + phạm vi + nội dung), giữ qua lần thử lại, xoá khi thành công hoặc `409 id_conflict` (ném "Không tạo được vì mã bị trùng. Hãy thử lại."). 200 = thành công; store không trùng id (thay thế theo id).
- Kiểm máy chủ cũ (mvp-backend `worker/src/routes/{classes,students,sessions}.ts`, `db/sessions.ts`): chỉ đọc các trường đã biết, **không từ chối `id` lạ** ⇒ gửi `id` an toàn; máy chủ cũ sinh id riêng và client dùng `remote.id`.
- **H7**: `changePassword` xong khi POST thành công; `GET /me` chạy nền, lỗi bị nuốt.
- Kiểu `id?` thêm vào body `POST /classes`, `POST /classes/{id}/students` (`api/client.ts`).

## File đổi
`src/data/repositories/{classes,students,sessions,reports,rest-cache}.ts`, `src/data/auth/index.ts`, `src/data/api/client.ts`, `src/test/rest-writes.test.ts` (7 test).

## Kiểm
- `npm run typecheck` xanh; `npm test`: 47 file pass, 350 test pass, 1 skip; `npm run build` xanh.
- Test mới: ghi REST còn sau `hydrateStore()` + đúng khoá Dexie; tạo học sinh gửi lại dùng cùng `id`; 200 lặp lại/song song ⇒ không trùng; `id_conflict` tiếng Việt; đổi lịch không tạo buổi cục bộ + gọi `syncNow`; huỷ buổi gọi API và còn sau hydrate; `setSessionStatus` từ chối khôi phục; đổi mật khẩu với `/me` lỗi vẫn thành công.
- Không ghi nhận được bước đỏ trước khi sửa: test viết sau khi sửa mã (không dùng stash/checkout để quay lại), nên chưa chứng minh đỏ→xanh.

## Rủi ro / còn lại
- `saveReport` vẫn chỉ tạo bản nháp trong bộ nhớ (không có REST); bản nháp chỉ bền sau `saveReportComment`/phát hành. Sau lưu nhận xét, id báo cáo trong bộ nhớ đổi sang id máy chủ.
- Phát hành: phản hồi không có `version`/publication id nên hàng `report` ghi tạm version cũ; `scheduleSync(0)` kéo bản đúng.
- Phụ thuộc DA-5 cho `syncNow` gộp yêu cầu khi đang chạy (nếu pull đang chạy trước PATCH, buổi mới có thể về ở vòng sau).

## Bổ sung: lỗi ghi cache sau REST thành công
- REST 2xx = thao tác thành công: `createClass`/`updateClass`/`createStudent`/buổi/báo cáo đều resolve, không ném lỗi vì cache (đã đúng từ `d6cc676`; test mới khoá lại cho lớp và học sinh).
- Đổi: không đặt lỗi ngay nữa. Cache lỗi ⇒ cập nhật bộ nhớ, `syncNow()` kéo bù, chỉ đặt trạng thái lỗi đồng bộ nếu sau đó bản ghi vẫn chưa có trong Dexie (`rest-cache.ts`).
- Thử lại tạo lớp khi phản hồi lần trước mất dùng lại cùng `id` (test), không trùng trong store; sau 2xx id được xoá nên tạo lần sau là thao tác mới.
- Test đỏ trên mã cũ: `createClass resolves when REST succeeds but the cache write fails...` đỏ vì trạng thái đã là `error` ngay lúc bắt đầu kéo bù. Các test còn lại (id tái dùng, resolve khi cache lỗi, updateClass, học sinh) đã xanh trên mã cũ, ghi để khoá hành vi chứ không đỏ.
- typecheck, `npx vitest run` (52 file pass, 372 test pass, 1 skip), build xanh.

## Bổ sung: lỗi ghi outbox bị nuốt (BTVN và các thao tác outbox khác)
- Nguyên nhân: các hàm ghi outbox đều **đồng bộ**, trả bản ghi ngay và gọi `void persistCommand(...).catch(() => {})`. Hàm đồng bộ không thể ném lỗi bất đồng bộ; đổi sang ném đòi hỏi đổi chữ ký sang `Promise`, mà UI (`src/features/**`, ngoài lane) và test của UI gọi chúng đồng bộ. Không đổi chữ ký có sẵn để khỏi gãy build/test của lane khác.
- Đã làm: thêm `saveHomeworkSectionDurable(input): Promise<HomeworkSection>` (`repositories/homework.ts`): dùng chung phần kiểm tra/dựng lệnh với `saveHomeworkSection`, `await persistCommand`; lỗi ghi ⇒ ném lỗi gốc và trả bộ nhớ về bản trước (xoá phần mới hoặc khôi phục phần cũ). `saveHomeworkSection` giữ nguyên hành vi cũ. **Lead UI cần đổi `HomeworkPanel.tsx:624` và `HomeworkDesktop.tsx:723` sang `await saveHomeworkSectionDurable(...)`** thì editor mới giữ lại khi lỗi.
- Test `src/test/homework-durable.test.ts` (3): persist lỗi ⇒ ném, bộ nhớ không có phần mới; sửa lỗi ⇒ giữ bản cũ; thành công ⇒ trả phần. Đỏ trên mã cũ vì hàm chưa tồn tại (không có đường ném lỗi).
- Cùng mẫu `.catch(() => {})` còn ở (chưa đổi, chờ quyết định đổi sang Promise cùng lane UI): `deleteHomeworkSection`, `setHomeworkGrade` (homework.ts), `saveAttendance` (attendance.ts), `saveScore` (scores.ts), `saveSessionComment` (comments.ts), `enqueue` của `createTest/updateTest/deleteTest` (tests.ts); `sendSessionTickets` (comments.ts) nuốt lỗi giao dịch Dexie tương tự. `persistCommand` đã đặt trạng thái lưu `error` khi lỗi nên các nơi này hiện báo lỗi qua trạng thái chung, không qua ném.
- typecheck, `npx vitest run`, build xanh.

## Bổ sung: biến thể `…Durable` cho các ghi qua outbox
Hợp đồng: ghi bền lỗi ⇒ ném lỗi gốc, bộ nhớ về đúng như trước (chỉ hoàn bản ghi liên quan), UI giữ editor để thử lại. Hàm đồng bộ cũ giữ nguyên hành vi (áp bộ nhớ, ghi bền ở nền, lỗi bị nuốt, trạng thái lưu báo `error`); cả hai dùng chung phần kiểm tra qua `repositories/durable.ts` (`runInBackground`, `runDurably`). Kiểm tra đầu vào vẫn ném đồng bộ trước khi chạm bộ nhớ; hàm `…Durable` trả Promise bị từ chối cho lỗi ghi bền và lỗi kiểm tra (do là `async`).

| Hàm cũ | Hàm mới | Chữ ký | Trả về | Lỗi ném |
|---|---|---|---|---|
| `saveHomeworkSection` | `saveHomeworkSectionDurable` | `(input) => Promise<HomeworkSection>` | phần bài tập | lỗi `persistCommand` (vd "Không lưu được vào bộ nhớ trên thiết bị.", "Đang đăng xuất, thử lại sau."); kiểm tra: huỷ buổi, trùng loại |
| `deleteHomeworkSection` | `deleteHomeworkSectionDurable` | `(id) => Promise<void>` | — | lỗi `persistCommand`; kiểm tra: không thấy, đã có kết quả chấm. Lỗi ghi ⇒ phần và điểm chấm trở lại |
| `setHomeworkGrade` | `setHomeworkGradeDurable` | `(sectionId, studentId, level \| null) => Promise<HomeworkGrade \| null>` | điểm chấm, `null` khi xoá | lỗi `persistCommand`; kiểm tra: không thấy, học sinh không thuộc lớp/ngày |
| `saveAttendance` | `saveAttendanceDurable` | `(input) => Promise<Attendance>` | bản điểm danh | lỗi `persistCommand`; kiểm tra: buổi chưa diễn ra/đã huỷ, giờ muộn sai |
| `saveScore` | `saveScoreDurable` | `(input) => Promise<Score>` | điểm | lỗi `persistCommand`; kiểm tra: thang, bước 0,5, lưu trữ, học sinh không thuộc |
| `saveSessionComment` | `saveSessionCommentDurable` | `(input) => Promise<Comment>` | phiếu | lỗi `persistCommand`; kiểm tra: học sinh không thuộc buổi |
| `createTest` | `createTestDurable` | `(input) => Promise<Test>` | bài kiểm tra | lỗi `persistCommand`; kiểm tra: tên, thang, lớp |
| `updateTest` | `updateTestDurable` | `(id, patch) => Promise<Test>` | bài sau sửa | lỗi `persistCommand`; kiểm tra: lưu trữ, tên/ngày/thang |
| `deleteTest` | `deleteTestDurable` | `(id) => Promise<"deleted" \| "archived">` | kết quả xoá | lỗi `persistCommand`; lỗi ghi ⇒ bài (và điểm nếu xoá hẳn) trở lại |
| `sendSessionTickets` | `sendSessionTicketsDurable` | `(sessionId, studentIds?) => Promise<SendTicketsResult>` | `{sent, skipped, queued, ungraded}` | lỗi giao dịch Dexie (`slips`+`outbox`); "Đăng nhập để gửi phiếu."; lỗi ghi ⇒ phiếu bỏ trạng thái chờ gửi. Thành công thì `scheduleSync()` |
| `saveAttendanceBatch` | `saveAttendanceBatchDurable` | `(inputs[]) => Promise<Attendance[]>` | các bản điểm danh theo thứ tự đầu vào | lỗi `persistCommand` của lệnh đầu tiên bị lỗi; kiểm tra cả lô trước khi áp (một em không hợp lệ ⇒ ném, không đổi gì). Lỗi ghi ⇒ bộ nhớ của CẢ lô về như trước |
| `setHomeworkGradeForAll` | `setHomeworkGradeForAllDurable` | `(sectionId, level) => Promise<number>` | số học sinh được chấm | như trên; "Không tìm thấy phần bài tập." ném đồng bộ khi phần không có |

Ghi chú: `sendSessionTickets` (cũ và mới) giờ kiểm tra đăng nhập trước khi đánh dấu chờ gửi (trước đây đánh dấu rồi mới ném). Lô (`composePlans` trong `durable.ts`): áp cả lô, ghi bền lần lượt, lỗi ở lệnh k ⇒ hoàn bộ nhớ của cả lô theo thứ tự ngược. Các lệnh đã vào outbox trước lệnh lỗi vẫn còn và sẽ đồng bộ; thử lại cùng ô điểm danh/chấm được gộp với lệnh đang chờ (cùng `cell_key`), nên không nhân đôi. Hàm lô đồng bộ cũ giữ nguyên.
Test: `src/test/durable-writes.test.ts` (14; thêm 2 test lô lỗi ở lệnh thứ hai + 1 test lô thành công): mỗi hàm một test lỗi ghi ⇒ ném đúng lỗi gốc + bộ nhớ không đổi (`deleteTest` cả hai nhánh, `setHomeworkGrade` cả ghi và xoá), 1 test hàm đồng bộ cũ vẫn chạy, 1 test thành công đại diện. Kiểm đột biến: bỏ bước hoàn bộ nhớ ⇒ 9 test đỏ. typecheck, `npx vitest run` (61 file pass, 445 test pass, 1 skip), build xanh.

## Bổ sung: gỡ các hàm đồng bộ cũ
- Đã xoá: `saveHomeworkSection`, `deleteHomeworkSection`, `setHomeworkGrade`, `setHomeworkGradeForAll`, `saveAttendance`, `saveAttendanceBatch`, `saveScore`, `saveSessionComment`, `createTest`, `updateTest`, `deleteTest`, `sendSessionTickets`. Bảng "Hàm cũ → hàm mới" ở trên giờ chỉ còn cột hàm mới là API hiện hành; tên `…Durable` giữ nguyên. `runInBackground` trong `durable.ts` đã gỡ (còn `runDurably`, `composePlans`).
- Không còn nơi nào trong mã production (`src/features/**`, `src/roles/**`, `src/app/**`, `src/shared/**`) gọi tên cũ (đã kiểm bằng tìm theo từ).
- Test trong `src/test/**` chuyển sang bản `…Durable` (await), giữ ý kiểm: `sync-schedule`, `sync-latency-measure`, `sync-two-devices-repositories`, `smoke-staging`. `durable-writes.test.ts` bỏ test "hàm đồng bộ cũ vẫn chạy" (chỉ kiểm hàm đã xoá).
- **ĐỎ do lane UI (không sửa được):** 4 file test trong `src/features/**` còn import tên cũ ⇒ typecheck/build và 5 test đỏ: `src/features/durableErrors.test.tsx:9,191` (`saveSessionComment`), `src/features/class-space/saveStatesDesktop.test.tsx:10,218-220` (`saveSessionComment`), `src/features/class-space/scoreGridTab.test.tsx:6,53,94` (`createTest`), `src/features/scores/testScoresPage.test.tsx:7,96` (`createTest`). Cách sửa: dùng `saveSessionCommentDurable`/`createTestDurable` với `await`.

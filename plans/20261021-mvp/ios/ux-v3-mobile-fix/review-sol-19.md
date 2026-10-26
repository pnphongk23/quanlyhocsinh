# Review 0593443..77cc153 — iOS

Phạm vi: 8c84576, 0bdc414, 77cc153; chỉ đọc mã/diff, không simulator, không xcodebuild. Không sửa mã nguồn.

## Findings

### Medium — Sau send thành công, cache được đánh dấu sent bằng nội dung/version cũ

`ios/QuanLyLop/Features/Scores/ScoresFeatureStore.swift:415-418,456-470` bỏ sync đầu nếu outbox trống, rồi tự ghi `status = sent` nhưng giữ `slip.version`, criteria/comment/note đang có trên máy. Khi không defaults và tất cả được gửi, không pull sau gửi.

Tái hiện bằng luồng mã: máy A giữ draft version 1/note A; máy B sửa cùng draft thành version 2/note B; outbox A trống; A gửi. Server đọc row hiện tại, gửi note B và tăng version thành 3; A ghi sent với note A/version 1 và trả thành công. Ngay cả chỉ một máy, version sau send vẫn cũ. `slip.send` không kiểm tra base_version và không trả bản ghi phiếu nên response sent[] không đủ chứng minh local là bản thật.

Bằng chứng backend hiện có ở worktree mvp-backend: `worker/src/db/sync.ts:372-395` đọc row server và UPDATE version=version+1; `:404` chỉ trả sent/skipped. Hợp đồng API mục 6.2 cũng không trả từng row/version. Local sẽ lệch tới lần sync sau; chưa thấy bằng chứng server bị ghi sai chỉ bởi send này, nên không nâng High. Khắc phục đơn giản: pull sau applied, hoặc bổ sung response có các row authoritative rồi cache chúng.

## Các nhánh đã rà

- Bulk assign: `ScoresFeatureStore.swift:375-390` refresh, kiểm tra sent và sendingSessionIDs trước khi tạo batch; không có await trong vòng tạo entries. `SQLiteStore.swift:180-223` dùng một transaction cho cả records/outbox, coalesce chỉ pending attempts=0, giữ command đã tới transport; lỗi rollback qua `:106-114`. Không tìm thấy regression chắc chắn làm mất lệnh, ghi đè phiếu đã gửi đang có trong cache hoặc rollback một phần. Không coi việc bảo vệ against cập nhật từ thiết bị khác là đảm bảo atomic: guard là local, không phải CAS server.
- Send/outbox: vẫn kiểm tra pending lần hai tại `:421-423` theo recordKey của các phiếu được chọn; queuedCommands bao gồm cả pending/sending/rejected (`SQLiteStore.swift:225-231`). Chưa thấy diff làm mất guard này. Hai chỗ try? bỏ lỗi đọc store là hành vi cần thận trọng nhưng chưa đủ bằng chứng để báo lỗi dữ liệu mới từ diff.
- PATCH buổi lẻ: `TeacherFeatureData.swift:235-244` gửi đúng sessions/id, PATCH, date/start_time/note/base_version và cache response class_session; WireJSON dùng convertToSnakeCase. `TeacherSessionsView.swift:354-358` chọn edit/add đúng theo session. Day/time dùng cùng timezone máy với picker mặc định; các mốc sau nửa đêm VN đã có assertion. Không tìm được lỗi chắc chắn trong body, cache hoặc nhánh add/edit.

## Độ nhạy của test (đánh giá tĩnh, chưa chạy mutation)

- Test PATCH kiểm tra method/path/body/base_version và cache response; revert về POST sẽ làm assertion method/path đỏ nếu test còn biên dịch. Test day có mốc UTC trước ngày VN, bắt được lỗi UTC khi helper được dùng. Chưa có test gọi save của sheet để bắt riêng lỗi nối nhánh UI.
- Test bulk 20 em bắt được việc quay về sync từng em qua số push; test offline bắt số command. Test rollback thực sự đặt phần tử lỗi sau phần tử hợp lệ, kiểm tra cả records lẫn commands; bỏ transaction ngoài batch sẽ làm assertion đỏ nếu vẫn dùng writeRecord như hiện tại.
- Test sent/in-flight có fixture draft đối chứng và guard checks, nhưng không kiểm tra interleave bên trong actor/store.
- CountingAPI (`SendSlipsTests.swift:550-584`) chỉ trả sent[] và pull rỗng, không có trạng thái server/version/nội dung độc lập. Vì vậy test zero-pull xanh dù lỗi Medium trên vẫn tồn tại; assertion no-pull còn bắt buộc chính hành vi gây stale cache. Cần test server draft mới hơn local, gửi thành công rồi assert nội dung/version local khớp row server; thêm trường hợp một máy version tăng sau gửi.

## Xác minh và giới hạn

Đã đối chiếu git diff, nhánh ghi SQLite, sync coordinator, UI edit/add, hợp đồng API và mã slip.send backend hiện tại. Backend worktree là tham chiếu hiện tại, không nằm trong diff iOS được review. Không chạy test hoặc mutation test theo phạm vi chỉ đọc; các nhận định test đỏ là suy luận trực tiếp từ assertion, không phải kết quả thực thi. Tôi không thể xác minh điều này hoạt động vì yêu cầu cấm simulator/xcodebuild và review này chỉ kiểm tra tĩnh.

Status: DONE | Summary: 1 Medium về cache sau send; bulk/PATCH chưa thấy lỗi chắc chắn; test thiếu server-state regression | High: không có.

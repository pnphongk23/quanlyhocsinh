# Review hẹp iOS · phát hiện 2 của sol-12 · vòng 13

**Status: CHƯA ĐẠT** để khép phát hiện 2. **Summary:** Commit `5227fe8087cd29bd0e52c9673c6853069c6b240b` đã đóng khe kiểm-rồi-ghi giữa hai SQLiteStore theo phân tích tĩnh; test mới chưa điều khiển xen kẽ tại ranh giới nên chưa đáp ứng phần kiểm chứng hồi quy đã yêu cầu.

## Phạm vi và bằng chứng

Chỉ review phát hiện 2 tại `review-sol-12.md:21-39` và mã của commit `5227fe8` bằng `git show`, gồm diff, SQLiteStore, GuardianDeletedReportTests và đoạn gọi writeFetched trong GuardianReportHistory. Dòng dẫn dưới đây thuộc snapshot commit này, không lấy mã worktree làm bằng chứng. Đã dùng `srcwalk guide` và srcwalk để đọc báo cáo trước; dùng git show cho mã nhằm giữ đúng commit được giao. Không sửa code, không build/test/simulator, không đọc staging-demo.txt hay env/creds. Review hoàn tất trong giới hạn 10 phút.

## Kiểm cơ chế nguyên tử: đạt qua đọc mã

- **DB đã có sẵn / migration:** `Core/Storage/SQLiteStore.swift:60-76` chấp nhận user_version 0 và 1, luôn chạy CREATE TABLE IF NOT EXISTS removed(scope,key) bên trong BEGIN IMMEDIATE rồi COMMIT. CREATE không bị giới hạn vào nhánh version 0, nên DB version 1 cũ vẫn được thêm bảng. Giữ user_version=1 không bỏ qua thay đổi này; mở lại không xoá các dấu có sẵn. PRIMARY KEY(scope,key) phân tách scope và chống dấu trùng.
- **Apply / tombstone / cursor:** `:310-324` gói upsert, gỡ dấu đúng key, DELETE record, INSERT OR IGNORE dấu xoá và setPosition trong cùng transaction. Dấu được ghi cả khi DELETE không tìm thấy record. Nếu một key có cả upsert lẫn deleted trong cùng page, vòng deleted chạy sau nên kết quả là xoá và có dấu. Không còn cửa sổ COMMIT xong mới đặt dấu trong RAM.
- **Fetched write và chủ sở hữu:** `:330-341` encode trước transaction, sau đó kiểm `[key] + owners` và INSERT trong cùng transaction. Transaction helper bắt đầu bằng BEGIN IMMEDIATE (`:106-113`), trước mọi SELECT dấu. `Features/Guardian/GuardianReportHistory.swift:47-50` truyền publication key cùng report owner. Vì vậy dấu publication hoặc dấu report đều chặn ghi.
- **Hai connection:** nếu apply giữ write transaction trước, writeFetched chỉ kiểm dấu sau khi apply đã commit; nếu writeFetched giữ trước, apply không thể chen giữa SELECT dấu và INSERT, và khi apply chạy tiếp nó xoá publication đã ghi. Đây là suy luận từ ranh giới transaction, không phải kết quả chạy thực tế. Mỗi connection đặt busy_timeout 3000 ms (`SQLiteStore.swift:12-18`); hết thời gian chờ thì lỗi được ném ra, không tiếp tục INSERT không được bảo vệ.
- **Đường lỗi / lock:** statement được finalize bằng defer sau prepare thành công (`:24-26`); lỗi bind/step được ném ra. Init và transaction helper bắt lỗi trong body hoặc COMMIT rồi thử ROLLBACK và ném lại (`:62-76,106-113`). Nhánh writeFetched trả false vẫn đi qua COMMIT trong helper. Lỗi encode/decode xảy ra trước BEGIN; BEGIN thất bại không chạy body. Không thấy đường lỗi thông thường bỏ transaction mở. ROLLBACK là best effort (`try?`); chưa có kiểm chứng lỗi I/O/rollback thực tế.
- **Dọn dấu:** resetCache (`:346-351`) và installSnapshot (`:364-372`) xoá removed theo đúng scope trong cùng transaction với records/meta hoặc snapshot mới. resetCacheForUser (`:353-361`) lọc prefix user có độ dài UTF-8, rồi xoá dấu bằng scope chính xác; với dấu do apply tạo, meta cùng scope cũng đã được ghi nguyên tử nên nằm trong tập scope được quét.

## Phần còn thiếu của chính phát hiện 2: test chưa ép xen kẽ (Vừa)

`QuanLyLopTests/Guardian/GuardianDeletedReportTests.swift:126-150` thực sự mở hai store trên cùng file/scope và kiểm kho lẫn dashboard ở cả hai store. Tuy nhiên dòng 139-141 await apply hoàn tất rồi mới gọi writeFetched. Ca `:152-168` làm thứ tự ngược lại: await writeFetched hoàn tất rồi mới apply (`:161-163`). Không có latch/hook ở sau kiểm dấu và trước INSERT, không có hai thao tác đang tranh transaction.

Hai thứ tự tuần tự này cũng phù hợp với cơ chế DeletedRecordMarks.shared trước commit: apply xong thì Set đã có dấu; write xong rồi apply thì record bị xoá. Vì vậy qua đọc mã, cả hai test đều không phân biệt được bản sửa này với bản còn khe ở sol-12. Đây là thiếu bằng chứng hồi quy, không phải khẳng định khe cũ vẫn tồn tại trong transaction mới.

Để khép phát hiện: thêm một test hai connection cùng file/scope có điểm điều khiển tại ranh giới guard/INSERT để ép apply cạnh tranh với fetched write; kiểm cache/dashboard cuối cùng và chứng minh test phát hiện cơ chế kiểm-ngoài-transaction cũ. Ca hiện có chưa kiểm riêng owner-only tombstone giữa hai store, cũng chưa kiểm contention/rollback hoặc nâng cấp DB version 1 cũ.

backlog: resetCacheForUser chưa UNION scope từ removed (`SQLiteStore.swift:355`); cân nhắc phủ trạng thái chỉ còn removed mà không có records/meta để tránh phụ thuộc invariant này, chưa xác lập lỗi mức Cao trong phạm vi review.

## Kết luận

**CHƯA ĐẠT** phần khép phát hiện 2 vì thiếu test xen kẽ bắt đúng khe cũ. Cơ chế sửa trong mã **đạt phân tích tĩnh** về tính nguyên tử giữa apply và writeFetched trên cùng file/scope; không phát hiện lỗi mức Cao trong phạm vi đã giao. Tôi không thể xác minh điều này hoạt động ở runtime vì nhiệm vụ reviewer chỉ đọc và cấm chạy build/test/simulator.

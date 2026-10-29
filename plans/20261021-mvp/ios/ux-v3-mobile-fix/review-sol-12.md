# Review cuối hẹp iOS · kiểm lại 4 phát hiện sol-11 · vòng 12

**Kết luận: CHƯA ĐẠT.** Phát hiện 1, 3, 4 đã sửa nguyên nhân qua đọc mã. Phát hiện 2 mới chặn được trường hợp tombstone hoàn tất trước khi GET kiểm guard; vẫn còn khe kiểm-rồi-ghi giữa hai SQLiteStore thực tế. Đây là phần chưa khép của phát hiện 2 mức Vừa đã có, không phải phát hiện mới. Không có phát hiện mới mức Cao đủ bằng chứng.

## Phạm vi và bằng chứng

- Đọc đúng 4 commit `ee9e284`, `4f9eeae`, `0fbdf35`, `c06d7c6`; diff `7f2d4b6..c06d7c6` gồm 7 file. HEAD: `c06d7c6c2f010123a06582e87595568981e419db`. Các vị trí iOS bên dưới thuộc HEAD này.
- Đọc sol-11, toàn bộ spec/architecture worktree; đối chiếu spec main mục nhận xét và contract-changes như nguồn của review trước. Không dùng spec 3 sao cũ của worktree để mở lại phạm vi nghiệp vụ đã chốt.
- Đọc backend `mvp-backend/worker/src/db/sync.ts:202-209`, HEAD `4f24c60`; file không có thay đổi chưa commit. Chỉ đối chiếu mã, không gọi staging/backend.
- `git diff --check 7f2d4b6..c06d7c6`: exit 0, không có output. Bốn file Resources bẩn sẵn vẫn nguyên danh sách; không sửa mã, không add/commit/push. Không đọc staging-demo.txt hay env/credential. Chỉ ghi báo cáo này một lần.
- Không chạy build, test, simulator hoặc mutation test theo yêu cầu. Những đánh giá “test bắt lỗi” dưới đây là đối chiếu fixture/assertion với mã trước/sau, không phải báo cáo test đã chạy.

## 1. Sync lỗi sau trang xoá — ĐÃ SỬA nguyên nhân

**Mã:** `ios/QuanLyLop/Features/Auth/AuthService.swift:383-398` đặt tăng `syncRevision` trong `defer` ở cả retrySync và synchronizeWhileActive, sau guard có activeSync. Vì vậy một lần synchronize đã áp trang đầu nhưng throw ở trang sau vẫn đổi revision. `Core/Sync/SyncCoordinator.swift:176-190` vẫn commit từng trang; `Features/Guardian/GuardianRootView.swift:91-93,294-298` nghe revision và đọc lại SQLite, không thêm một lượt API/sync vào callback. Đường ẩn báo cáo mở vẫn nhận child mới qua `GuardianRootView.swift:191-192`.

**Test có bắt lỗi:** `ios/QuanLyLopTests/Guardian/GuardianDeletedReportTests.swift:141-170` dựng AuthModel thật với store đã có publication và cursor 0. API trả trang xoá hasMore=true cho cursor 0; cursor 1 không có route nên RouteAPI throw offline (`Tests/Reports/ReportRemoteLoadingTests.swift:149-156`). restoreSession chỉ chuẩn bị store/coordinator (`AuthService.swift:175-183,562-568`), không chạy pull trước khi lấy revision ban đầu. Assertion kho rỗng và revision tăng sẽ bắt lại nhánh chỉ tăng khi sync thành công ở mã cũ.

**Giới hạn và hồi quy:** Test chưa render SwiftUI/onChange và chưa gọi retrySync; ca reload dashboard có sẵn ở dòng 87-103 kiểm phần đọc lại cache. Qua mã không thấy hồi quy rõ ràng: sync thất bại trước khi đổi cache cũng gây đọc lại cache một lần, không tạo vòng lặp tải mạng.

## 2. GET publication trả trễ sau tombstone — CHƯA SỬA kín nguyên nhân (Vừa, còn lại từ sol-11)

**Đã sửa được:** `Features/Guardian/GuardianReportHistory.swift:47-50` đi qua writeFetched, kiểm cả publication key và report owner. `Core/Storage/SQLiteStore.swift:51-62,333-341` chia sẻ mark theo scope giữa các instance và đặt mark cả khi publication chưa tồn tại. Khi tombstone đã hoàn tất trước khi writeFetched bắt đầu, GET cũ không ghi lại được. Upsert có thể gỡ mark đúng key.

**Khe còn lại:** Kiểm mark tại `SQLiteStore.swift:348-350` và ghi record tại `:187-198` không nằm trong cùng một khóa/transaction dùng chung với apply. NSLock chỉ bảo vệ thao tác trên Set, đã nhả khi contains trả về (`:59-61`); apply commit DELETE/cursor rồi mới cập nhật Set (`:323-341`). Actor chỉ tuần tự hoá từng instance. Đây là đường thực tế: AuthModel mở store riêng (`AuthService.swift:158-170,562-568`), GuardianRepository.load mở store khác (`GuardianRepository.swift:458-474`); SQLiteStore.open tạo connection mới vào cùng core.sqlite (`SQLiteStore.swift:102-109`). SyncRunGate chỉ bao synchronize, không bao GET/writeFetched sau sync (`GuardianRepository.swift:476-484`; `SyncCoordinator.swift:13-27,92-101`).

**Thứ tự cụ thể còn làm publication sống lại:**

1. GET publication P đang bay trên store A; phản hồi tới, A kiểm contains và nhận false.
2. Trước khi A bắt đầu transaction ghi, store B của sync nền commit DELETE P + cursor, rồi đặt mark P.
3. A tiếp tục writeFetched theo kết quả kiểm cũ, INSERT P mà không kiểm lại mark trong transaction. SQLite tuần tự hoá hai transaction nhưng không bảo vệ phép kiểm trước transaction. P lại có trong kho dù mark vẫn còn và cursor xoá đã tiến.

Không cần một await trong writeFetched để thứ tự này xảy ra: hai actor/connection khác nhau có thể chạy đồng thời. Còn một cửa sổ tương tự giữa COMMIT của apply và vòng đặt mark. Đây là suy luận từ ranh giới khóa/transaction và đường tạo store, **chưa tái hiện runtime**.

**Test có bắt lỗi:** Test latch ở `GuardianDeletedReportTests.swift:106-122` thực sự giữ GET, apply tombstone rồi mới release GET; bỏ guard publication sẽ làm assertion cache rỗng thất bại qua đọc mã. Tuy nhiên test dùng cùng một store và đợi apply xong hoàn toàn, nên không phủ hai instance hoặc xen kẽ giữa contains và write. Test dòng 125-138 phủ việc gỡ mark khi upsert, chưa kiểm owner-only tombstone, scope khác hay dashboard sau GET trễ.

**Cần để khép phát hiện:** Chọn một cơ chế nguyên tử cho tombstone và fetched write theo scope: ví dụ lưu tombstone trong SQLite và kiểm trong cùng transaction ghi, hoặc tuần tự hoá toàn bộ apply/kiểm/ghi bằng một gate chung. Thêm ca hai store dùng cùng file/scope và điều khiển xen kẽ tại ranh giới kiểm-ghi; kiểm cả kho lẫn dashboard. Chỉ thêm lock cho Set hoặc nhờ SyncRunGate hiện tại chưa đủ.

**Hồi quy:** Không thấy hồi quy rõ ràng khác trong phạm vi; vấn đề ở đây là khe còn sót của chính nguyên nhân cũ.

## 3. Đếm 300 bằng Character thay vì UTF-16 — ĐÃ SỬA nguyên nhân

**Mã:** `Core/Models/SlipRules.swift:49-55` dùng utf16.count sau trim. Counter (`SessionCommentsView.swift:569-580`), điều kiện nút Lưu (`:443-445`) và guard save (`:688-697`) đều dùng helper chung. normalizedComment giữ nguyên nội dung sau trim (`SlipRules.swift:43-46`), không tự NFC hoặc cắt prefix. Đơn vị đếm khớp JavaScript comment.length sau trim ở backend `worker/src/db/sync.ts:207-209` cho các chuỗi ASCII/emoji/NFC/NFD được chỉ ra trong sol-11.

**Test có bắt lỗi:** `Tests/Core/SlipRulesTests.swift:68-93` có ASCII 300/301 và khoảng trắng ngoài chuỗi; emoji 2 đơn vị, 150 emoji = 300, thêm a = 301, 151 emoji = 302; tiếng Việt NFC 1 đơn vị so với NFD 3 đơn vị, NFD 100/101 lần = 300/303. Các expected length và ca vượt này phân biệt được mã Character cũ, không chỉ gọi helper với ASCII. Chưa kiểm UI bằng thực thi.

**Hồi quy:** Không thấy hồi quy rõ ràng trong phạm vi. Emoji/NFD đạt giới hạn với ít Character hơn là hệ quả đúng của đơn vị backend hiện hành.

## 4. Heuristic dán làm mất nội dung thay thế — ĐÃ SỬA nguyên nhân; test hồi quy chưa đủ

**Mã:** `SessionCommentsView.swift:524-525` gán nguyên giá trị mới vào commentOverride; hàm acceptingCommentEdit đã bị bỏ khỏi SlipRules. Không còn nhánh suy đoán paste từ delta độ dài hay chặn thay chuỗi 340 bằng 400. Counter đỏ và chặn cả nút Lưu lẫn save() vẫn còn (`:443-445,569-580,688-697`). Theo hướng được giao cho commit này, mọi lần gõ/dán đều giữ nội dung, kể cả vượt 300, để người dùng sửa trước khi lưu.

**Test có bắt lỗi:** `Tests/Core/SlipRulesTests.swift:96-104` chỉ kiểm isCommentTooLong và normalizedComment trên các chuỗi 301/400 đã tạo sẵn. Không đưa old/new qua binding, không mô phỏng chọn vùng rồi dán, không kiểm counter/nút Lưu. Vì vậy nếu đưa binding heuristic cũ trở lại, test này vẫn có thể qua; không coi tên test là bằng chứng nó bắt được lỗi dán thay thế. Việc sửa được xác nhận qua đọc binding trực tiếp, chưa được chứng minh bởi test tương tác.

**Hồi quy:** Không thấy mất nội dung hoặc lọt đường Lưu rõ ràng qua mã. Việc cho gõ tiếp khi quá dài là hành vi chủ đích của commit được giao, không mở thành phát hiện mới.

backlog: Bổ sung test tương tác binding/counter/Lưu cho dán thay vùng chọn, test retrySync + SwiftUI rebuild, và đổi vòng Task.yield chờ latch không giới hạn thành chờ có tín hiệu/timeout; không mở phát hiện mới mức Vừa/Thấp trong lượt này.

## Kết luận

**CHƯA ĐẠT — còn phát hiện 2 mức Vừa của sol-11 do phép kiểm tombstone và ghi fetched record chưa nguyên tử giữa các SQLiteStore.** Ba nguyên nhân còn lại đã sửa qua bằng chứng mã; test mới cho 1 và 3 có assertion phân biệt mã lỗi cũ, test 2 bắt được thứ tự delete-hoàn-tất-trước-GET, test 4 chưa bắt trực tiếp lỗi binding.

**Tôi không thể xác minh điều này hoạt động vì lượt review được yêu cầu chỉ đọc, không chạy build/test/simulator.** Không khẳng định các test đã pass hoặc race đã được tái hiện bằng thực thi.

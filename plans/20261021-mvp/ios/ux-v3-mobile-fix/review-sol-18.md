# Review c4060d1 · Brief 97

Kết luận: không tìm thấy High đủ bằng chứng để chặn commit. Review chỉ đọc; không sửa code.

Đối chiếu `git show c4060d1`, spec tại `f288311:docs/spec.md` và brief 97. HEAD đúng c4060d1.

## High

Không có finding đã xác nhận.

## Medium / Low (không chặn)

1. **Medium — Test bảo vệ phiếu đã gửi/đang gửi có thể xanh giả.** `ios/QuanLyLopTests/Scores/SendSlipsTests.swift:244` và `:257`. Cả hai dùng `seededStore()` chỉ seed bảng slip (dòng 15–24), không seed student. Nếu bỏ kiểm tra trạng thái sent hoặc `sendingSessionIDs` trong `ScoresFeatureStore.swift:364–367`, bước tìm student vẫn thất bại và bỏ qua ghi. Assertion không có `slip.set` vẫn đạt; test sent còn chỉ kiểm tra status, không kiểm tra tiêu chí/câu/note giữ nguyên. Vì vậy các test này chưa chứng minh được bảo vệ trước ghi đè. Cần seed student tương ứng, thêm đối chứng draft thực sự ghi được, rồi bỏ riêng từng guard để xác nhận test đỏ. Đây là khoảng trống test có sẵn, không phải bằng chứng có ghi đè ở bản hiện tại.

2. **Medium — Test offline mới không đỏ khi bỏ phần fix tạo phiếu.** `ios/QuanLyLopTests/Scores/SendSlipsTests.swift:299`. Test tự dựng `DefaultSlip` rồi gọi `saveDefaultSlips`, bỏ qua `CommentsRules.defaultSlips` là nơi commit sửa để đưa em chưa có phiếu/chưa điểm danh vào danh sách. So sánh git xác nhận toàn bộ hàm `saveDefaultSlips` giống hệt parent; do đó revert riêng phần planner vẫn không bị test này bắt. Unit test planner có bao phủ danh sách mới, nhưng ca offline tích hợp nên lấy plan từ roster thực, lưu, rồi kiểm tra outbox và số phiếu gửi được.

Low: không có finding cần nêu thêm.

## Bằng chứng luồng chính

- Thẻ: `SessionCommentsView.swift:171–186` chỉ vẽ sao khi phiếu có stars; nhánh còn lại dùng caption “Chưa nhận xét”.
- Gán mặc định: `CommentsRules.swift:96–102` chọn mọi dòng chưa gửi, không phụ thuộc điểm danh; BTVN đi qua `openingCriteria`, giữ note. `ScoresFeatureStore.swift:362–370` đọc lại trạng thái, bỏ qua session đang gửi và phiếu sent, lưu criteria + câu tự sinh + `hw_manual=false` qua `saveSlip`; `:348–351` ghi row cùng outbox `slip.set`.
- Gửi cả lớp: `CommentsRules.swift:69–70` chỉ chọn phiếu đã tồn tại, chưa gửi; view dùng cùng tập này cho số đếm và IDs (`SessionCommentsView.swift:192`, `:209`, `:348–350`). `sendDefaults` không tạo default cho nil slip (`CommentsRules.swift:85–86`). Gửi đi thẳng API, không enqueue `slip.send`; pending edits phải đồng bộ trước (`ScoresFeatureStore.swift:393–399`, `:415–425`).
- Lưu ý giới hạn phòng vệ: `ScoresFeatureStore.swift:395` tự nó vẫn nhận ID không có phiếu vì optional nil khác sent; UI cả lớp đã lọc ở trên nên chưa xác định được kịch bản lỗi người dùng để nâng thành High.

## Kiểm chứng và giới hạn

Đã kiểm tra diff, đọc các nhánh thực thi/call site và chạy script assertion chỉ đọc: xác nhận `saveDefaultSlips` không đổi so với parent và fixture của hai test sent/in-flight thiếu student. Script trả PASS. Không chạy simulator, xcodegen, XCTest hoặc tạo artifact khác trong lượt review chỉ đọc này; chưa được cấp lượt simulator theo brief. Tôi không thể xác minh điều này hoạt động trên thiết bị hoặc toàn bộ XCTest vì chưa chạy các kiểm tra đó. Nhận định mutation ở trên dựa trên điều kiện nguồn và fixture, chưa phải kết quả chạy mutation test.

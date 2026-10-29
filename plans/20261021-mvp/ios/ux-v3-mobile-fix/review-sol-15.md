# Review vòng 2 · Brief 94

Commit `9c30102` (git show); chỉ kiểm ba phát hiện Cao vòng 1.

1. **Cao — (1) chưa đóng hoàn toàn.** `Entities.swift:160` nhận thiếu `note` đúng; `SlipRulesTests.swift:144` bao phủ JSON PH thang 5. Nhưng `Core/Models/SlipRules.swift:60` vẫn bỏ `comment` của thang 3. Payload PH thang 3 có câu+note trong `comment`, không có `note`: decoder đặt note rỗng, `GuardianTicketView.swift:30–35` chỉ hiện template, mất ghi chú. Đây là phần chưa sửa của lỗi cũ, vẫn chặn. Thiếu test JSON PH thang 3 và kiểm nội dung hiển thị.

2. **(2) sửa đúng.** `HomeworkRules.swift:68–77` giữ criteria khi sent hoặc hw_manual=true; draft tự theo chấm BTVN. `HomeworkRulesTests.swift:198–215` bao phủ sent, draft, manual=true và phiếu mới. Không thấy hồi quy Cao ở các nhánh này qua đọc mã; chưa có test tích hợp sent→chấm lại→lưu-note.

3. **(3) sửa đúng.** `SessionCommentsView.swift:597–599,743–749` giữ câu tay, chọn noteOnly khi chưa chạm tiêu chí. `ScoresFeatureStore.swift:315–336` chỉ gửi định danh+note, giữ criteria/comment/hw_manual và trạng thái. `SendSlipsTests.swift:88–112` kiểm payload chỉ-note, câu tay, criteria và cờ true; nil cũng giữ true. Fixture là draft, chưa bao phủ sent.

Backlog **Vừa**: offline, draft được chấm lại có thể hiện bit BTVN mới nhưng câu lưu cũ (`openingCriteria` so với `shownSentence`); cần test sheet trước/sau đồng bộ.

Kiểm chứng: git show --check sạch; bốn file M giữ nguyên. Tôi không thể xác minh điều này hoạt động vì lượt này cấm xcodebuild/simulator; chưa chạy XCTest, kết luận dựa trên đối chiếu mã/test/contract.

Status: DONE_WITH_CONCERNS


## Quyết định của Lỗ Túc

Bác bỏ phát hiện Cao (1) phần thang 3: backend `worker/src/db/slip-view.ts` chỉ ghép `comment` + `note` và xoá `note` khi `scale === 5`; thang 3 giữ `comment` và `note` riêng cho phụ huynh (contract-changes.md, Brief 94: "Thang 3 giữ nguyên"). iOS giữ hiển thị thang 3 như cũ là đúng. Phần thang 5 của (1) đã sửa đúng. Không còn phát hiện Cao mở.

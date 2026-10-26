# Backlog iOS (chưa sửa)

## Thấp: sheet phiếu nháp hiện "Chưa lưu" ngay khi mở sau khi chấm lại BTVN
- QA thấy ở lớp AAA-QA-a405a7-HW (HS2/HS3). Chưa tái hiện, chưa rõ phiếu có tồn tại trước khi chấm lại không.
- Đọc code: `hasUnsavedChanges` (`SessionCommentsView.swift`, `I4TicketSheet`) lúc mở chỉ đúng khi `slip == nil`, vì `criteria`/`initialCriteria` cùng lấy từ `openingCriteria`, `note` và `sentenceEdited` đều ở giá trị đầu.
- QA xác nhận (HS2, ảnh `qa-b96/64-s3-hs2-slip.png`): HS2 chưa có phiếu nào (thẻ "Chưa mở phiếu · gửi kèm phiếu 5 sao mặc định"). Vậy `slip == nil`, đúng với đọc code: phiếu mặc định chưa lưu nên sheet báo "Chưa lưu" và có nút Lưu. Đây là hành vi đã định, không phải lỗi chấm lại; chỉ chưa rõ có cần đổi chữ hay không.
- Chưa mở HS3 sau khi HS2 được chấm; nếu cần thì QA kiểm khi có lượt.
- Nếu GL muốn khác: sheet chỉ báo "Chưa lưu" khi người dùng đã đổi gì, hoặc đổi nhãn khi chưa có phiếu. Cần quyết định sản phẩm.

## Từ sol-16 và các lượt trước
- Chấm điểm và phiếu trong cùng một transaction.
- Guard đang gửi sau `await refresh()`.
- Thiếu fixture test; test hết hạn Retry-After; test tích hợp thang 3.
- Dynamic Type của lưới 2 cột; đồng bộ chấm lại nháp offline; phạm vi UNION của `resetCacheForUser`; test hai store xen kẽ.
- README tokens chưa có dòng `dialog-action-gap`.

## Sau khi gửi phiếu không pull (sol-19, Medium, chưa sửa)
`sendSlips` (77cc153) bỏ pull khi không có defaults và gửi đủ. Nếu thiết bị khác vừa sửa phiếu, máy chủ gửi bản mới và tăng version, còn cache iOS giữ nội dung/version cũ tới lần đồng bộ sau (hiển thị lệch bản phụ huynh nhận). Cách sửa nếu cần: pull sau gửi khi version local lệch, hoặc để máy chủ trả nội dung đã gửi. Test hiện chưa kiểm tình huống này. Chi tiết: review-sol-19.md.

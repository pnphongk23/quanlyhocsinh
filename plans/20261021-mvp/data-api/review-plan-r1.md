# Review kế hoạch r1 (codex/gpt-6-luna high, `877c0857`) — APPROVE_WITH_CHANGES

| # | Mức | Phát hiện | Xử lý |
|---|---|---|---|
| 1 | REQUIRED | H2 chưa nói rõ lần khởi tạo đầu không chờ `/me` (loader `routes.tsx:30-38` vẫn await) | Nhận. plan H2: `initializeSession` không chờ mạng khi có phiên lưu, `/me` nền một lượt, số thế hệ chống `/me` cũ ghi đè; thêm test (a)(b) DA-5 |
| 2 | REQUIRED | H6 thiếu đặc tả duy nhất/quyền trước khi trả bản ghi cũ, test chưa đủ | Nhận. plan H6: thứ tự quyền → cùng workspace+cha ⇒ 200 không ghi → nơi khác ⇒ 409 không lộ; test chéo workspace/lớp, thu hồi quyền, `change_log` không tăng, client cũ không đổi |
| 3 | REQUIRED | Thiếu test cursor không tiến khi snapshot dở | Nhận. Test (c) DA-5 gồm ngắt sau 1 thực thể và 1 request song song lỗi |
| 4 | OPTIONAL | A1 nên ghi là giả thuyết cần xác nhận | Nhận, sửa `diagnosis.md` |
| 5 | OPTIONAL | Test 2 thiết bị cần phạm vi cụ thể | Nhận, test (e) DA-5 liệt kê loại dữ liệu, trigger, ca phụ huynh |

## Vòng 2 (cuối) — APPROVE_WITH_CHANGES
REQUIRED vòng 1 đã đóng. Mới: 1 REQUIRED — snapshot dở để lại bản ghi đã bị xoá trên máy chủ. Nhận: plan H3 xoá mọi bảng thực thể của identity khi bắt đầu snapshot (giữ outbox), thêm test bản ghi bị xoá giữa hai lần thử + outbox `rejected` còn giữ. Hết 2 vòng; không mở vòng 3.

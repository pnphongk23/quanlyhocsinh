# Review tổng thể Web UI audit — r1

Phạm vi: `a11a28d..HEAD` (8 commit). Chỉ đọc/chạy; không sửa mã, không commit.

| ID | Mức | File:dòng | Vấn đề | Bằng chứng | Đề xuất |
|---|---|---|---|---|---|
| WEBUI-05-01 | Vừa | `scripts/ui-audit-capture.mjs:107-125`; `src/test/sync-rejection.test.ts:21-40` | Bộ chụp UI luôn giả lập pull/push thành công, nên không kiểm tra được trạng thái người dùng nhìn thấy khi lưu bị từ chối/mất mạng hoặc lời nhắc “sẽ gửi khi có mạng”. Test sync hiện xác nhận outbox và trạng thái dữ liệu, chưa render banner/toast trong luồng UI. | Handler của harness trả kết quả `applied` cho push và pull thành công; test rejection chỉ kiểm tra outbox và `getSaveStatus()`. Checklist brief yêu cầu hồi quy lỗi lưu và offline. | Bổ sung kịch bản fake API lỗi và offline vào harness; xác nhận banner/toast, nút thử lại và trạng thái lệnh chờ trên màn phù hợp. |
| WEBUI-05-02 | Thấp | `scripts/ui-audit-capture.mjs:32-42`; `inventory-after.md:230-237` | Lượt chụp cuối không chụp các route tại 1024px. Bản đo tràn ngang ở 1024 chỉ chạy trên trang lớp của nhân sự và trang chính phụ huynh, không bao phủ các màn desktop đã sửa. | Các viewport chụp chính là 375/390/430 và 1440; bảng đo 1024 hiện có hai route gốc. `fixes-B.md` ghi kiểm 1024 trước đó, nhưng chưa thay thế việc kiểm lại toàn bộ màn sau các commit cuối. | Thêm viewport 1024×768 cho route desktop A/B/C cần kiểm và chạy lại kiểm tràn ngang trên các route đó. |
| WEBUI-05-03 | Thấp | `src/shared/ui/ActionFooter.test.tsx:13-32`; `src/shared/ui/Fab.test.tsx:41-59`; `src/shared/motion/pageTransition.test.ts:4-10` | Một phần test UI mới khẳng định chuỗi CSS, selector và tên token bằng regex/`toContain`; chúng có thể qua khi stylesheet đúng chuỗi nhưng bố cục hoặc hành vi trình duyệt sai. Các test auth và portal DOM vẫn kiểm tra hành vi thực. | Những assertion được trỏ tới đọc file CSS trực tiếp; `ActionFooter` không đo vị trí footer, còn `pageTransition` không kiểm tra `transform` sau animation trong trình duyệt. | Giữ kiểm tra cấu trúc cần thiết, thêm assertion trình duyệt cho vị trí footer/FAB, transform sau animation và trạng thái disabled tại các viewport mục tiêu. |
| WEBUI-05-04 | Thấp | `fixes-A.md:43-48`; `fixes-C.md:39-42`; `fixes-T.md:22-25` | Safe-area và chiều cao viewport động chưa được kiểm trên iPhone thật; bằng chứng hiện tại là Chrome giả lập cùng CSS `env()`. | Các ghi chú fix đều nêu giới hạn kiểm thử thiết bị; capture không chứng minh hành vi PWA Safari với tai thỏ và thanh địa chỉ co giãn. | Trước khi phát hành, kiểm các màn có tab/footer cố định trên iPhone Safari/PWA, đặc biệt khi cuộn và khi bàn phím mở. |

## Kiểm chứng

- `npm run typecheck`: đạt.
- `npm test`: 37 file đạt, 1 bỏ qua; 285 test đạt, 1 bỏ qua.
- `npm run build`: đạt, gồm kiểm bundle. Gzip JS: 147,957 B ban đầu; 160,304 B cho route nhân sự đầu tiên; 170,122 B cho route phụ huynh đầu tiên.
- Bộ chụp sau: 204 trạng thái chụp được, 0 lỗi tương tác, 1 màn desktop không khả dụng vì trang đổi mật khẩu chuyển hướng về cài đặt theo điều kiện desktop.
- Đo tràn ngang không phát hiện tràn ở 375, 390, 1024 và 1440 trên các route gốc được đo. Kiểm ảnh trên Chrome cho thấy shell lớp mobile, guardian mobile và desktop không bị cắt trong ảnh đã xem.
- CSS: khối token nguồn và token web đồng bộ; rà tham chiếu không thấy biến CSS không khai báo; các `z-index` trong CSS tính năng dùng token.
- Chưa xác nhận trên iPhone thật; bộ fixture dùng máy chủ giả nên không thay thế kiểm thử lưu/đồng bộ lỗi ngoài UI.

Status: DONE_WITH_CONCERNS
Summary: Chặn 0, Cao 0, Vừa 1, Thấp 3

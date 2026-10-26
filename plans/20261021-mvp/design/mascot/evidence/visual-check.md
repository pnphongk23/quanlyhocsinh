# Tự kiểm hình ảnh · 2026-10-22

Status: DONE_WITH_CONCERNS — gói khám phá đủ ảnh, chưa tích hợp sản phẩm.

## Bằng chứng mở xem
- Đã mở xem cả 10 cặp PNG tại `compare-{name}.png`, mỗi phía đúng 390×844; [trang đối chiếu](compare.html).
- Đã mở [contact-sheet.png](contact-sheet.png) thấy đủ 10 ảnh, [gallery-390x844.png](gallery-390x844.png) là gallery render thật tại viewport 390×844.
- Ba bảng 6 pose đã render và xem: [Nếp](direction-nep.png), [Mầm](direction-mam.png), [Nhịp](direction-nhip.png). Không thấy cắt đầu/cánh/chân hoặc lệch hệ nét trong từng bộ.

| Ảnh | Quan sát cạnh baseline | Khác biệt chủ động |
|---|---|---|
| nep-login | Tiêu đề, trường nhập, mắt mật khẩu, nút và hướng dẫn giữ nguyên | welcome 64px trong khoảng phải tiêu đề |
| nep-empty | Thẻ “Chưa có học sinh”, lời giải thích, FAB và tab nguyên vị trí | empty 80px ở vùng trống dưới thẻ |
| nep-sent | Badge Đã gửi và nút cả lớp(0) giữ nguyên; không thêm toast | celebration 80px dưới nút, minh hoạ local |
| nep-overview | Thẻ chuyên cần, số buổi, Điểm gần đây và tab giữ nguyên | welcome 80px bên phải thẻ; không dấu tích đánh giá trẻ |
| nep-published | Tiêu đề, kỳ tháng, bảng/sao/BTVN/PDF giữ nguyên | celebration 56px cạnh tiêu đề, không đi qua ranh thẻ |
| nep-error | Hai thông báo lỗi, Thử lại và Lưu điểm danh vẫn rõ | gentle-error 32px trong phần trống dải lỗi đầu màn |
| mam-login | Cùng nền login; không che nhãn/nút | Mầm 64px, lá/ánh màu nhẹ hơn Nếp |
| mam-empty | Cùng nền empty; FAB tự do | Mầm 80px dưới thẻ |
| nhip-login | Cùng nền login; cánh giấy rõ ở 64px | Nhịp trong cùng slot đối chứng |
| nhip-empty | Cùng nền empty; không chạm FAB/tab | Nhịp 80px, silhouette nằm trong box |

Điều chỉnh từ tự kiểm: Tổng quan đổi từ complete có dấu tích sang welcome trung tính để tránh liên hệ chuyên cần 2/4 với phần thưởng. Vùng báo cáo đặt ở khoảng trống đầu màn, không chen giữa các thẻ. Đã xem lại kết quả sửa. Không có reviewer/agent khác.

## Kiểm geometry và pixel
`validate.py` decode PNG bằng Pillow đã có sẵn; kiểm signature, 390×844, đúng bộ 10 HTML/10 PNG, 18 SVG, local link kể cả CSS background và dung lượng. Với từng ảnh, hash baseline phải khớp manifest; difference bounding box phải nằm hoàn toàn trong box SVG và mọi pixel ngoài box bằng baseline. Kết quả cuối tại [validation.json](validation.json).

Bộ chụp đo text-range và bounding box button/link/input/select/textarea/SVG/role alert/status của DOM prototype thật; box SVG cách chúng ít nhất 8px. Không có vùng chạm/text/icon bị che; chính SVG có pointer-events:none. Chỉ vẽ thêm, không reflow/chuyển vị trí/xóa chữ. Mỗi SVG nằm trọn canvas; bottom bar và FAB không bị phủ. Safe area vật lý/notch và thanh trình duyệt iPhone chưa kiểm.

## Fixture và chạy lại
Server có trước: http://127.0.0.1:5173, PID37020, worker không sở hữu. Không start/stop server này; nếu không có server, từ repo: `cd design/prototype && npm run dev -- --host 127.0.0.1`.

Từ repo root:
```sh
PYTHONDONTWRITEBYTECODE=1 python3 plans/20261021-mvp/design/mascot/evidence/complete.py
PYTHONDONTWRITEBYTECODE=1 python3 plans/20261021-mvp/design/mascot/evidence/render_evidence.py
PYTHONDONTWRITEBYTECODE=1 python3 plans/20261021-mvp/design/mascot/validate.py
open plans/20261021-mvp/design/mascot/index.html
```

`capture.py` chỉ tạo dữ liệu từ createSeed; không mutate/import live store/router/features. Tên mẫu thay bằng “Học sinh mẫu”, “Người dùng mẫu”, “Lớp mẫu”; note/generalComment/description/reason và trường số điện thoại hiển thị được rỗng. Auth dùng số nội bộ synthetic hợp lệ để migration không xoá phiên. Placeholder số demo cố định của PhoneField được giữ đúng prototype, không phải dữ liệu thật. Không log số/ghi chú của người dùng.

Interception features.skipLogin=false chỉ trên response JS trước app load. localStorage key `teacher-prototype-v1` nạp fixture qua add_init_script trước navigation thứ hai; context riêng không dùng profile người dùng. Assert route URL và text từng scenario trước capture. Login auth=null; empty students=[]; sent local comment.sent; published local report.published; error attendance=[] rồi thao tác Lưu thật khi Storage.setItem được fixture làm lỗi quota. Auth mặc định seed chỉ dùng bootstrap không lưu ảnh, không có ảnh role picker trong packet.

Route/component, pose, slot, SHA256 baseline/component/fixture nằm tại [mockup-manifest.json](mockup-manifest.json). Source snapshot tại [completion-source-hashes.json](completion-source-hashes.json). Screenshot nền không được sửa pixel/viết lại nội dung bằng công cụ ảnh.

## Giới hạn thực tế
- Chỉ kiểm desktop Chromium chạy tại 390×844, theme sáng/cỡ chữ mặc định; không claim iPhone/Safari/VoiceOver hoặc Dynamic Type/large text.
- Ảnh nền là tĩnh: không chứng minh reflow ở cỡ chữ lớn, dark theme hoặc form khi bàn phím mở. Không đổi các giá trị đó trong ảnh để tránh giả bằng chứng.
- Reduced Motion được bật khi render; 18 SVG và mockup không có animation. Motion 180–240ms chỉ là đề xuất.
- sent/published là minh hoạ trạng thái local, chưa kiểm ACK backend, phân quyền máy chủ hoặc push.
- Lỗi quota được tái hiện bằng UI thật; mất mạng thực và hàng đợi đồng bộ chưa kiểm. Không có badge offline mới.
- 32px lỗi chỉ là dấu phụ; thông báo chữ và CTA vẫn truyền đạt trọn nghĩa khi không xem hình.

## Scope và cleanup
Chỉ ghi trong write-set visual được giao; không sửa product/docs/research/lead handback/coordination. Không install/build/git/delegate. 18SVG gốc checksum không đổi.
Browser/context riêng đã đóng; .runtime/.diagnostic/.inspect-runtime/.final-render do worker tạo đã dọn, không còn cache/profile/pycache của worker. Đã xoá ảnh thử sai role picker từ lượt cũ và ảnh composite sáu màn trung gian; giữ contact sheet10 và cặp đối chiếu cuối.
ENOSPC 21-10 là lịch sử, không còn blocker hiện hành; brief05 ngày22-10 cho tiếp tục sau phục hồi đĩa.

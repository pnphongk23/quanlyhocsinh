# Brief chung: làm lại prototype cho giống design (mobile + web)

Cách dùng: mỗi worker đọc file này, rồi đọc file `worker-<x>.md` của mình. Làm ĐÚNG phạm vi file của mình.

## Vì sao phải làm lại

Các worker trước không truy cập được design (hợp đồng cũ ghi "Claude Design không truy cập được từ đây"), nên tự đoán theo spec. Kết quả là nhập điểm, tạo bài kiểm tra, lịch, chi tiết lớp và buổi học không giống design. Lần này design đã được trích ra file HTML đọc và chạy được, hãy bám sát nó.

## Nguồn chuẩn: `design/reference/`

- `design/reference/index.json`: danh sách 124 bảng (file, nhãn, kích thước). Mobile 390x844, web 1360x860.
- Mỗi file `NN-ten.html` là MỘT màn hình, dựng sẵn, style inline. Đọc thẳng file để lấy: cấu trúc khối, thứ tự, khoảng cách (padding, gap), cỡ chữ, độ đậm, bán kính, màu, chiều cao điều khiển, nhãn chữ tiếng Việt chính xác.
- Xem bằng trình duyệt: `cd design/reference && python3 -m http.server 8767`, mở `http://localhost:8767/<file>.html`. Cửa sổ 390 px rộng cho mobile.
- Cấm sửa file trong `design/reference/`.
- Vài file có chữ "-cu" trong tên là bản lưu trữ cũ, bỏ qua.

## Quyết định đã chốt (đừng đổi)

1. **Thanh tab dưới của mobile giữ 3 tab hiện tại: Lớp, Lịch, Cài đặt.** Design vẽ thanh 5 tab (Lớp, Điểm danh, Điểm số, Học sinh, Báo cáo) nhưng người dùng đã quyết định giữ 3 tab của prototype. Khi chép khung màn từ design, BỎ thanh tab dưới của design và dùng thanh tab của `TeacherShell`. Chỉ chép phần nội dung phía trên thanh tab.
2. Dữ liệu mẫu (seed) giữ nguyên tên lớp, học sinh hiện có. Design cũng không nhất quán tên lớp (IELTS Foundation, IELTS 7.0). Chỉ bám bố cục, không bám dữ liệu mẫu.
3. Phạm vi = chức năng prototype đang có (`design/prototype/src/app/router.tsx`). Không thêm tính năng mới ngoài design. Không đụng mục "Chưa nên làm" trong `docs/spec.md` mục 8.
4. Spec mâu thuẫn design: theo spec và ghi lại trong báo cáo, KHÔNG tự sửa spec. Ví dụ: design không có chip trạng thái đồng bộ thường trực, spec cũng vậy.
5. Đồng bộ chạy ngầm: không hiện "Đã lưu", "Chưa lưu", số thay đổi chờ. Chỉ hiện lỗi lưu hoặc đồng bộ (spec 5.3).

## Quy tắc kỹ thuật

- Thư mục làm việc: `design/prototype`. Stack: Vite + React + TS + CSS Modules. Chạy dev: `npm run dev`. Kiểm: `npm run typecheck`, `npm test`, `npm run build`. Cả ba phải xanh khi xong.
- Màu và bo góc lấy từ biến trong `src/shared/styles/tokens.css`. Các giá trị trong design (ví dụ #2F5BEA, #F6F7F9, #E8EEFE, #14181F, #4A5361, #E6E9EE) đã có token tương ứng; dùng token. Nếu một màu của design không có token, dùng hex cục bộ trong CSS module của bạn kèm chú thích ngắn nêu màn nào.
- Không sửa `src/shared/**`, `src/app/**`, `src/data/**` trừ khi file worker của bạn cho phép rõ ràng. Cần primitive mới thì đặt trong thư mục feature của bạn.
- Không đổi chữ ký hàm ở `src/data/repositories/*`; chỉ thêm hàm khi thật sự cần cho màn và ghi trong báo cáo.
- Giữ hành vi, quyền (`useAccess`, `NoAccess`), offline, trạng thái rỗng, lỗi, đang tải đã có. Bố cục đổi, logic giữ. Các trạng thái này cũng có màn trong design (nhóm "Trạng thái chung", file 74-85): làm khớp.
- Không ghi SĐT, nội dung nhận xét vào log.
- Mọi test hiện có phải còn xanh. Đổi UI làm hỏng test thì sửa test cho đúng hành vi mới, không xoá test.
- Tiếng Việt có dấu đúng như design. Nhãn nút, tiêu đề, placeholder copy từ design.

## Cách làm từng màn (lặp lại cho mỗi màn trong file worker của bạn)

1. Mở file reference, ghi ra: danh sách khối từ trên xuống, với mỗi khối: padding/gap/cỡ chữ/đậm/màu/bo góc/chiều cao.
2. So với mã hiện tại, liệt kê chỗ lệch.
3. Viết lại JSX + CSS để khớp. Ưu tiên khớp số đo trong reference thay vì "gần giống".
4. Mở màn của prototype ở 390 px và so với reference cạnh nhau. Không có trình duyệt thì so bằng đọc số đo trong CSS và nói rõ trong báo cáo "chưa kiểm bằng mắt".
5. Với bản web (>= 1024 px): đối chiếu file `Web*` tương ứng (88-105): thanh bên 248 px, nội dung chính, bảng.

## Báo cáo

Ghi vào `plans/20261018-prototype-match-design/reports/<tên-worker>.md`: màn đã làm (reference nào ↔ route nào), chỗ còn lệch và vì sao, lệnh đã chạy và kết quả, chỗ chưa kiểm. Kết thúc câu trả lời bằng:

```
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: một hai câu
```

Không commit.

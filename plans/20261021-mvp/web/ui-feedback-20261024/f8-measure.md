# F8 — đo trạng thái lưu trên web (local mock)

HEAD f31150e · Vite :5197 · fixture giả từ scripts/ui-audit-fixtures/demo.mjs · POST /v1/sync/push và các POST/PATCH lớp/buổi lẻ trả sau 1200 ms. Khổ đo: 390×844 và 1280×800. Hai lượt chạy độc lập; ngoại tuyến và lỗi Dexie chạy thêm cho từng action có ý nghĩa. Dữ liệu tổng: [measure-results.json](tools/measure-results.json).

|Run|Thao tác|Kích thước|Click→busy (ms)|Busy tồn tại (ms)|Spinner paint|Sync/offline khi chờ|Thành công hiển thị|Outbox / đồng bộ|Lỗi UI|Dữ liệu nhập còn|Ghi chú|
|---|---|---|---|---|---|---|---|---|---|---|---|
|1|Lưu điểm danh|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→8|không thấy thông báo lỗi UI|—|delayed|
|1|Lưu điểm danh|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→8|không thấy thông báo lỗi UI|—|delayed|
|1|Lưu điểm (màn nhập)|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|—|delayed|
|1|Lưu điểm (màn nhập)|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|—|delayed|
|1|Lưu điểm (bảng điểm)|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|—|delayed|
|1|Lưu phiếu nhận xét|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|—|delayed|
|1|Lưu phiếu nhận xét|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 1→1|không thấy thông báo lỗi UI|—|delayed|
|1|Gửi phiếu nhận xét|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 1→2|không thấy thông báo lỗi UI|—|delayed|
|1|Gửi phiếu nhận xét|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 1→2|không thấy thông báo lỗi UI|—|delayed|
|1|Lưu BTVN|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|—|delayed|
|1|Lưu BTVN|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|—|delayed|
|1|Tạo lớp|390x844|2.3|1219.4|có (3 RAF sample, frame đầu 15.6 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|không thấy thông báo lỗi UI|—|delayed|
|1|Tạo lớp|1280x800|2.5|1220.1|có (3 RAF sample, frame đầu 15.9 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|không thấy thông báo lỗi UI|—|delayed|
|1|Lưu sửa lớp|390x844|2|1224.5|có (2 RAF sample, frame đầu 15.1 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|không thấy thông báo lỗi UI|—|delayed|
|1|Lưu sửa lớp|1280x800|1.9|1229.2|có (2 RAF sample, frame đầu 10.2 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|không thấy thông báo lỗi UI|—|delayed|
|1|Thêm buổi lẻ|390x844|2.7|1236.1|có (3 RAF sample, frame đầu 16.3 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|không thấy thông báo lỗi UI|—|delayed|
|1|Thêm buổi lẻ|1280x800|2.7|1232.9|có (3 RAF sample, frame đầu 5.8 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|không thấy thông báo lỗi UI|—|delayed|
|1|Lưu điểm danh|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→8|không thấy thông báo lỗi UI|còn|offline|
|1|Lưu điểm danh|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|còn|dexie-error|
|1|Lưu điểm danh|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→8|không thấy thông báo lỗi UI|còn|offline|
|1|Lưu điểm danh|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|còn|dexie-error|
|1|Lưu điểm (màn nhập)|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|còn|offline|
|1|Lưu điểm (màn nhập)|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại; Lỗi lưu, vui lòng thử lại; Thử lại|còn|dexie-error|
|1|Lưu điểm (màn nhập)|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|còn|offline|
|1|Lưu điểm (màn nhập)|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại; Lỗi lưu, vui lòng thử lại; Thử lại|còn|dexie-error|
|1|Lưu điểm (bảng điểm)|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|còn|offline|
|1|Lưu điểm (bảng điểm)|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|còn|dexie-error|
|1|Gửi phiếu nhận xét|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 1→2|không thấy thông báo lỗi UI|còn|offline|
|1|Gửi phiếu nhận xét|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 1→1|Lỗi lưu — vui lòng thử lại|còn|dexie-error|
|1|Gửi phiếu nhận xét|1280x800|không có|không có|không (0 RAF sample)|Sẽ gửi khi có mạng|không thấy thông báo chữ thành công rõ ràng|outbox 1→2|không thấy thông báo lỗi UI|còn|offline|
|1|Gửi phiếu nhận xét|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 1→1|Lỗi lưu — vui lòng thử lại|còn|dexie-error|
|1|Lưu BTVN|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|không còn/đóng|offline|
|1|Lưu BTVN|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|1|Lưu BTVN|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|không còn/đóng|offline|
|1|Lưu BTVN|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|1|Tạo lớp|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Tạo lớp cần kết nối mạng.|còn|offline|
|1|Tạo lớp|390x844|2.4|1227.7|có (3 RAF sample, frame đầu 15.6 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|1|Tạo lớp|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Tạo lớp cần kết nối mạng.|còn|offline|
|1|Tạo lớp|1280x800|2.3|1230.7|có (3 RAF sample, frame đầu 15.7 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|1|Lưu sửa lớp|390x844|1.7|1.1|không (0 RAF sample)|Ngoại tuyến · dữ liệu trên thiết bị|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Sửa lớp cần kết nối mạng.|còn|offline|
|1|Lưu sửa lớp|390x844|2.1|1235|có (3 RAF sample, frame đầu 15.1 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|1|Lưu sửa lớp|1280x800|1.5|0.9|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Sửa lớp cần kết nối mạng.|còn|offline|
|1|Lưu sửa lớp|1280x800|1.9|1236.7|có (3 RAF sample, frame đầu 14.7 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|1|Thêm buổi lẻ|390x844|2.3|1.1|không (0 RAF sample)|Ngoại tuyến · dữ liệu trên thiết bị|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Thêm buổi học cần kết nối mạng.|còn|offline|
|1|Thêm buổi lẻ|390x844|2.8|1241.2|có (3 RAF sample, frame đầu 14.6 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|1|Thêm buổi lẻ|1280x800|2.1|1|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Thêm buổi học cần kết nối mạng.|còn|offline|
|1|Thêm buổi lẻ|1280x800|2.7|1238.3|có (3 RAF sample, frame đầu 5.1 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|2|Lưu điểm danh|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→8|không thấy thông báo lỗi UI|—|delayed|
|2|Lưu điểm danh|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→8|không thấy thông báo lỗi UI|—|delayed|
|2|Lưu điểm (màn nhập)|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|—|delayed|
|2|Lưu điểm (màn nhập)|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|—|delayed|
|2|Lưu điểm (bảng điểm)|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|—|delayed|
|2|Lưu phiếu nhận xét|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|—|delayed|
|2|Lưu phiếu nhận xét|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 1→1|không thấy thông báo lỗi UI|—|delayed|
|2|Gửi phiếu nhận xét|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 1→2|không thấy thông báo lỗi UI|—|delayed|
|2|Gửi phiếu nhận xét|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 1→2|không thấy thông báo lỗi UI|—|delayed|
|2|Lưu BTVN|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|—|delayed|
|2|Lưu BTVN|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|—|delayed|
|2|Tạo lớp|390x844|2.5|1217.3|có (3 RAF sample, frame đầu 15.6 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|không thấy thông báo lỗi UI|—|delayed|
|2|Tạo lớp|1280x800|2.3|1220.6|có (3 RAF sample, frame đầu 15.6 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|không thấy thông báo lỗi UI|—|delayed|
|2|Lưu sửa lớp|390x844|2.2|1227.9|có (2 RAF sample, frame đầu 15.3 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|không thấy thông báo lỗi UI|—|delayed|
|2|Lưu sửa lớp|1280x800|1.9|1223.2|có (2 RAF sample, frame đầu 15.0 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|không thấy thông báo lỗi UI|—|delayed|
|2|Thêm buổi lẻ|390x844|2.9|1228|có (3 RAF sample, frame đầu 5.2 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|không thấy thông báo lỗi UI|—|delayed|
|2|Thêm buổi lẻ|1280x800|2.6|1233.7|có (2 RAF sample, frame đầu 11.0 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|không thấy thông báo lỗi UI|—|delayed|
|2|Lưu điểm danh|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→8|không thấy thông báo lỗi UI|còn|offline|
|2|Lưu điểm danh|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|còn|dexie-error|
|2|Lưu điểm danh|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→8|không thấy thông báo lỗi UI|còn|offline|
|2|Lưu điểm danh|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|còn|dexie-error|
|2|Lưu điểm (màn nhập)|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|còn|offline|
|2|Lưu điểm (màn nhập)|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại; Lỗi lưu, vui lòng thử lại; Thử lại|còn|dexie-error|
|2|Lưu điểm (màn nhập)|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|còn|offline|
|2|Lưu điểm (màn nhập)|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại; Lỗi lưu, vui lòng thử lại; Thử lại|còn|dexie-error|
|2|Lưu điểm (bảng điểm)|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|còn|offline|
|2|Lưu điểm (bảng điểm)|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|còn|dexie-error|
|2|Gửi phiếu nhận xét|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 1→2|không thấy thông báo lỗi UI|còn|offline|
|2|Gửi phiếu nhận xét|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 1→1|Lỗi lưu — vui lòng thử lại|còn|dexie-error|
|2|Gửi phiếu nhận xét|1280x800|không có|không có|không (0 RAF sample)|Sẽ gửi khi có mạng|không thấy thông báo chữ thành công rõ ràng|outbox 1→2|không thấy thông báo lỗi UI|còn|offline|
|2|Gửi phiếu nhận xét|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 1→1|Lỗi lưu — vui lòng thử lại|còn|dexie-error|
|2|Lưu BTVN|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|không còn/đóng|offline|
|2|Lưu BTVN|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|2|Lưu BTVN|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→1|không thấy thông báo lỗi UI|còn|offline|
|2|Lưu BTVN|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|2|Tạo lớp|390x844|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Tạo lớp cần kết nối mạng.|còn|offline|
|2|Tạo lớp|390x844|2.4|1227.5|có (3 RAF sample, frame đầu 15.3 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|2|Tạo lớp|1280x800|không có|không có|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Tạo lớp cần kết nối mạng.|còn|offline|
|2|Tạo lớp|1280x800|2.4|1227.7|có (3 RAF sample, frame đầu 16.7 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|2|Lưu sửa lớp|390x844|1.6|1|không (0 RAF sample)|Ngoại tuyến · dữ liệu trên thiết bị|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Sửa lớp cần kết nối mạng.|còn|offline|
|2|Lưu sửa lớp|390x844|2|1231.3|có (3 RAF sample, frame đầu 10.5 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|2|Lưu sửa lớp|1280x800|1.4|1|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Sửa lớp cần kết nối mạng.|còn|offline|
|2|Lưu sửa lớp|1280x800|2|1236.5|có (3 RAF sample, frame đầu 14.7 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|2|Thêm buổi lẻ|390x844|2.2|1.1|không (0 RAF sample)|Ngoại tuyến · dữ liệu trên thiết bị|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Thêm buổi học cần kết nối mạng.|còn|offline|
|2|Thêm buổi lẻ|390x844|3.1|1234.2|có (3 RAF sample, frame đầu 5.6 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|
|2|Thêm buổi lẻ|1280x800|2|1|không (0 RAF sample)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Thêm buổi học cần kết nối mạng.|còn|offline|
|2|Thêm buổi lẻ|1280x800|2.8|1240.1|có (3 RAF sample, frame đầu 5.3 ms)|không thấy|không thấy thông báo chữ thành công rõ ràng|outbox 0→0|Lỗi lưu — vui lòng thử lại|không còn/đóng|dexie-error|

## Cách đọc

- click→busy đo lần đầu thấy [aria-busy=true]; “không có” nghĩa là không xuất hiện trong cửa sổ quan sát. Spinner được tính khi phần tử có vẻ là spinner/progress visible được thấy trong một requestAnimationFrame; cột đếm là số sample RAF, có thể trùng cùng một frame.
- Outbox / đồng bộ là số dòng outbox trước/sau; push giả bị trễ 1.2 giây. Tạo/sửa lớp và thêm buổi lẻ là request trực tiếp qua API, không qua outbox. Offline lấy mẫu thông báo sau 650 ms, lỗi Dexie dùng monkeypatch IDBObjectStore.put ném QuotaExceededError.
- Cột dữ liệu giữ lại chỉ ghi số ô nhập có giá trị và editor còn mở/đóng, không ghi nội dung nhập.


## Kết luận F8

**MỘT PHẦN.** Giả thuyết đúng với thao tác lưu local-first: ở 10 tổ hợp lưu điểm danh, lưu điểm, phiếu nhận xét, gửi phiếu, BTVN (390/1280), cả hai lượt đều không có `aria-busy`, spinner hay chữ xác nhận thành công. Dù POST `/v1/sync/push` giả lập chờ 1200 ms, outbox tăng đúng (điểm danh 0→8; điểm/BTVN/phiếu 0→1; gửi phiếu 1→2); không thấy báo đang đồng bộ.

Ba thao tác còn lại không theo đường lưu local: Tạo lớp và sửa lớp gọi REST ở `src/data/repositories/classes.ts:16-28,30-37`; thêm buổi lẻ gọi REST ở `src/data/repositories/sessions.ts:27-32`. Mock trễ 1200 ms cho các endpoint này; cả ba bật busy sau 1,4–3,1 ms và giữ 1217–1242 ms, spinner được paint. Vì vậy không thể dùng nhóm này để chứng minh save Dexie mất vài ms. Cả 17 tổ hợp thao tác × viewport trong phép đo delayed đều không hiện chữ thành công trong cửa sổ đo; thời gian phản hồi thành công bằng chữ: không có. Các số đo Run 1/2 ở bảng trên ổn định về trạng thái và outbox; độ lệch busy ở nhóm REST chỉ vài ms.

**Offline và lỗi.** Lưu local offline vẫn tăng outbox nhưng thường không có nhãn chờ đồng bộ; ngoại lệ “Gửi phiếu nhận xét” hiện `Sẽ gửi khi có mạng` trên desktop, không thấy trên mobile. Tạo lớp/sửa lớp/thêm buổi lẻ báo lần lượt `Tạo lớp cần kết nối mạng.`, `Sửa lớp cần kết nối mạng.`, `Thêm buổi học cần kết nối mạng.` và giữ modal cùng giá trị nhập. Khi chặn IndexedDB put, các thao tác local hiện `Lỗi lưu — vui lòng thử lại`; 8 ô điểm vẫn có giá trị. Modal tạo/sửa lớp và thêm buổi lẻ đóng sau lỗi Dexie trong phép đo; cần coi đây là rủi ro giữ dữ liệu. BTVN kiểm tra được lỗi nhưng fixture không có giá trị nhập để khẳng định giữ dữ liệu.

## Nút đo và nơi bật loading

|Thao tác|Hook `useSaveAction`|Nút / file:dòng|Loading|
|---|---|---|
|Lưu điểm danh mobile|`AttendancePanel.tsx:130`|`AttendancePanel.tsx:499-506`|Không truyền `loading`|
|Lưu điểm danh desktop|`AttendanceDesktop.tsx:97`|`AttendanceDesktop.tsx:163-169`|Không truyền `loading`|
|Lưu điểm màn nhập mobile|`TestScoresPage.tsx:105`|`TestScoresPage.tsx:534-541`|Nút thường, không `aria-busy`|
|Lưu điểm bảng điểm desktop|`ScoreGridDesktop.tsx:79`|`ScoreGridDesktop.tsx:112-118`|Không truyền `loading`|
|Lưu phiếu nhận xét|`CommentTicketSheet.tsx:164`|`CommentTicketSheet.tsx:343-345`|Không truyền `loading`|
|Gửi phiếu nhận xét|`CommentsPanel.tsx:263`|`CommentsPanel.tsx:426-438`|Không truyền `loading`; offline toast ở `:442-446`|
|Lưu BTVN mobile/desktop|`HomeworkPanel.tsx:636`; `HomeworkDesktop.tsx:691`|`HomeworkPanel.tsx:822-824`; `HomeworkDesktop.tsx:822-824`|Không truyền `loading`|
|Tạo lớp|`NewClassPage.tsx:29`|`NewClassPage.tsx:118-120`|Có `loading={action.saving}`|
|Sửa lớp|`EditClassModal.tsx:24`|`EditClassModal.tsx:93-95`|Có `loading={action.saving}`|
|Thêm buổi lẻ|`AddSessionModal.tsx:40`|`AddSessionModal.tsx:103-104`|Có `loading={action.saving}`|

## Empty states đã chụp

|Màn / chữ hiển thị|File:dòng|Ảnh|
|---|---|---|
|Chưa có lớp học|`src/features/classes/ClassListPage.tsx:148`|`F7-empty-lop-390/1280.png`|
|Lớp chưa có buổi học|`src/features/class-space/SessionsTab.tsx:155`|`F7-empty-buoi-hoc-390/1280.png`|
|Chưa có học sinh|`src/features/students/StudentsPage.tsx:81`|`F7-empty-hoc-sinh-390/1280.png`; desktop hiện bảng trống và ghi chú quyền riêng tư, không có câu empty riêng|
|Chưa có bài kiểm tra|`src/features/class-space/TestsTab.tsx:37`|`F7-empty-bai-kiem-tra-390/1280.png`|
|Chưa có dữ liệu báo cáo|`src/features/reports/ReportsPage.tsx:353`|`F7-empty-bao-cao-390/1280.png`|
|Chưa giao phần bài tập nào. / Buổi này chưa có bài tập về nhà|`src/features/homework/HomeworkPanel.tsx:526`; `src/features/homework/HomeworkDesktop.tsx:388`|`F7-empty-btvn-buoi-dau-390/1280.png`|
|Không có học sinh trong mục này (lọc Chưa gửi)|`src/features/comments/CommentsPanel.tsx:420`|`F7-empty-nhan-xet-loc-rong-390/1280.png`|

Danh sách toàn bộ ảnh F1–F9 và kiểm tra URL nằm ở [shots/before/index.json](shots/before/index.json); có 27 ảnh, không có record lỗi hoặc màn đăng nhập. Đã mở kiểm tra F3 thẻ lớp chọn, F4 bảng điểm, F7 lọc Nhận xét rỗng (mobile/desktop), lớp không học sinh desktop, F9 nhập điểm mobile. Dùng fixture demo giả; không chứa SĐT hoặc nội dung nhận xét.

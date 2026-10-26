# DA-1 · Rà soát mã: mỗi thao tác đọc/ghi của web đi đường nào

Đọc `data-api-00-common.md` trước. Chỉ đọc mã, không gọi staging.

## Việc
Lập bảng `plans/20261021-mvp/data-api/inventory.md` (repo chính) cho MỌI thao tác đọc và ghi mà UI web dùng (giáo viên + phụ huynh + chọn vai trò/đăng nhập): lớp, học sinh, buổi (lịch lặp, buổi lẻ, huỷ), điểm danh, nhận xét/phiếu, bài kiểm tra, điểm, BTVN (giao, chấm), báo cáo (nháp, phát hành, xem), membership/`/me`/chọn vai trò, guardian.

Cột: thao tác | màn/hook gọi (file:dòng trong `src/features`/`src/roles`) | hàm repository (`src/data/repositories/*.ts`) | đường dữ liệu (REST GET nào / REST ghi nào / `sync/push` lệnh gì / `sync/pull` / `snapshot` / chỉ Dexie / chỉ bộ nhớ `store.ts` / seed-demo) | khi nào kéo dữ liệu mới (mount, mỗi lần đổi tab, focus, định kỳ, sau push, không bao giờ) | đọc chặn UI hay hiển thị cache trước | thiết bị thứ hai có thấy thay đổi không và sau bao lâu (suy từ mã) | ghi chú lỗi/nghi vấn.

Ngoài bảng, trả lời có bằng chứng file:dòng:
1. Có bao nhiêu nguồn đọc song song (Dexie, `store.ts` trong bộ nhớ, REST trực tiếp, `seed.ts`/`defaults.ts`)? Màn nào đọc nguồn nào? Còn chỗ nào dùng dữ liệu cục bộ/seed/demo thay vì API?
2. `sync.ts`/`outbox.ts`: trình kích hoạt pull (mở app, focus, online, định kỳ bao nhiêu giây, sau push?) — có thật được nối vào app không (tìm chỗ gọi)? `cursor`/`epoch` lưu ở đâu? `snapshot` gọi khi nào?
3. Riêng "thêm học sinh": đi đường nào, cập nhật cache nào; thiết bị B mở danh sách học sinh đọc từ đâu, khi nào làm mới — giải thích vì sao B có thể không thấy.
4. Riêng màn buổi học (3 tab Điểm danh / Nhận xét / BTVN) và Chọn vai trò: liệt kê từng request mạng theo thứ tự khi mở và khi chuyển tab (endpoint, có `await` chặn render không, có gọi lặp/tuần tự không, có cache không).
5. Backend (`worker/src/routes`, `worker/src/db`): liệt kê endpoint đọc web đang dùng và số câu D1 mỗi endpoint (đếm `prepare`/`batch` theo luồng chính), endpoint nào N+1.
6. Đối chiếu `api-spec.md` mục 6 + `offline-plan.md` (thiết kế: đọc từ Dexie, pull theo cursor) với thực tế: lệch ở đâu.

## Ranh giới
Chỉ viết file `data-api/inventory.md`. Không sửa gì khác.

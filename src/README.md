# Nền web — W-1

Chạy ở gốc repo: `npm ci`, `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`.
Node 22.19+; dependency cùng major với prototype, lockfile độc lập ở gốc.

- `app/`: router tổng, trang đầu khung, placeholder và CSS shell.
- `roles/staff/routes.ts`: điểm ghép riêng của W-2; `StaffShell.tsx` tải lười.
- `roles/guardian/routes.ts`: điểm ghép riêng của W-3; `GuardianShell.tsx` tải lười.
- `roles/account/routes.ts`: điểm ghép riêng của W-4 cho auth/settings.
- `features/`: giao diện theo từng luồng MVP, đọc/ghi qua repositories.
- `shared/`: token, CSS Modules, UI, format, hooks, SaveStatus và mascot dùng chung sao chép từ prototype.
- `data/types.ts`: view model camelCase tương thích prototype, thứ trong tuần JS 0..6.
- `data/api/`: kiểu wire snake_case theo api-spec, thứ trong tuần ISO 1..7; adapter đổi giữa ISO 1..7 và view model JS 0..6.
- `data/repositories/`: tên/hàm và kiểu tham số, kết quả MVP giữ theo prototype.
- `data/store.ts`: facade `getStore/useStore` đọc trạng thái đang hoạt động, hydrate từ Dexie theo danh tính hiện hành và phát thay đổi cho subscriber.
- `data/homework.ts`, `reportModel.ts`: helper tính BTVN và báo cáo thuần, không phụ thuộc API.
- `data/saveStatus.ts`: nguồn trạng thái dùng bởi SaveStatus, chỉ hiện khi `error`.
- `test/`: Testing Library/Vitest, polyfill `matchMedia`, fixture giả và phép đo gzip từ manifest sau build.

## Fixture dữ liệu cho test

- Test mới và test W-2/W-3 nên import `createSeed` từ `src/test/fixtures/seed.ts` (đường dẫn tương đối: `../../test/fixtures/seed`).
- `src/data/seed.ts` chỉ là re-export tương thích cho test cũ (`../../data/seed`); không import file này từ app, feature hoặc repository để fixture không vào bundle production.
- `src/data/defaults.ts` chỉ chứa role mặc định và ID ổn định phục vụ test/UI; không chứa tài khoản hay số điện thoại mẫu.

## Lớp dữ liệu W-1 đợt B

- `data/api/client.ts` gửi JSON, Bearer token, request ID, timeout và chuẩn hoá lỗi; base URL lấy từ `VITE_API_BASE`, mặc định staging.
- Token phiên web lưu trong `sessionStorage` (giới hạn bảo vệ của web: JavaScript cùng origin vẫn có thể đọc token); cache thực thể và hàng đợi ghi tách theo user/workspace/membership trong Dexie.
- `data/sync.ts` tải snapshot/pull, đẩy lệnh tối đa 50 mỗi request, giữ lệnh bị từ chối và kích hoạt đồng bộ khi mở/online/focus/định kỳ.
- Tạo PDF/ảnh là trách nhiệm UI trên thiết bị. Client và repository không tải PDF lên hoặc xuống, không dùng R2.

## Thêm màn và repository

UI đọc/ghi qua repository; các phép tính thuần không được tự gọi API hoặc IndexedDB. Import kiểu dữ liệu bằng `import type`.

Các hàm ghi đồng bộ giữ chữ ký prototype; thao tác từ Dexie/outbox chạy optimistic, lỗi lưu/đồng bộ được đưa vào SaveStatus. Các endpoint chưa có trong hợp đồng được ghi trong báo cáo W-1, không tự đặt thêm route.

`npm run build` đo JS ban đầu gzip theo ngưỡng bundle của dự án.

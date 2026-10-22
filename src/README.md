# Nền web — W-1

Chạy ở gốc repo: `npm ci`, `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`.
Node 22.19+; dependency cùng major với prototype, lockfile độc lập ở gốc.

- `app/`: router tổng, trang đầu khung, placeholder và CSS shell.
- `roles/staff/routes.ts`: điểm ghép riêng của W-2; `StaffShell.tsx` tải lười.
- `roles/guardian/routes.ts`: điểm ghép riêng của W-3; `GuardianShell.tsx` tải lười.
- `roles/account/routes.ts`: điểm ghép riêng của W-4 cho auth/settings.
- `features/`: worker tính năng tạo thư mục tại đây; Đợt A chưa có màn nghiệp vụ.
- `shared/`: token, CSS Modules, UI, format, hooks, SaveStatus và mascot dùng chung sao chép từ prototype.
- `data/types.ts`: view model camelCase tương thích prototype, thứ trong tuần JS 0..6.
- `data/api/`: kiểu wire snake_case theo api-spec, thứ trong tuần ISO 1..7; adapter ở Đợt B phải đổi rõ 0 ↔ 7.
- `data/repositories/`: tên/hàm và kiểu tham số, kết quả MVP giữ theo prototype.
- `data/store.ts`: facade `getStore/useStore` đọc trạng thái đang hoạt động, hydrate từ Dexie theo danh tính hiện hành và phát thay đổi cho subscriber.
- `data/homework.ts`, `reportModel.ts`: kiểu và chữ ký helper để màn sao chép import được; các phép tính chưa kết nối sẽ ném `FoundationUnavailableError`.
- `data/saveStatus.ts`: nguồn trạng thái dùng bởi SaveStatus, chỉ hiện khi `error`.
- `test/`: Testing Library/Vitest, polyfill `matchMedia`, fixture giả và phép đo gzip từ manifest sau build.

## Fixture dữ liệu cho test

- Test mới nên import `createSeed` từ `src/test/fixtures/seed.ts`.
- Các test W-2/W-3 hiện dùng đường dẫn tương thích `src/data/seed.ts`; file này chỉ re-export fixture test, không được import từ mã chạy ứng dụng. Khi sửa test, chuyển import sang `../../test/fixtures/seed`.
- `src/data/defaults.ts` chỉ chứa role mặc định và ID ổn định phục vụ test/UI; không chứa tài khoản hay số điện thoại mẫu.

## Lớp dữ liệu W-1 đợt B

- `data/api/client.ts` gửi JSON, Bearer token, request ID, timeout và chuẩn hoá lỗi; base URL lấy từ `VITE_API_BASE_URL`, mặc định staging.
- Token phiên web lưu trong `sessionStorage` (giới hạn bảo vệ của web: JavaScript cùng origin vẫn có thể đọc token); cache thực thể và hàng đợi ghi tách theo user/workspace/membership trong Dexie.
- `data/sync.ts` tải snapshot/pull, đẩy lệnh tuần tự tối đa 50 mỗi request, giữ lệnh bị từ chối và kích hoạt đồng bộ khi mở/online/focus/định kỳ.
- Tạo PDF/ảnh là trách nhiệm UI trên thiết bị. Client và repository không tải PDF lên hoặc xuống, không dùng R2.

## Thêm màn và repository

Worker chỉ sửa route trong file thuộc vai trò mình; thay `lazy: placeholderRoute(...)` bằng
`lazy: async () => ({ Component: (await import("../../features/<nhóm>/<Page>")).default })`.
Giữ đường dẫn đã khai, `handle.detail`, và `<Outlet />` nếu thêm layout lớp.
Bảng điểm desktop, báo cáo, thư viện PDF/Sentry phải tải lười; không import chúng từ router tổng.
Route đã bỏ khỏi MVP không được đăng ký lại. Chưa có PDF dependency ở Đợt A.

UI đọc/ghi qua repository, không gọi fetch/IndexedDB trực tiếp. Import kiểu dữ liệu bằng `import type`.
Đợt A: đọc repository trả rỗng/null/false; thao tác ghi ném lỗi và bật SaveStatus, không giả lưu thành công.
API client cũng từ chối rõ trước khi gửi mạng; cấu hình Bearer/transport và repository thật sẽ ở Đợt B.
Không viết lại nghiệp vụ trong màn; không dùng snapshot trống này làm dữ liệu thật.
Khi ghép backend, các thao tác ghi cần `await` và bắt lỗi; chữ ký lưu đồng bộ hiện tại chỉ là hợp đồng prototype.

Trang `/` có liên kết mở hai khung để kiểm tra Đợt A; đây chưa phải luồng đăng nhập hay đổi vai trò thật.
Đợt B thêm session, guard và redirect theo membership; hiện chưa có bảo vệ route hoặc dữ liệu thật.
Chưa triển khai Dexie/outbox/sync/auth/mock server/service worker/push/PDF ở Đợt A.
Q15 (cảnh báo vắng) và Q16 (đánh số buổi) chưa chốt: helper tương ứng vẫn là stub, không tự quyết nghiệp vụ.

`npm run build` kiểm JS ban đầu ≤ 200.000 byte gzip và JS+CSS ≤ 250.000 byte gzip;
đo closure static imports của entry và từng vai trò, kiểm hai shell là dynamic entry riêng.

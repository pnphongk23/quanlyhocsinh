# Đề xuất lớp lưu cục bộ (iOS)

Trạng thái: **đề xuất, chưa cài đặt**. Mã hiện có chỉ là giao thức `LocalStore` trong
`ios/QuanLyLop/Core/Storage/LocalStore.swift`. Chỉ chốt cài đặt sau khi có API spec
(`plans/20261021-mvp/backend/api-spec.md`).

## Ràng buộc

- Offline-first theo `docs/architecture.md` mục 5: thay đổi và dòng hàng đợi phải nằm
  **cùng một transaction**; lệnh có `UUID`, `record_key`, `base_version`; máy chủ bỏ qua
  UUID trùng; chỉ xoá lệnh khi máy chủ xác nhận; tới sau nhận xung đột và **giữ cả hai giá trị**.
- Không thêm thư viện ngoài ⇒ loại GRDB. iOS 17+, Swift 6 (strict concurrency).
- Dữ liệu mỗi tài khoản: vài lớp, vài chục học sinh, vài tháng buổi học/điểm/nhận xét —
  cỡ vài nghìn bản ghi, không cần tìm kiếm toàn văn.

## Phương án A — SwiftData

Ưu: ít mã nhất, tích hợp sẵn với SwiftUI (`@Query`), không phụ thuộc, migration tự khai báo
theo `VersionedSchema`.

Nhược, đúng các điểm ta cần nhất:

- `ModelContext` không `Sendable` ⇒ phải dựng `@ModelActor`; mọi truy cập phải đi qua một
  actor, dễ sinh lỗi tinh vi dưới Swift 6.
- Ranh giới transaction mờ: `save()` gộp thay đổi nhưng không có API tường minh kiểu
  `BEGIN IMMEDIATE`; khó đảm bảo "bản ghi + lệnh chờ" hoặc không có gì, dưới tải và khi
  app bị kill giữa lúc ghi.
- `@Attribute(.unique)` cho UUID chống trùng nhưng là upsert thay vì "bỏ qua lệnh trùng",
  và index phức hợp (khoá bản ghi + phiên bản) không diễn đạt được.
- Lưu bằng SQLite sinh tự động, khoá nội bộ: chẩn đoán sự cố đồng bộ khó; các bản iOS 17.x
  từng có lỗi migration/đồng bộ dữ liệu.
- Kiểm thử tích hợp (mô phỏng mất mạng, hai thiết bị, migration) khó dựng hơn so với SQL thuần.

## Phương án B — SQLite qua `SQLite3` có sẵn trong SDK

Ưu:

- Toàn quyền transaction: ghi bản ghi + đẩy lệnh chờ trong một `BEGIN IMMEDIATE ... COMMIT`.
- Chống trùng lặp bằng `UNIQUE(commands.id)`; kiểm phiên bản, ghi xung đột (hai giá trị) bằng
  bảng riêng — đúng mục 5, không phải lách ORM.
- Migration bằng `PRAGMA user_version` + script tăng dần; dễ test.
- Không phụ thuộc; file `.sqlite` mở được bằng công cụ chuẩn khi gỡ lỗi.
- Dễ đặt sau một `actor` ⇒ hợp Swift 6 strict concurrency, một luồng ghi duy nhất.

Nhược: phải tự viết wrapper mỏng (ước 300–500 dòng: mở/đóng, prepare, bind, decode, migration)
và tự làm cơ chế phát thay đổi cho SwiftUI (một `AsyncStream` sau khi commit).

## Đề xuất

**Chọn SQLite (phương án B)**, bọc trong một `actor SQLiteStore` thoả giao thức `LocalStore`.
Bảng tối thiểu: `records(key TEXT PRIMARY KEY, entity TEXT, version INTEGER, json BLOB, updated_at)`,
`commands(id TEXT PRIMARY KEY, record_key TEXT, base_version INTEGER, kind TEXT, payload BLOB, created_at)`,
`conflicts(record_key TEXT, field TEXT, local_json BLOB, server_json BLOB, created_at)`.
Bật WAL; mọi thao tác ghi đi qua một hàm `transaction { }`.

Lý do: hai yêu cầu khó nhất của mục 5 — transaction gộp bản ghi với hàng đợi, và idempotent
bằng UUID — là chỗ SwiftData yếu nhất, còn SQLite làm trực tiếp.

Rủi ro và giảm thiểu: (1) nhiều mã soạn tay ⇒ giữ wrapper nhỏ, không sinh ORM tự chế;
(2) hỏng dữ liệu khi nâng cấp schema ⇒ test migration từ mọi phiên bản, sao lưu file trước khi
migrate; (3) file phình to ⇒ `VACUUM`/giới hạn "vài tháng gần nhất" như mục 5; (4) dễ quên
transaction ⇒ chỉ mở một API công khai `write { }`, review mọi chỗ ngoài nó.

Khi nào đổi ý: nếu API spec cho thấy app chỉ cần cache đọc, không có hàng đợi ghi/xung đột,
thì SwiftData rẻ hơn và nên chọn.

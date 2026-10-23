# iOS Core API — hợp đồng cho I-2..I-5

Gói I-1 dựng lõi: mạng, token, mô hình, kho cục bộ + hàng đợi đồng bộ, phiên, design system.
Worker I-2..I-5 **chỉ thêm file dưới `Features/<nhóm>/`** và dùng các API dưới đây; không sửa `Core/**`
trừ khi lead duyệt. Nguồn nghiệp vụ: `docs/spec.md`, `plans/20261021-mvp/backend/api-spec.md`.
Nguồn giao diện: `design/prototype/src` (token đã chuyển vào `Core/DesignSystem/Tokens.swift`).

## 0. Quy ước chung

- Swift 6, strict concurrency; mọi actor/`async` gọi bằng `try await`. Không dùng thư viện ngoài.
- JSON qua `WireJSON`: `encoder()` tự đổi sang `snake_case`, ngày ISO-8601 có phần thập phân;
  `decoder()` nhận cả hai dạng ngày. Trường lạ giữ nguyên nhờ `JSONValue`.
- Chuỗi tiếng Việt hiển thị **đúng từng ký tự** như prototype; không tự đặt lại nhãn.
- Không ghi SĐT, mật khẩu, token hay nội dung nhận xét vào log.

## 1. Mạng — `Core/Networking/APIClient.swift`

```swift
struct APIEndpoint: Sendable, Hashable {              // Hashable vì StubAPIClient dùng làm khoá fixture
    enum Method { case get, post, put, patch, delete }
    let contentType: String?                          // nil = application/json khi có body
    init(method: Method, path: String, query: [String: String] = [:], body: Data? = nil,
         contentType: String? = nil, requiresAuthentication: Bool = true)
    static func json<T: Encodable>(method: Method, path: String, body: T,
                                   requiresAuthentication: Bool = true) throws -> Self
}
protocol APIClient: Sendable {
    var baseURL: URL { get }
    func send<Response: Decodable & Sendable>(_ endpoint: APIEndpoint, as type: Response.Type) async throws -> Response
}
struct EmptyResponse: Codable, Sendable, Equatable {}   // cho 204 / câu trả lời không có body
struct URLSessionAPIClient: APIClient                  // init(baseURL:tokenStore:session:) hoặc init(configuration:tokenStore:)
struct StubAPIClient: APIClient                        // fixtures chính xác theo method/path/query; thiếu fixture → 404
extension StubAPIClient { static func demo(baseURL:membershipId:bundle:) throws -> StubAPIClient }
```

`URLSessionAPIClient` tự gắn `Authorization: Bearer`, `X-Client: ios/1.0.0`, `X-Request-Id` (UUID),
`Accept: application/json`, `Content-Type` khi có body. `path` là tương đối (không chứa `://`, `..`);
query được sắp theo khoá. **Query rỗng không tạo `?`** (đã sửa ở I-1b).

Các POST tạo lớp, học sinh và buổi lẻ gửi UUID do client sinh, giữ nguyên trong suốt lần thử lại của
cùng form và gửi dạng chữ thường. `200` (phát lại cùng ID) và `201` (tạo mới) đều giải mã thân phản hồi
như thành công; `409 id_conflict` dùng lỗi chung của form hiện có, không tự sinh ID khác.

`Content-Type` tự đặt: `endpoint.contentType` nếu có, ngược lại `application/json` khi có body, và
không gửi header này khi không có body (GET/DELETE). `Accept` luôn `application/json`.

**PDF báo cáo tháng (iOS-19)** — phát hành gọi `POST /students/{studentId}/reports/{month}/publish` để
lưu bản chụp và nhận `ReportPublishResponse`. Không tải PDF lên hoặc xuống máy chủ. Giáo viên và phụ huynh
tạo PDF cục bộ từ dữ liệu báo cáo (phụ huynh dùng `ReportPublication.snapshot`) khi chạm nút xuất, ghi file
vào thư mục tạm, rồi mở `UIActivityViewController` để in, lưu vào Tệp hoặc chia sẻ. File tạm bị xoá khi
bảng chia sẻ đóng.

Lỗi:

```swift
enum APIFailure: Error, Sendable, Equatable {
    case badStatus(code: Int), decoding, offline, invalidURL, missingToken
    case server(status: Int, error: APIError, retryAfter: TimeInterval?)
    var requiresSnapshot: Bool   // true với resync_required / snapshot_required
    var retryable: Bool          // offline, 429, 5xx
}
struct APIError { code, message, details: JSONValue?, requestId }
extension APIError { var localizedMessage: String }  // câu tiếng Việt an toàn để hiện cho người dùng
```

Hiện `localizedMessage` cho người dùng, **không** hiện `message` thô từ server; không log chi tiết.

## 2. Token và phiên — `Core/Security/`

```swift
protocol TokenStore: Sendable { func token() async throws -> String?; func setToken(_) async throws; func clear() async throws }
actor InMemoryTokenStore: TokenStore     // cho test và preview
actor KeychainTokenStore: TokenStore     // service + account; cần entitlement keychain (đã khai trong QuanLyLop.entitlements)

enum SessionFailure: Error { case pendingCommands(Int) }
actor SessionController {
    init(api:tokenStore:store:push:)     // push mặc định NoOpPushRegistrar
    func logout() async throws           // chặn khi còn lệnh chờ: SessionFailure.pendingCommands(n)
    func selectMembership(_ id: String) async throws -> MembershipSelection
}
struct MembershipSelection { let activeMembershipId: String; let deviceRegistrationCleared: Bool }
```

Đổi danh tính: khoá sửa trong lúc gọi, cache/UI mới chỉ dùng **sau** khi `selectMembership` trả về.

## 3. Mô hình — `Core/Models/Entities.swift`

| Kiểu | Ghi chú bắt buộc |
|---|---|
| `Classroom` | `weekdays: [Int]?` (ISO), `startTime: String?` ("18:00"), `version: Int?` |
| `Student` | `parentPhone: String?` (không hiện cho phụ huynh), `enrolledAt`, `leftAt`, `status` |
| `ClassSession` | `sessionNumber: Int?` — **chỉ đọc từ server**, `nil` khi `status == .cancelled`. Không tự đếm buổi (Q16 đã chốt) |
| `Attendance` | `AttendanceStatus`: `present/late/excused/absent` — không có "Vắng thi" |
| `TestDefinition` | `init(...)` và `decode` mặc định `maxScore = 15`; `1...1000`; `validate(score:)`, `validateNewMaximum(_:highestScore:)` |
| `Score` | `value: Double?` — `nil` = "Chưa có điểm"; không có điểm trung bình |
| `SessionSlip` | `stars: Stars?` (1..3), `status: draft/sent`; `Stars.template` là câu mẫu cố định |
| `HomeworkSection` / `HomeworkGrade` | `HomeworkLevel`: `excellent/done/notDone`; `level: nil` = chưa chấm |
| `MonthlyReport` / `ReportPublication` / `ReportSnapshot` | báo cáo tháng; `publicationNo` để chọn bản mới nhất |
| `Workspace`, `Role`, `Membership`, `User`, `AuthSession`, `CurrentIdentity` | phân quyền và phiên |
| `SyncConflict` | xung đột ô, `serverValue`/`clientValue` |

`ModelError.invalidMaxScore` / `.scoreOutsideRange` cho kiểm tra phía client trước khi xếp hàng.

## 4. Kho cục bộ + hàng đợi — `Core/Storage/`

```swift
struct CacheScope: Codable, Sendable, Equatable { let userId, workspaceId, membershipId: String; var storageKey: String }
struct RecordKey: Codable, Sendable, Hashable { entity, k1, k2; var storageKey: String }

protocol LocalStore: Sendable {
    var scope: CacheScope { get }
    func read<Value: Decodable & Sendable>(_ type: Value.Type, forKey key: String) async throws -> Value?
    func write<Value: Encodable & Sendable>(_ value: Value, forKey key: String, enqueueing command: PendingCommand?) async throws
    func pendingCommands() async throws -> [PendingCommand]
    func pendingCommandCount() async throws -> Int
    func position() async throws -> SyncPosition?
    func claimBatch(now: Date) async throws -> [PendingCommand]
    func acknowledge(_ results: [CommandResult]) async throws
    func retry(_ ids: [UUID], now: Date, minimumDelay: TimeInterval) async throws
    func apply(_ page: PullPage) async throws
    func resetCache() async throws
    func installSnapshot(_ records: [String: [JSONValue]], position: SyncPosition) async throws
}
actor SQLiteStore: LocalStore            // SQLite3, WAL, FileProtection.completeUntilFirstUserAuthentication
extension SQLiteStore { static func open(scope:directory:) throws -> SQLiteStore; func changes() -> AsyncStream<Void>; func records(_:entity:) throws -> [Value]; func pendingCommandCountForUser() throws -> Int }
```

Quy tắc dùng:

1. Mọi thao tác ghi offline: `try await store.write(model, forKey: RecordKey(...).storageKey, enqueueing: PendingCommand(recordKey:baseVersion:kind:payload:))`.
   Ghi bản ghi + lệnh trong **một** transaction; lệnh trùng UUID không ghi lại.
2. `kind` dùng đúng danh mục `api-spec.md` mục 6.2: `attendance.set`, `score.set`, `slip.set`,
   `homework.grade.set` (bốn "ô" này được gộp khi lệnh cũ **chưa từng gửi**), cùng
   `test.create/update/delete`, `slip.send`, `homework.assign/section.upsert/section.delete`, `conflict.resolve`.
3. `baseVersion` = `version` của ô/bản ghi đang thấy (0 nếu chưa có). Không tự tăng `version`.
4. `pendingCommandCount()` đếm **mọi membership của user** → dùng cho chặn đăng xuất.
5. `claimBatch` giữ thứ tự `created_at,seq`, tối đa 50, chỉ lấy lệnh đã tới hạn; `acknowledge` xoá từng
   lệnh theo kết quả riêng (`applied`, `duplicate` có `originalStatus`, `conflict`), giữ `rejected` kèm lỗi.
   `duplicate` thiếu `originalStatus` được đưa lại hàng đợi với **cùng UUID** (đã sửa ở I-1b).
6. `changes()` phát tín hiệu sau mỗi transaction để View cập nhật.

## 5. Đồng bộ — `Core/Sync/SyncCoordinator.swift`

```swift
actor SyncCoordinator {
    init(api: any APIClient, store: any LocalStore, deviceId: String)
    func synchronize(now: Date = .now) async throws
}
```

- Gọi khi mở app, khi lấy lại foreground, sau mỗi lần sửa và mỗi 60 giây khi app active có mạng
  (hẹn giờ ở tầng App, không nằm trong Core).
- Lần đầu (chưa có `position`) → `snapshot` rồi `pull`; sau đó vòng `push` (≤50 lệnh) rồi `pull`.
- Không tiến `cursor` theo `push`; giữ lệnh khi mất mạng/`rejected`; `resync_required` /
  `snapshot_required` → `resetCache()` + `snapshot` + `pull`; `404`/`unauthorized`/`account_disabled` → `resetCache()`.
- Không tự sleep/retry trong actor; hạn retry nằm trong SQLite (`retry(_:now:minimumDelay:)`).

Kiểu phụ: `PushRequest`, `PushResponse`, `PullPage`, `SnapshotManifest`, `SnapshotPage`,
`CommandResult`/`CommandStatus`, `SyncCommand`, `SyncPosition`, `QueuedCommand`, `SyncFailure`.

## 6. Push — `Core/Push/PushRegistrar.swift`

```swift
protocol PushRegistrar: Sendable { func register(membershipId: String) async throws; func clearDeliveredNotifications() async }
struct NoOpPushRegistrar: PushRegistrar     // Firebase để sau; I-1 chưa nối FCM
```

## 7. Design system — `Core/DesignSystem/`

Token (đầy đủ trong `Tokens.swift`, bảng đối chiếu trong `docs/report-i1.md`):

```swift
enum AppColors { canvas, background, surface, border, divider, inputBorder, inputBorderStrong, text,
                 muted, placeholder, primary, primaryInk, primarySoft, onPrimary, success, successSoft,
                 warning, warningSoft, error, errorSoft, neutralSoft, scrim }   // giá trị cố định theo prototype (light)
enum AppRadius { card = 16, row = 14, control = 14, button = 12, chip = 10, pill = 999, sheet = 20, ... }
enum AppMetrics { tap = 44, inputHeight = 52, buttonHeightSmall/Medium/Large = 44/48/52, ... }
enum AppText { body, title, titleCompact, heading, subheading, label, muted, caption, chip, pill, segment,
               buttonSmall/Medium/Large, homeworkLevel, noticeTitle, noticeBody, emptyTitle, fieldError }
enum AppFont { postScriptName = "PlusJakartaSans-Regular"; static func font(size:weight:) -> Font }
extension View { func appText(_ style: AppTextStyle) -> some View }
```

Thành phần (`Components.swift`):

| Thành phần | Dùng cho |
|---|---|
| `AppButton(title:systemImage:variant:size:action:)`, `AppButtonStyle(variant:size:)` | nút; variant `primary/secondary/surface/neutral/danger/ghost`, size `small/medium/large` |
| `AppTextField(label:text:placeholder:error:secure:...)` | ô nhập có nhãn, lỗi, viền focus |
| `AppCard(selected:)`, `AppListRow { }` | thẻ nội dung; hàng danh sách mobile |
| `AppChip(title:)` | chip thống kê (8/10, nền `--color-bg`) |
| `AppPill(title:tone:)` | pill trạng thái, 5 tông |
| `AttendanceStatus.label/.pill` | "Có mặt / Muộn / Có phép / Vắng" + màu đúng |
| `HomeworkLevel.label/.pill`, `AppHomeworkPill(level:)`, `AppHomeworkLevelControl(level:setLevel:)` | chấm BTVN 3 mức (nút 3 lựa chọn như prototype) |
| `AppSegmented(options:value:select:)` | tab con (Điểm danh / Nhận xét / Bài tập về nhà) |
| `AppSheet(title:content:footer:close:)` | bottom sheet: header + "Đóng", thân cuộn, footer dính |
| `AppEmptyState(title:detail:)`, `AppErrorState(message:retry:)`, `AppSpinner()` | trạng thái rỗng / lỗi / đang tải |

Xem nhanh mọi thành phần: chạy app với `SIMCTL_CHILD_QLH_DESIGN_GALLERY=1` (hoặc `=sheet` để mở sheet),
hoặc mở `#Preview` trong `DesignSystem/Previews.swift`. Ảnh đối chiếu: `docs/screens/`.

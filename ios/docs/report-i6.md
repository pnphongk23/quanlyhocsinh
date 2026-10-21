# Báo cáo iOS I-6 · Offline UX + Push + quy tắc xung đột mới + chạy thật qua Staging

Worktree `mvp-ios`, gói `ios/`. Brief: `briefs/ios-09-offline-push-staging.md` + phần tiếp nối
`briefs/ios-10-resume.md`. Phạm vi sửa: `Core/**`, `App/**`, `QuanLyLopTests/Core/**`,
`QuanLyLopTests/*` của lõi, `Config/*`. Không đụng `Features/**`.

Kế thừa từ lượt trước (đã commit trước phiên này): dấu lỗi lưu trong khung app
(`SaveStatusBanner`, `SyncStatusCenter`), đăng ký token no-op (`AppPush`, `APIDeviceTokenRegistrar`),
chuỗi Core/App vào `Localizable.xcstrings`, `API_BASE_URL` trỏ staging thật.

Phiên này: (1) soát lại toàn bộ đường đồng bộ theo quy tắc mới, sửa chỗ còn lệch, (2) build + test
xanh, (3) chạy thật qua staging, (4) báo cáo.

## 1. Quy tắc xung đột đồng bộ MỚI (đã áp trong mã)

Người dùng chốt 2026-10-21: hai thiết bị sửa cùng một ô ⇒ thay đổi **tới máy chủ sau cùng thắng**;
không UI xung đột, không cờ, không lưu hai giá trị. Đối chiếu `api-spec.md` mục 6 và bổ sung hợp
đồng của Backend (`ios-09`, mục cuối).

| Chỗ | Trạng thái | Ghi chú |
|---|---|---|
| `CommandStatus` | `applied, duplicate, conflict, rejected` | `conflict` chỉ còn để **giải mã** phản hồi của máy chủ cũ; không có nhánh nghiệp vụ riêng |
| `SyncCoordinator.acknowledge` | `conflict` xử lý y như `applied` | đúng chỉ dẫn "nếu api-spec chưa đổi thì tạm xử lý `conflict` như `applied`, không code nhánh mới" |
| `duplicate` | `original_status` = `applied`/`conflict` ⇒ xoá lệnh; `rejected` ⇒ đánh dấu lỗi; thiếu `original_status` ⇒ gửi lại **đúng UUID** | idempotent theo UUID, không sinh UUID mới |
| `rejected` | giữ lệnh, lưu `error`, `state='rejected'`; `claimBatch` bỏ qua mọi lệnh `rejected` | lỗi quyền/hợp lệ, không tự thử lại, không xoá thầm |
| `pull` | upsert có chặn theo `version`; bản máy chủ thắng bản lạc hậu; `deleted` xoá bản cục bộ | ô đã sửa ở máy khác ghi đè bản local đúng như bản kéo về |
| Giá trị lạc quan | ghi kèm `version = -1` (placeholder) | sau khi `applied`, `pull` mang bản máy chủ về và thắng cả khi cùng version |
| Thực thể `conflict` | không có model, không có màn hình, không cờ | `snapshot` vẫn chấp nhận tên `conflict` để không vỡ với máy chủ cũ, nhưng bỏ qua |
| `SyncStatusCenter` | chỉ có `synced`/`error`; `error` = lần đồng bộ lỗi **hoặc** còn lệnh `rejected` | không có trạng thái xung đột, không chip thường trực |

### Sửa thêm trong phiên này (lỗ hổng của quy tắc mới)

`ios/QuanLyLop/Core/Storage/SQLiteStore.swift`:

1. `read` chỉ lấy overlay từ lệnh **chưa gửi** (`state IN ('pending','sending')`). Lệnh `rejected`
   không còn che giá trị máy chủ ⇒ không còn "hai giá trị" trên màn hình, và `pull` thắng đúng như
   mục 6.
2. Lần gửi bị `rejected` xoá placeholder `version = -1` của ô ⇒ ô trở về giá trị đã kéo về (hoặc rỗng),
   lệnh vẫn nằm trong outbox làm nguồn của nhãn lỗi.
3. Giáo viên sửa lại đúng ô đó: lệnh `rejected` cũ của cùng `record_key` + `kind` bị thay thế ⇒ dấu
   lỗi tắt được, và chặn đăng xuất (spec 5.3) không còn treo vĩnh viễn sau một lần bị từ chối.

Test mới: `QuanLyLopTests/Core/RejectedCommandTests.swift` (4 ca: rơi về bản máy chủ, ô mới để trống,
sửa lại thay lệnh bị từ chối, overlay của lệnh đang chờ vẫn hiện).

## 2. Offline UX

- Chỉ hiện khi lỗi: `SaveStatusBanner` vẽ pill `Lỗi lưu — vui lòng thử lại` (đúng prototype
  `src/shared/SaveStatus`), gắn vào khung bằng `safeAreaInset(edge: .top)` trong `App/ContentView.swift`;
  các trạng thái khác không vẽ gì.
- Nguồn trạng thái duy nhất: `SyncStatusCenter` (khoá + `@Observable`), `SyncCoordinator` ghi sau
  **mỗi** lần đồng bộ (`synced` khi sạch, `error` khi lỗi hoặc còn lệnh `rejected`).
- `SessionController` reset khi đăng xuất/đổi membership ⇒ lỗi của tài khoản cũ không lọt sang.
- Test: `QuanLyLopTests/Core/SaveStatusTests.swift`, `SyncReportingTests.swift` (đồng bộ sạch ⇒ im
  lặng; lỗi mạng ⇒ hiện; `rejected` ⇒ hiện; `conflict` legacy ⇒ im lặng).

## 3. Push (no-op, đúng phạm vi)

- `ios/` **không có** `GoogleService-Info.plist` ⇒ không thêm Firebase SDK. `AppPush.registerIfSignedIn()`
  chỉ chạy khi có token; `UnavailableDeviceTokenSource` trả `nil` nên **không có request nào**.
- Phần thật đã có và có test (`QuanLyLopTests/Core/PushRegistrationTests.swift`): `PUT /device-tokens`
  với `{token, platform:"ios"}`, nhận `id/registration_version/bound_at/platform/updated_at`, không gửi
  user/workspace trong body, không log token (chỉ id + version).
- Bật sau (3 bước): (a) thêm `GoogleService-Info.plist` + SPM `firebase-ios-sdk` (Messaging), bật
  capability Push Notifications; (b) thay `UnavailableDeviceTokenSource` bằng `Messaging.token()`
  (hoặc `DeviceTokenBox.set(...)` trong callback `didReceiveRegistrationToken`); (c) giữ nguyên
  `AppPush` — đăng ký lại khi mở app/foreground đã nối sẵn. Debug: biến môi trường
  `SIMCTL_CHILD_QLH_PUSH_TOKEN` để thử API khi chưa có Firebase.

## 4. Localization

- Rà `Localizable.xcstrings` (vi): 36 khoá dùng trong `Core/**` + `App/**` — **đủ 100%**, tất cả
  `state = translated` (script đối chiếu literal `String(localized:)`/`Text("key")` với catalog).
- `Features/**` vẫn viết chuỗi tiếng Việt trực tiếp (không qua khoá), thuộc I-8: Attendance 16,
  Auth 85, Classes 158, Comments 51, Guardian 94, Homework 51, Reports 65, Scores 87 (đếm literal có
  dấu tiếng Việt). Chỉ liệt kê, không sửa.

## 5. Lệnh và kết quả

| Lệnh | Kết quả |
|---|---|
| `xcodegen generate` | OK (project sinh lại, có `QuanLyLopTests/Core/RejectedCommandTests.swift`) |
| `xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i6 CODE_SIGNING_ALLOWED=NO build` | `** BUILD SUCCEEDED **` |
| `... TEST` (trước khi thêm test mới) | `** TEST SUCCEEDED **`, 100 test, 2 skip, 0 lỗi |
| `... TEST` (sau khi thêm 4 test) | `** TEST SUCCEEDED **`, 104 test, 2 skip, 0 lỗi |
| `xcodebuild ... build` (không `CODE_SIGNING_ALLOWED=NO`, để chạy simulator) | `** BUILD SUCCEEDED **`, ký "Sign to Run Locally" + entitlements keychain |

2 test skip là `NetworkingTests` (Keychain cần host app ký) và ca screenshot — có từ trước.

**Phát hiện về môi trường chạy simulator:** app build bằng `CODE_SIGNING_ALLOWED=NO` (không entitlement)
vẫn cài được nhưng **mọi lệnh ghi Keychain thất bại**, nên đăng nhập thật hiện
`Không thể kết nối dịch vụ. Vui lòng thử lại.` (thông báo chung cho lỗi không phải `APIFailure`).
Muốn chạy staging phải build có ký ad-hoc như bảng trên.

## 6. Chạy thật qua staging (2026-10-21, `https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1`)

Thông tin demo đọc từ `/tmp/qlh-staging-demo.txt` (ngoài repo). Không in SĐT/mật khẩu/token ở bất kỳ
đâu; các lệnh dưới đây chỉ in mã trạng thái/số đếm/id kỹ thuật.

| Việc | Lệnh / cách | Kết quả |
|---|---|---|
| API sống | `GET /v1/health` | `200` |
| Đăng nhập (CLI) | `POST /v1/auth/login` (tài khoản demo giáo viên) | `200`, `must_change_password=false`, 1 membership `Admin` |
| Đăng nhập **trong app** | Maestro flow `maestro/staging/01-login.yaml` (bỏ `takeScreenshot`), simulator iPhone 16 | `Đăng nhập` → nhập demo → `Lớp của tôi` hiện, `saveStatus.error` **không** hiện |
| Danh sách lớp | app vẽ thẻ `6A, 8 học sinh, Chuyên cần 93%` | khớp `GET /v1/classes` (1 lớp `6A`) |
| Buổi học | `GET /classes/{id}/sessions?from&to` | 5 buổi (14/10 `held`, 16/10 `held`, 22/10 `planned`, 24/10 `planned`, 27/10 `cancelled`) |
| Điểm danh trong app | mở lớp → chọn buổi 14/10 → tab `Điểm danh` | 8 học sinh, trạng thái hiển thị khớp `GET /sessions/{id}/attendance` (`Bảo Nam: Có mặt`, `Khánh Linh: Muộn`, …) |
| Ghi qua hàng đợi (hợp đồng) | `POST /v1/sync/push` đúng hình dạng `SyncCommand` của Core: `attendance.set`, `base_version=1` | `200`, `{status:"applied", version:2}` |
| Gửi lại đúng UUID | cùng lệnh trên | `200`, `{status:"duplicate", original_status:"applied", version:2}` — idempotent theo UUID |
| `base_version` cũ (giá trị khác) | `attendance.set`, `base_version=1` khi ô đã `version=2` | `200`, `{status:"conflict"}` — **staging chưa chạy backend-10** (xem Câu hỏi 1) |
| Xác minh phía máy chủ | `GET /sessions/{id}/attendance` | ô thành `absent`, `version=2` ⇒ lệnh có hiệu lực thật |
| Trả dữ liệu demo | `attendance.set` `present`, `base_version=2` | `applied`, `version=3`; GET lại `present` |

Lỗi hợp đồng gặp và cách xử lý: `POST /sync/push` trả `422 validation_error invalid_id` khi
`device_id` không phải UUID (server `uuid.test` cả `membership_id`, `device_id`, `command.id`,
`session_id`, `student_id`). Core dùng `identifierForVendor` (UUID) nên **không phải sửa client**;
ghi lại để web/CLI khỏi dùng device id dạng chuỗi tự do.

### Phần chưa chạy được trọn vẹn

Thao tác **ghi điểm danh bằng UI trong app rồi đồng bộ** chưa hoàn tất: Maestro trên simulator dùng
chung lần lượt (a) `launchApp` xong app bị đẩy về SpringBoard, (b) flow không `launchApp` thì app đã bị
dừng từ lượt trước, (c) vài lượt treo driver tới hết timeout, (d) chạm vào thẻ lớp không mở được màn
chi tiết trong 25 s. Máy cũng tụt xuống **1,4–1,5 GB trống** (dưới ngưỡng 2 GB của `ios-10-resume`),
nên đã dừng các lượt chạy nặng. Vì vậy phần "ghi qua hàng đợi" được xác minh ở hai lớp: unit test
cho outbox/`acknowledge` (`CoreTests`, `RejectedCommandTests`, `SyncReportingTests`) và **hợp đồng
thật với staging** ở bảng trên. Đường UI: đăng nhập + danh sách lớp + màn điểm danh đã chạy thật.

## 7. Đĩa (theo `ios-10-resume.md`)

- Dùng đúng một derivedData `/tmp/qlh-dd-i6`, xoá sau khi build/test xong; app đã cài giữ lại
  `/tmp/i6-app.app` rồi xoá; ảnh chụp chỉ tạo khi cần và đã xoá.
- Đã dọn: `code_sign_clone.*` cũ hơn 1 giờ của Chrome (3 thư mục), toàn bộ
  `$TMPDIR/maestro_xctestrunner_xcodebuild_output*` sau mỗi lượt Maestro, `~/.maestro/tests/*`.
- Không xoá được `$TMPDIR/com.docker.install` (4,3 GB): bên trong là volume DMG **mount read-only**
  (`DockerDesktop-241994`) từ 12/10, `rm` trả "Read-only file system". Cần `hdiutil detach` của người
  dùng Docker — đây là phần lớn dung lượng còn chiếm chỗ.

## 8. Câu hỏi

1. **`backend-10` chưa lên staging**: `base_version` cũ vẫn trả `conflict` (bảng mục 6) và
   `api-spec.md` mục 6.1/6.5 + `offline-plan.md` vẫn còn `conflict`/`conflict.resolve`. Client đã theo
   quy tắc mới (coi `conflict` như `applied`, `pull` lấy bản máy chủ), nhưng cho tới khi máy chủ đổi thì
   "lệnh tới sau cùng thắng" **chưa đúng thật**: lệnh sau bị bỏ, máy chủ giữ giá trị cũ. Cần deploy
   backend-10 + cập nhật spec trước khi coi tính năng này xong.
2. **Lỗi UI ngoài phạm vi I-6 (Features/Attendance)**: hàng điểm danh cuối (`Minh Anh`) nằm dưới thanh
   tab nổi (y 789–833 trên màn 852), không chạm được ⇒ không đổi được trạng thái cho em cuối danh sách.
   Cần I-8 thêm padding dưới bằng `TeacherMetrics.tabBarHeight`.
3. **Lệnh `rejected` không có lối thoát trong UI**: chặn đăng xuất theo spec 5.3 nhưng không có nút
   thử lại/bỏ; hiện chỉ thoát được nếu giáo viên sửa lại đúng ô đó. Cần lead chốt: thêm hành động trên
   pill lỗi, hay cho phép bỏ lệnh `rejected` khi đăng xuất.
4. **Maestro trên máy dùng chung**: 3 worker cùng chạy simulator/Maestro làm lượt chạy của nhau bị
   nhiễu (log `maestro-driver-iosUITests-Runner`, `found nothing to terminate`). Nếu cần chạy staging
   lặp lại, nên có "cửa sổ" độc quyền cho một worker.

Status: DONE_WITH_CONCERNS

Quy tắc đồng bộ mới (bỏ xung đột, lệnh tới sau thắng, `rejected` giữ lỗi) đã áp đủ trong `Core/**`
và có test; build + 104 test xanh; app đăng nhập thật, hiện danh sách lớp và màn điểm danh của staging.
Còn hai việc ngoài tay I-6: backend-10 chưa deploy (staging vẫn trả `conflict` cho `base_version` cũ)
và thao tác ghi điểm danh bằng UI chưa chạy trọn vì Maestro nhiễu + đĩa xuống dưới 2 GB.

# DA-1 · Rà soát mã: mỗi thao tác đọc/ghi của web đi đường nào

Ngày 2026-10-23. Chỉ đọc mã, không gọi staging, không đo. Mọi kết luận về thời gian/độ trễ là **suy từ mã, chưa đo** (việc của DA-2).
Web: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh `mvp-web`, HEAD f79d640). Backend: `.../mvp-backend/worker/src` (HEAD 8fac5d6). Đường dẫn dưới đây tính từ gốc worktree tương ứng.
Một chỗ chưa đối chiếu được với mã nguồn thư viện: hành vi revalidate mặc định của React Router 7 (hook chặn đọc `node_modules`); dựa vào tài liệu RR ("loader chạy lại khi search params đổi"). DA-2 nên xác nhận bằng một lần đo.

## 0. Tóm tắt (đọc phần này trước)

1. **Chỉ một đường đọc cho giao diện thật**: `Dexie → hydrateStore() → store.ts (bộ nhớ) → repository (getStore())`. Không màn nào gọi REST `GET` danh sách (`GET /classes`, `/classes/:id/students`, `/calendar`, `report-preview`… có kiểu trong `api/client.ts` nhưng **không có chỗ gọi**). `seed.ts`/`defaults.ts` chỉ test dùng (production không import). Dữ liệu duy nhất không đến từ API: trạng thái hiển thị cục bộ (`guardianSeen`, `draftStore`, `guardianContext`, cờ PWA).
2. **Ghi chia hai nhóm**: (a) qua outbox/`sync/push` (điểm danh, điểm, bài kiểm tra, phiếu, BTVN); (b) REST trực tiếp, cần mạng (lớp, học sinh, buổi, huỷ buổi, đổi lịch, báo cáo). Nhóm (b) chỉ cập nhật bộ nhớ (riêng học sinh còn ghi Dexie); lần `hydrateStore()` kế tiếp thay toàn bộ bộ nhớ bằng Dexie nên kết quả chỉ giữ nếu `pull` mang nó về.
3. **Làm mới dữ liệu chỉ có một cơ chế: `syncNow()`** (push → pull → hydrate). Trình kích hoạt: mở/đổi route có loader (qua `initializeSession`), `focus`, `online`, `setInterval` 120 s, 2 s sau một ghi qua outbox, mount tab Nhận xét. **Không màn nào tự kéo dữ liệu khi mở** (không có hook "refresh on mount"). Vì vậy thiết bị B thấy học sinh mới của A sau tối đa ≈ 120 s (nếu cửa sổ vẫn focus) hoặc không giới hạn (nền/iOS PWA bị treo timer, không có `visibilitychange`).
4. **Nghi vấn chậm lớn nhất**: loader gác route (`routes.tsx:31-32`) gọi `initializeSession()` → `GET /me` **chặn điều hướng** → `hydrateStore()` → `syncNow()`. Với React Router, đổi `?tab=` (3 tab Điểm danh/Nhận xét/BTVN, `SessionDetailPage.tsx:123`) làm loader chạy lại ⇒ **mỗi lần đổi tab = một `GET /me` chặn + hydrate toàn bộ Dexie (12 bảng) + một `GET /sync/pull` + hydrate lần hai**. Chọn vai trò lần đầu = `PUT /session/membership` + snapshot tuần tự 13 request, UI trống tới khi xong cả chuỗi (không hydrate giữa chừng).
5. **Lỗi/nghi lỗi dữ liệu** (chi tiết mục 4): bình luận nạp từ Dexie có `classId: ""` ⇒ `listComments(classId)` rỗng ⇒ báo cáo tháng (sao, phiếu đã gửi, BTVN lộ) và trạng thái "đã gửi" ở desktop sai sau khi tải lại; `updateClassSchedule*` sinh buổi cục bộ bằng UUID riêng không trùng id máy chủ; "khôi phục buổi" chỉ cục bộ; snapshot ghi `cursor` trước khi tải xong mọi thực thể.

---

## 1. Hạ tầng đọc/ghi dùng chung

| Thành phần | Vai trò | Bằng chứng |
|---|---|---|
| Dexie `qlh-web` | Cache bền: 11 bảng thực thể + `outbox` + `meta{cursor,epoch}`, khoá theo `identity = userId:workspaceId:membershipId` | `src/data/db.ts:15-44`, `:46-52` |
| `store.ts` | Bản sao trong bộ nhớ (`StoreState`), mọi repository đọc `getStore()`; `useStore()` bằng `useSyncExternalStore` | `src/data/store.ts:9-19` |
| `hydrateStore()` | Đọc **toàn bộ 12 bảng** của identity (`where("identity").equals`) rồi **thay** cả state | `store.ts:21-40` |
| `commitState()` | Sửa bộ nhớ (sao chép 14 mảng) + `replaceStore` ⇒ mọi component dùng `useStore()` render lại | `src/data/outbox.ts:8-11` |
| `persistCommand()` | Một transaction Dexie: ghi bản ghi + dòng outbox (+gộp lệnh cùng ô, `depends_on` cho `score.set`←`test.create`) rồi `scheduleSync()` | `outbox.ts:22-49` |
| `syncNow()` | Đẩy outbox (≤50/lô) → `pull()` → `hydrateStore()` → cập nhật trạng thái lưu | `src/data/sync.ts:128-174` |
| `pull()` / `snapshot()` | `meta` chưa có ⇒ snapshot; 409 `resync_required`/`snapshot_required` ⇒ xoá cache + snapshot; 401 ⇒ xoá phiên; 403/404 ⇒ mất vai trò | `sync.ts:69-104` |
| `cursor`/`epoch` | Lưu trong Dexie bảng `meta`, khoá = identity (`db.meta.put({key:identity, cursor, epoch})`) | `sync.ts:66`, `:79` |
| `api` client | `fetch` + timeout 15 s, không retry, không cache, không huỷ khi rời màn | `src/data/api/client.ts:39-70` |
| Trình kích hoạt | `online`, `focus` (window), `setInterval(120 000)`; `scheduleSync(2000)` sau ghi outbox; `scheduleSync(0)` từ `flushQueuedTickets`; `activateMembershipCache` ⇒ `void syncNow()` | `sync.ts:186-190`; `outbox.ts:43`; `comments.ts:18`; `auth/session.ts:44` |
| `updateStoreView`/`toView` | **Mã chết**: định nghĩa ở `sync.ts:22-53`, không có nơi gọi | tìm `updateStoreView` toàn `src` chỉ ra định nghĩa |

Quy ước cột trong bảng mục 2:
- **SYNC** = `syncNow()` (push outbox → `GET /sync/pull` ≥1 trang → `hydrateStore`). **T** = tập trình kích hoạt SYNC: `focus`, `online`, interval 120 s, route-loader (mục 3.4), mount CommentsPanel/Desktop, và 2 s sau một ghi outbox của chính máy đó.
- "Thiết bị 2" = thiết bị B, đang mở app, không thao tác. Trả lời cho B: **tối đa ≈120 s** nếu cửa sổ B đang focus và hiển thị (interval là cơ chế duy nhất chắc chắn chạy; `focus` không bắn lại khi cửa sổ vốn đã focus); với ghi qua outbox của A cộng thêm ≈2 s (debounce) + độ trễ push. Khi B ở nền hoặc là PWA iOS bị treo: không giới hạn tới lúc `focus`/`online`/loader.
- Khoảng "chặn UI?": mọi **đọc** là cache-trước (đọc `getStore()` đồng bộ, không có trạng thái "đang tải" nào trong `src`); chỉ **loader route** và các **ghi REST** `await` mạng.

---

## 2. Bảng thao tác

### 2.1 Phiên, vai trò, `/me`

| Thao tác | Màn/hook gọi | Hàm repository | Đường dữ liệu | Khi nào kéo mới | Chặn UI / cache trước | Thiết bị 2 | Ghi chú/nghi vấn |
|---|---|---|---|---|---|---|---|
| Mở app / vào route nhân sự hoặc phụ huynh | `app/routes.tsx:31-39` (loader mọi route gác) | `auth/session.ts:74-111` `initializeSession` | REST `GET /me` → `activateMembershipCache` → Dexie→`hydrateStore` → `void syncNow()` | Mỗi lần loader chạy (mở app, đổi `?search`, sau action); `initialization` được xoá trong `finally` nên **không cache giữa các lần** | **Chặn** điều hướng tới khi `/me` xong hoặc quá 15 s; `HydrateFallback: () => null` ⇒ trắng lúc mở lạnh | — | Offline/mạng chậm: lỗi mạng bị nuốt (`session.ts:106`) nhưng vẫn chờ tối đa timeout 15 s |
| Mở trang tài khoản (`/cai-dat`) | `roles/account/routes.ts:11-31` | như trên | như trên | như trên | Chặn như trên | — | Trang `/chon-vai-tro`, `/dang-nhap` **không** có loader |
| Đăng nhập | `features/auth/LoginPage.tsx:21` | `auth/index.ts:7-13` `login` | REST `POST /auth/login` → `GET /me` → `activateSession` → hydrate → `void syncNow()` | Một lần; sau đó điều hướng tới route có loader ⇒ `GET /me` thêm lần nữa | Chặn nút đăng nhập | — | `GET /me` gọi 2 lần liền (login, rồi loader đích) |
| Đăng ký GV / PH | `RegisterPage.tsx:55-56` | `auth/index.ts:14-23` | REST `POST /auth/register[-guardian]` → `GET /me` → như login | một lần | chặn nút | — | — |
| Chọn vai trò (≥2 vai) | `RolePickerPage.tsx:46-51` (`choose`); tự chọn khi chỉ 1 vai `:29-31`; Cài đặt `SettingsPage.tsx:394` | `access.ts:28-34` `switchRole` / `auth/index.ts:41-48` `switchMembership` | REST `PUT /session/membership` → `activateMembershipCache` (hydrate, `void syncNow`) → `navigate` → loader `GET /me` → hydrate lần 2; nền: **snapshot** nếu `meta` chưa có | Chuỗi theo mục 3.4 | **Chặn** nút (`busy`) tới khi PUT xong, rồi chặn điều hướng tới `GET /me`; `/lop` mở với store trống tới hết snapshot | B không bị ảnh hưởng (đổi vai là theo phiên) | Không có chỉ báo "đang tải" ⇒ màn trống trông như "chưa có lớp" |
| Danh sách vai trò, quyền (`useAccess`, `can`) | mọi màn (`access.ts:74-81`) | `access.ts:19-60` | **Chỉ session** (`localStorage qlh.session.v1`, từ `GET /me` lúc mở/đổi) | Khi loader chạy `GET /me` | Cache trước | Đổi quyền ở B hiện sau lần `/me` kế | `can()` tính lại mỗi render từ `getSession()`; quyền không có trong Dexie |
| Đổi mật khẩu | `ChangePasswordPage.tsx:36`, `SettingsPage.tsx:280` | `auth/index.ts:24-27` | REST `POST /auth/change-password` → `GET /me` → `updateMe` → hydrate+SYNC | một lần | chặn | — | — |
| Đăng xuất | `SettingsPage.tsx:148,300` | `auth/index.ts:28-40`, `outbox.ts:57-72` | Dexie `beginLogout` (khoá) → REST `POST /auth/logout` → `clearUserCache` | — | chặn; bị từ chối nếu còn outbox (`outbox.ts:61`) | — | — |

### 2.2 Lớp

| Thao tác | Màn/hook | Hàm repo | Đường dữ liệu | Khi nào kéo | Chặn/cache | Thiết bị 2 | Ghi chú |
|---|---|---|---|---|---|---|---|
| Xem danh sách lớp | `ClassListPage.tsx:92` (+`:51-52`,`:102` học sinh/tỷ lệ chuyên cần mỗi thẻ) | `classes.ts:10` `listClasses` | `store.ts` ← Dexie `classes` ← `sync/pull` / `snapshot` | không tự kéo; theo T | cache trước, không loading | ≤120 s (T) | mỗi thẻ lớp quét `students`+`sessions`+`attendance` trong bộ nhớ (O(lớp × dữ liệu)) |
| Lịch tuần (mọi lớp) | `SchedulePage.tsx:171` | `classes.ts:10`, `sessions.ts:98` `listPlannedSessions` | như trên (`class`, `class_session`) | theo T | cache trước | ≤120 s (T) | Snapshot chỉ phủ cửa sổ −90…+56 ngày (`sync-read.ts:69-72`) |
| Tạo lớp | `NewClassPage.tsx:31` | `classes.ts:13-22` `createClass` | **REST** `POST /classes` → `commitState` (chỉ bộ nhớ) | không `scheduleSync` sau đó; buổi lặp do máy chủ sinh (≈8 tuần) về qua `pull` ở lần SYNC kế | `await` mạng; cần online | ≤120 s (T) | Lớp mới **chỉ ở bộ nhớ** tới khi pull; hydrate xen giữa (SYNC khác kết thúc) có thể làm lớp biến mất rồi hiện lại. Buổi của lớp mới chưa có trong máy tạo cho tới SYNC kế |
| Sửa tên lớp | `EditClassModal.tsx:31` | `classes.ts:23-30` `updateClass` | REST `PATCH /classes/:id` → `commitState` | — | await mạng | ≤120 s (T) | như trên (không ghi Dexie) |
| Sửa lịch lặp (ngày/giờ) | `EditClassSchedule.tsx:118` | `sessions.ts:80-84`,`86-90` `updateClassSchedule[WithName]` | REST `PATCH /classes/:id` → **tự dựng buổi cục bộ** (`crypto.randomUUID()`) trong bộ nhớ | — | await mạng | ≤120 s (T) | **Nghi lỗi**: id buổi cục bộ ≠ id máy chủ (`classes.ts:48-60` máy chủ tự sinh UUID, 56 ngày; client xem trước 28 ngày `sessions.ts:78`); tới SYNC kế bộ nhớ bị thay bằng bản máy chủ. Điểm danh vào buổi "ma" ⇒ lệnh `attendance.set` bị từ chối (không tìm thấy buổi) |
| Lưu trữ lớp | `ClassSpaceLayout.tsx:128`, `ClassDesktopHeader.tsx:131` | `classes.ts:31-37` `archiveClass` | REST `PATCH /classes/:id {status:archived}` → `commitState` | — | await mạng | ≤120 s (T) | — |
| Chọn lớp hiện tại | `ClassSpaceLayout.tsx:73`, `ClassDesktopHeader.tsx:105` | `classes.ts:38-39` | **chỉ bộ nhớ** (`currentClassId`) | — | — | không | mất khi tải lại |

### 2.3 Học sinh

| Thao tác | Màn/hook | Hàm repo | Đường dữ liệu | Khi nào kéo | Chặn/cache | Thiết bị 2 | Ghi chú |
|---|---|---|---|---|---|---|---|
| Danh sách học sinh | `StudentsPage.tsx:35`, `StudentsDesktop.tsx:56`, `ClassDesktopHeader.tsx:99`, `TestsTab.tsx:19`… | `students.ts:10` `listStudents` | `store.ts` ← Dexie `students` ← pull/snapshot | **không** kéo khi mở màn; theo T | cache trước | ≤120 s (T); **không giới hạn** nếu B ở nền | xem mục 1.3 |
| Thêm học sinh | `StudentsPage.tsx:52`, `StudentsDesktop.tsx:77` | `students.ts:13` `createStudent` | **REST** `POST /classes/:id/students` → Dexie `students.put` (`persistStudent`, fire-and-forget) + `commitState` | không `scheduleSync`; pull sau này mang lại cùng bản ghi (so `version`) | await mạng; cần online | ≤120 s (T) | Máy A thấy ngay; **không** đẩy `cursor`. Lỗi ghi Dexie chỉ đặt `setSaveStatus("error")` |
| Sửa SĐT phụ huynh | `StudentsDesktop.tsx:101` | `students.ts:16` `updateStudentPhone` → `patchStudent` `:14` | REST `PATCH /students/:id` → Dexie put + `commitState` | — | await mạng | ≤120 s (T) | máy chủ liên kết/gỡ liên kết phụ huynh và tăng `scope_epoch` của membership phụ huynh (`worker/src/db/students.ts:49,78`) ⇒ phụ huynh nhận 409 `resync_required` rồi snapshot lại toàn bộ ở SYNC kế |
| Cho nghỉ | `StudentsPage.tsx:70`, `StudentsDesktop.tsx:306` | `students.ts:17` `markStudentLeft` | như trên | — | — | ≤120 s (T) | — |
| Sửa tên | (không thấy chỗ gọi `updateStudent` trong `src/features`) | `students.ts:15` | — | — | — | — | hàm không dùng ở UI |

### 2.4 Buổi học

| Thao tác | Màn/hook | Hàm repo | Đường dữ liệu | Khi nào kéo | Chặn/cache | Thiết bị 2 | Ghi chú |
|---|---|---|---|---|---|---|---|
| Danh sách buổi của lớp | `SessionsTab.tsx:33`, `SessionsDesktop.tsx:114` | `sessions.ts:14` `listSessions` | store ← Dexie `sessions` ← pull/snapshot | theo T | cache trước | ≤120 s (T) | `SessionsDesktop.tsx:130-140` mỗi buổi gọi `listStudentsForSession`+`listAttendance`+`listHomeworkSections` (quét bộ nhớ mỗi lần render) |
| Mở một buổi | `SessionDetailPage.tsx:66-67` | `sessions.ts:16,20` | như trên | xem 3.4 | cache trước | — | — |
| Lịch lặp (sinh buổi) | **không có ở web** | — | máy chủ: tại `POST /classes` / `PATCH /classes` (`classes.ts:66-88`,`126-176`) + cron `session-generation.ts` | buổi về qua pull | — | ≤120 s (T) | — |
| Thêm buổi lẻ | `AddSessionModal.tsx:57` | `sessions.ts:24-29` `createExtraSession` | **REST** `POST /classes/:id/sessions` → `commitState` | — | await; cần online | ≤120 s (T) | chỉ bộ nhớ (không Dexie) |
| Sửa buổi lẻ | `AddSessionModal.tsx:49` | `sessions.ts:31-61` `updateExtraSession` | REST `PATCH /sessions/:id` (kèm `base_version`) → `commitState` | — | await | ≤120 s (T) | lỗi mạng ghi vào biến module `extraSessionUpdateError` |
| Huỷ buổi | `SessionsTab.tsx:59`, `SessionsDesktop.tsx:146`, `SessionDetailPage.tsx:99` | `sessions.ts:92-94` `cancelSession` | REST `POST /sessions/:id/cancel` → `commitState` | — | await | ≤120 s (T) | máy chủ phát lại `homework_grade` (api-spec 6.5) |
| Khôi phục buổi đã huỷ | `SessionDetailPage.tsx:112` | `sessions.ts:92` `setSessionStatus(id,"planned")` | **chỉ bộ nhớ** (nhánh `status==="cancelled"` mới gọi API, nhánh `planned` thì không) | — | — | **không bao giờ** | **Lỗi**: không lưu lên máy chủ/Dexie; bị `hydrateStore` ghi đè về `cancelled` ở SYNC kế |

### 2.5 Điểm danh

| Thao tác | Màn/hook | Hàm repo | Đường dữ liệu | Khi nào kéo | Chặn/cache | Thiết bị 2 | Ghi chú |
|---|---|---|---|---|---|---|---|
| Xem điểm danh buổi | `AttendancePanel.tsx:75-77`, `AttendanceDesktop.tsx:59-63`; cảnh báo vắng `:116`/`:92` | `attendance.ts:7` `listAttendance`, `students.ts:12,21` | store ← Dexie `attendance` ← pull | theo T | cache trước | ≤120 s (T) | `studentAbsenceWarning` quét bộ nhớ cho từng em mỗi render |
| Lưu điểm danh | `AttendancePanel.tsx:203`, `AttendanceDesktop.tsx:119` | `attendance.ts:8-18` `saveAttendance[Batch]` | `commitState` (bộ nhớ) + **outbox** `attendance.set` (Dexie `attendance`+`outbox`, cùng transaction) → `scheduleSync(2000)` → `POST /sync/push` → `GET /sync/pull` | 2 s sau lần ghi cuối (debounce) | không chặn; hiện ngay | ≈2 s + push + ≤120 s (T) | Lô N em ⇒ N lệnh, N transaction Dexie riêng; máy chủ xử lý tuần tự (mục 5). Khi lệnh `rejected`, bộ nhớ vẫn hiện giá trị mới tới hydrate kế |

### 2.6 Nhận xét / phiếu

| Thao tác | Màn/hook | Hàm repo | Đường dữ liệu | Khi nào kéo | Chặn/cache | Thiết bị 2 | Ghi chú |
|---|---|---|---|---|---|---|---|
| Xem phiếu | `CommentsPanel.tsx:173-183`, `CommentsDesktop.tsx:47-56`, `TicketEditor.tsx:106` | `comments.ts:10-12` | store ← Dexie `slips` ← pull | theo T; **mount tab gọi `flushQueuedTickets()` ⇒ `scheduleSync(0)`** (`CommentsPanel.tsx:224`, `CommentsDesktop.tsx:91`) | cache trước | ≤120 s (T) | Trên mobile cả 3 panel mount cùng lúc (`SessionDetailPage.tsx:301-319`, ẩn bằng `hidden`) ⇒ mở trang buổi = một SYNC ngay |
| Soạn nhận xét/sao | `TicketEditor.tsx:114`, `CommentTicketSheet.tsx:198` | `comments.ts:13` `saveSessionComment` | `commitState` + outbox `slip.set` | 2 s sau (debounce) | không chặn | ≈2 s + ≤120 s | — |
| Gửi phiếu | `CommentsPanel.tsx:247`, `CommentsDesktop.tsx:114` | `comments.ts:15-17` `sendSessionTickets` | `commitState` (đánh `sendQueued`) + Dexie `slips`+`outbox` `slip.send` → `scheduleSync` | 2 s | không chặn; offline xếp hàng | PH nhận sau ≈2 s + SYNC của PH (≤120 s) | spec bảo "cần mạng", hiện là hàng đợi |
| Lọc theo lớp `listComments(classId)` | `SessionsDesktop.tsx:125`, `ReportsPage.tsx:108` | `comments.ts:10` | store (`comments`) | — | — | — | **Nghi lỗi cao**: `store.ts:36` nạp comment với `classId:""` ⇒ trả rỗng sau mỗi hydrate (chi tiết mục 4) |

### 2.7 Bài kiểm tra & điểm

| Thao tác | Màn/hook | Hàm repo | Đường dữ liệu | Khi nào kéo | Chặn/cache | Thiết bị 2 | Ghi chú |
|---|---|---|---|---|---|---|---|
| Danh sách bài/điểm | `TestsTab.tsx:19-20,66`, `ScoreGridTab.tsx:20-27,94`, `ScoreGridDesktop.tsx:49-63`, `TestsDesktop.tsx:33,90-91`, `TestScoresPage.tsx:62-64,105` | `tests.ts:8`, `scores.ts:6` | store ← Dexie `tests`,`scores` ← pull | theo T | cache trước | ≤120 s (T) | `ScoreGridTab.tsx:94` `listScores(test.id).find` trong vòng lặp ô (O(bài×em×điểm)) |
| Tạo bài | `NewTestPage.tsx:44`, `TestsDesktop.tsx:111` | `tests.ts:11` `createTest` | `commitState` + outbox `test.create` (Dexie `tests`+`outbox`) | 2 s | không chặn | ≈2 s + ≤120 s | — |
| Sửa/xoá bài | `TestScoresPage.tsx:397`,`183`; `TestsDesktop.tsx:127` | `tests.ts:12,13` | outbox `test.update` / `test.delete` | 2 s | không chặn | như trên | xoá hay lưu trữ do client quyết định theo điểm đang có |
| Nhập điểm | `TestScoresPage.tsx:144`, `ScoreGridDesktop.tsx:90` | `scores.ts:7-18` `saveScore` | `commitState` + outbox `score.set` (+`depends_on` `test.create`) | 2 s | không chặn | như trên | — |

### 2.8 BTVN

| Thao tác | Màn/hook | Hàm repo | Đường dữ liệu | Khi nào kéo | Chặn/cache | Thiết bị 2 | Ghi chú |
|---|---|---|---|---|---|---|---|
| Xem BTVN (buổi trước/hôm nay) | `HomeworkPanel.tsx:142-150`, `HomeworkDesktop.tsx:67-70` | `data/homework.ts:368` `homeworkContext(state,…)`; `repositories/homework.ts:6-7` | store ← Dexie `homeworkSections`,`homeworkGrades` ← pull | theo T | cache trước | ≤120 s (T) | tính lại mỗi render: sắp xếp buổi + quét điểm danh/điểm chấm theo từng em |
| Giao/sửa phần | `HomeworkPanel.tsx:630`, `HomeworkDesktop.tsx:607` | `repositories/homework.ts:8` `saveHomeworkSection` | `commitState` + outbox `homework.section.upsert` | 2 s | không chặn | ≈2 s + ≤120 s | — |
| Xoá phần | `HomeworkPanel.tsx:654`, `HomeworkDesktop.tsx:542` | `homework.ts:9` | outbox `homework.section.delete` | 2 s | — | như trên | — |
| Chấm 1 em / cả lớp | `HomeworkPanel.tsx:405,357`; `HomeworkDesktop.tsx:136` | `homework.ts:10,11` `setHomeworkGrade[ForAll]` | outbox `homework.grade.set` (mỗi em một lệnh) | 2 s | không chặn | như trên | "cả lớp" = N lệnh |

### 2.9 Báo cáo tháng

| Thao tác | Màn/hook | Hàm repo | Đường dữ liệu | Khi nào kéo | Chặn/cache | Thiết bị 2 | Ghi chú |
|---|---|---|---|---|---|---|---|
| Xem/xem trước báo cáo (GV) | `ReportsPage.tsx:98-113` (gom 9 nguồn từ store), `ReportPreview.tsx` | `reports.ts:7` `listReports`; `data/reportModel.ts` `buildMonthlyStudentReport` | **tính ở client** từ store (không gọi `GET …/report-preview`) | theo T | cache trước | ≤120 s (T) | Lệch thiết kế: api-spec mục 8 nói máy chủ tính để hai client giống nhau. Bản "xem trước" ở client có thể khác `snapshot` máy chủ phát hành. Phụ thuộc `listComments(classId)` rỗng (mục 4) |
| Tạo nháp báo cáo | `ReportsPage.tsx:196` | `reports.ts:8` `saveReport` | **chỉ bộ nhớ**, id = UUID cục bộ | — | — | không | không bao giờ ghi Dexie/API; mất khi hydrate (nháp rỗng) |
| Lưu nhận xét chung | `ReportsPage.tsx:206` | `reports.ts:10` `saveReportComment` | REST `PUT /students/:id/reports/:month` → `commitState` | — | await; cần online | ≤120 s (T) | id báo cáo cục bộ ≠ id máy chủ tới pull kế |
| Phát hành | `ReportsPage.tsx:232,255` | `reports.ts:9` `publishReport` | REST `POST /students/:id/reports/:month/publish` → `commitState` | — | await (nặng: ≈16 lượt D1, mục 5) | PH thấy sau SYNC của PH (≤120 s) | — |

### 2.10 Phụ huynh (chỉ đọc)

| Thao tác | Màn/hook | Hàm repo | Đường dữ liệu | Khi nào kéo | Chặn/cache | Thiết bị 2 | Ghi chú |
|---|---|---|---|---|---|---|---|
| Danh sách con | `guardianContext.tsx:57`, `SettingsPage.tsx:86` | `guardian.ts:98` `listMyChildren` | store (học sinh từ pull) + session (`memberships[].students` từ `/me`) | `/me` lúc loader; còn lại theo T | cache trước | ≤120 s (T) | — |
| Tổng quan/điểm danh/điểm | `GuardianClassPage.tsx:63` | `guardian.ts:395` `getChildOverview` | store ← Dexie ← pull | theo T | cache trước | — | — |
| Phiếu nhận xét + BTVN | `GuardianCommentsPage.tsx:53`, `GuardianSessionPage.tsx:79-84` | `guardian.ts:174,192,245` | store (`comments`,`homeworkSections/Grades`) | theo T | cache trước | — | — |
| Báo cáo đã phát hành | `GuardianReportPage.tsx:41` | `guardian.ts:500` `getChildMonthlyReport` | store `reportPublications` (snapshot máy chủ); nếu thiếu thì **tính lại ở client** (`:518-528`) | theo T | cache trước | — | — |
| "Mới/đã xem" | `guardianSeen.ts` | — | `localStorage` theo user+membership | — | — | không (cục bộ) | không có "cập nhật lúc …" như `architecture.md` mục 5 nêu |

---

## 3. Trả lời các câu hỏi

### 3.1 Bao nhiêu nguồn đọc song song? Còn dùng seed/demo thay API?

Bốn lớp, nhưng **chỉ một đường đọc cho màn**:

| Nguồn | Vai trò | Ai đọc | Bằng chứng |
|---|---|---|---|
| Dexie | Cache bền, nơi `pull`/`snapshot`/outbox ghi | chỉ `hydrateStore()` (đọc) và `persistCommand`/`applyPull`/`snapshot` (ghi) | `store.ts:25-30`; `sync.ts:55-68` |
| `store.ts` (bộ nhớ) | Nguồn duy nhất màn đọc | mọi repository `getStore()`; `useStore()` | `repositories/*.ts` |
| REST trực tiếp | Chỉ cho **ghi** nhóm (b) và `/me`; không có `GET` danh sách | `sessions.ts`, `students.ts`, `classes.ts`, `reports.ts`, `auth/*` | tìm `api.request`: 40 hit, đọc chỉ `GET /me` và `GET /sync/*` |
| Session (`localStorage`) | Quyền, danh sách vai trò, con của phụ huynh | `access.ts`, `guardianRead.ts:172` | `auth/session.ts:6-30` |

`seed.ts` ⇒ `src/test/fixtures/seed` ("Test-only", `data/seed.ts:1`); `defaults.ts`/`foundation.ts` không có import production (`defaultRoles`, `MEMBER_IDS`, `foundationUnavailable` chỉ định nghĩa). Store luôn khởi tạo `roles: []`, `members: []` (`store.ts:5-8`); nhánh `getStore().members` trong `access.ts:19-21,23-27` chỉ chạy khi không có session, không xảy ra ở production. **Không còn chỗ nào dùng dữ liệu seed/demo thay API.** Dữ liệu cục bộ khác: `draftStore.ts` (sessionStorage, nháp nhận xét), `guardianContext.tsx:36-44` (con đang xem), `guardianSeen.ts` (localStorage), `currentClassId` (bộ nhớ).

### 3.2 `sync.ts` / `outbox.ts`: trình kích hoạt pull có thật nối vào app không?

**Có**, nhưng dựa vào listener cấp module nên chỉ hiệu lực vì `sync.ts` luôn được import (qua repository):
- Mở app: `activateMembershipCache` → `void syncNow()` (`auth/session.ts:44`), chạy từ `initializeSession` trong loader (`routes.tsx:32`).
- `online`, `focus` trên `window`; `setInterval(syncNow, 120_000)` (`sync.ts:187-190`). **Không** có `visibilitychange`/`pageshow`; interval chạy cả khi tab ẩn nhưng bị trình duyệt hạ tần số; iOS PWA treo timer khi nền.
- Sau push: `syncNow` luôn gọi `pull` ngay sau vòng đẩy (`sync.ts:168`), rồi `hydrateStore`.
- Sau mỗi ghi outbox: `scheduleSync()` mặc định 2 000 ms (`outbox.ts:43`, `sync.ts:186`); debounce (huỷ timer cũ).
- `flushQueuedTickets()` ⇒ `scheduleSync(0)` mỗi lần mount tab Nhận xét/đổi `sessionId` khi online.
- Nút "Thử đồng bộ lại" trong hộp thoại đăng xuất (`SettingsPage.tsx:545`).
- Bảo vệ: `if (running) return running` (`sync.ts:130`) — một SYNC đang chạy **nuốt** mọi yêu cầu đến sau, kể cả khi thay đổi mới tới máy chủ sau khi trang pull đã đọc. Không có "chạy lại sau khi xong".

`cursor`/`epoch`: Dexie bảng `meta`, hàng khoá = identity (`sync.ts:66`, `:79`; `db.ts:12`). **Không** có trong `localStorage`. `snapshot` gọi khi: `meta` của identity chưa có (đăng nhập/chọn vai trò lần đầu hoặc sau `clearIdentityCache`) hoặc pull trả 409 `resync_required`/`snapshot_required` (`sync.ts:87,94-96`). Hệ quả: lần đầu hoặc sau khi `epoch` đổi, mọi thiết bị đứng chờ 13 request tuần tự (mục 3.4).

Điểm lệch/nghi vấn:
- `snapshot` ghi `meta{cursor,epoch}` **sau trang đầu của thực thể đầu tiên** (`sync.ts:79` nằm trong vòng lặp từng trang). Nếu tắt app/đứt mạng giữa chừng, lần mở sau thấy `meta` có ⇒ bỏ qua snapshot, chỉ `pull` từ cursor ⇒ **thiếu vĩnh viễn** các thực thể chưa tải (cho tới `epoch` đổi/log bị dọn).
- Lỗi mạng bất kỳ trong `syncNow` đều thành `setSaveStatus("error")` (`sync.ts:171`) dù dữ liệu cục bộ vẫn tốt ⇒ banner lỗi lưu hiện khi chỉ mất mạng lúc pull định kỳ.
- `hydrateStore()` chạy sau **mọi** SYNC kể cả khi pull trống (`sync.ts:168`) ⇒ đọc lại 12 bảng + thay cả `state` + render lại mọi `useStore()` mỗi 120 s/focus/tab.

### 3.3 "Thêm học sinh": đường đi, cache, và vì sao thiết bị B có thể không thấy

Đường A: `StudentsPage.tsx:52` (hoặc `StudentsDesktop.tsx:77`) → `students.ts:13` `createStudent` → `requireNetwork` → REST `POST /classes/:id/students` (`await`) → `persistStudent(remote)` = `db.students.put(...)` **fire-and-forget** (`students.ts:9`) → `commitState` đẩy vào `store.ts`. Cập nhật hai cache: Dexie `students` và bộ nhớ. Không đụng `outbox`, không `scheduleSync`, không ghi `cursor`. Máy chủ ghi `change_log` bằng trigger (`0002_triggers.sql:307`), nên mọi thiết bị có thể pull được.

B mở danh sách: `StudentsPage.tsx:35` → `listStudents` → `getStore().students` (`students.ts:10`) — **bộ nhớ**, được dựng từ Dexie lúc `hydrateStore`. B không gọi API khi mở màn. Bộ nhớ B chỉ đổi khi một `syncNow()` của B chạy xong (pull → `applyPull` ghi Dexie → `hydrateStore`).

Vì sao B có thể không thấy (xếp theo khả năng):
1. **Chưa tới lượt SYNC của B**: không có kéo-khi-mở; B phải chờ `focus` (không bắn lại nếu cửa sổ đang focus), `online`, interval 120 s, hoặc loader. B ở nền/iOS PWA treo: có thể hàng chục phút.
2. **SYNC đang chạy nuốt yêu cầu** (`if (running) return running`): nếu pull của B đã đọc `change_log` trước khi A ghi thì không có lần pull thứ hai ngay.
3. B tắt/ẩn tab nên interval bị hạ tần; PWA iOS không có `visibilitychange` nên mở lại app có thể không SYNC ngay (chưa kiểm chứng trên máy).
4. Quyền/phạm vi: B thuộc diện `assigned_classes` mà lớp không có trong `member_classes` ⇒ pull không trả (`sync-read.ts:27-34`).
5. Lỗi: pull trả 409/401/403 ⇒ xoá cache/đăng xuất (`sync.ts:94-100`) — làm B "mất" dữ liệu thay vì thêm.

Trả lời gọn: không có đường nào "đẩy" học sinh mới tới B; B thấy sau **lần SYNC kế của chính B**, tối đa ≈120 s trong điều kiện tốt, không giới hạn khi nền.

### 3.4 Chuỗi request: màn buổi học (3 tab) và Chọn vai trò

**Màn buổi học `/lop/:classId/buoi-hoc/:sessionId?tab=…`** (nhân sự; kiểm tra bằng đọc mã):

Mở màn từ danh sách buổi (đổi route, `?search` có thể giữ nguyên hoặc đổi):
- Nếu URL đích có `?tab=…` mà URL hiện tại không có (ví dụ `TodayCard.tsx:81`, `CommentsPanel.tsx:366`) ⇒ search đổi ⇒ loader gác (một route cha duy nhất `roles/staff/routes.ts:4-5`, bọc ở `routes.tsx:30-31`) **chạy lại**:
  1. `GET /me` — `await` chặn điều hướng; không cache (`initialization` xoá trong `finally`, `session.ts:109`). D1: 5 lượt/9 câu (mục 5).
  2. `activateMembershipCache` → `await hydrateStore()` (12 truy vấn Dexie song song, thay `state`, render lại mọi `useStore()`).
  3. `void syncNow()` (không chặn): đọc outbox (Dexie), `POST /sync/push` nếu có lệnh `pending`, rồi `GET /sync/pull` (≥1 trang, tuần tự), `applyPull`, `hydrateStore()` lần hai.
- Trang mount: mobile gắn **cả 3 panel** (`SessionDetailPage.tsx:301-319`), `CommentsPanel` có effect `flushQueuedTickets()` ⇒ `scheduleSync(0)` (`CommentsPanel.tsx:223-225`). `syncNow` đang chạy ⇒ `return running`, nên không nhân đôi request.
- Desktop: chỉ panel của tab hiện tại mount (`SessionDetailDesktop.tsx:97-113`); `CommentsDesktop.tsx:90-92` gọi `flushQueuedTickets()` khi vào tab Nhận xét.

**Đổi tab** (`openTab` → `setSearchParams`, `SessionDetailPage.tsx:121-124`; desktop `CommentsDesktop.tsx:105,109`): mỗi lần là một điều hướng đổi `search` ⇒ lặp lại đúng chuỗi 1-3 ở trên: **`GET /me` (chặn) → hydrate → `GET /sync/pull` (nền) → hydrate**. Vị trí tab (`tab` lấy từ `searchParams`) chỉ đổi sau khi loader xong (RR commit location sau loader) ⇒ độ trễ tab ≈ RTT `GET /me` + hydrate (hoặc 15 s nếu mạng treo). Không request nào theo từng tab cho dữ liệu: dữ liệu đã có sẵn trong store. Không có cache cho `/me`, không có huỷ request khi chuyển nhanh, các request không được gộp. Tab Nhận xét → BTVN chọn em (`goHomework`) cũng đổi search ⇒ thêm một vòng.

**Chọn vai trò** (`RolePickerPage` — route không có loader, nên bản thân việc mở màn **không** gọi mạng; `/me` đã có từ đăng nhập):
1. Bấm một vai: `PUT /session/membership` (`auth/index.ts:45`), `await` — chặn nút (`busy`). D1: 5 lượt/8 câu.
2. `setActiveMembershipId` + `activateMembershipCache` (`session.ts:40-45`): `setCacheIdentity` → `await hydrateStore()` (identity mới, thường rỗng) → `void syncNow()`.
3. `navigate("/lop"|"/ph")` ngay → loader gác: `await initializeSession()` → `GET /me` lần nữa (chặn) → `activateMembershipCache` lần 2 → hydrate lần 2 → `syncNow()` trả `running` (gộp với lần ở bước 2).
4. Nền (`syncNow`, lần đầu của identity): outbox rỗng → `pull()` thấy `meta` chưa có → `snapshot()`: `GET /sync/snapshot` rồi **tuần tự** `GET /sync/snapshot/{entity}` cho từng thực thể (staff 11, phụ huynh 10, mỗi thực thể ≥1 trang 300 dòng, mỗi trang một transaction Dexie), rồi `GET /sync/pull`: tối thiểu 13 request tuần tự (staff) / 12 (phụ huynh).
5. `hydrateStore()` **chỉ chạy một lần ở cuối** (`sync.ts:168`); trong lúc snapshot, store rỗng ⇒ `/lop` hiện trạng thái trống, không có loading.
Không có cache giữa các lần chọn vai trò trừ Dexie của từng identity (đổi qua lại vai đã từng tải thì `meta` còn ⇒ chỉ pull).

---

## 4. Lỗi/nghi vấn đã thấy trong mã (cần kiểm chứng, xếp theo ảnh hưởng)

| # | Nghi vấn | Bằng chứng | Hậu quả |
|---|---|---|---|
| 1 | Mỗi lần đổi `?tab=`/search đều chạy lại loader: `GET /me` chặn + 2 lần hydrate + 1 pull | `routes.tsx:31-32`; `session.ts:74-111`; `SessionDetailPage.tsx:123` | độ trễ đổi tab; tốn D1 (≈9 lượt/27 câu mỗi lần); render lại toàn app 2 lần |
| 2 | Snapshot lần đầu: 13 request tuần tự, hydrate chỉ ở cuối, không có trạng thái loading | `sync.ts:69-85,168` | "Chọn vai trò" và đăng nhập đầu trông treo/trống |
| 3 | `comments` nạp với `classId:""` ⇒ `listComments(classId)` rỗng sau hydrate | `store.ts:36` (`classId:""`); `comments.ts:10`; dùng ở `ReportsPage.tsx:108`, `SessionsDesktop.tsx:125`; `reportModel.ts:160` lọc `status==="sent"` trên danh sách đó | báo cáo tháng: số sao/phiếu đã gửi/BTVN lộ = 0 sau khi tải lại; desktop: cột trạng thái phiếu sai. (Test dùng fixture có `classId` nên không bắt được) |
| 4 | Ghi REST (lớp, buổi, huỷ, báo cáo, đổi lịch) chỉ vào bộ nhớ; `hydrateStore` ghi đè | `classes.ts:19`, `sessions.ts:22,29,92`, `reports.ts:9-10` vs `store.ts:21-40` | chớp tắt: bản ghi vừa tạo biến mất rồi hiện lại khi SYNC khác kết thúc trước khi pull mang về |
| 5 | `updateClassSchedule*` dựng buổi cục bộ bằng `crypto.randomUUID()`; xem trước 28 ngày, máy chủ 56 ngày | `sessions.ts:78,84,90` vs `worker/src/db/classes.ts:48-60,126-176` | buổi "ma" tới SYNC kế; ghi điểm danh trên đó bị `rejected` |
| 6 | "Khôi phục buổi" không gọi API | `sessions.ts:92` (chỉ `cancelled` mới gọi), `SessionDetailPage.tsx:112` | khôi phục mất sau SYNC kế; máy chủ vẫn `cancelled` |
| 7 | `snapshot` ghi cursor sớm, không đánh dấu hoàn tất | `sync.ts:77-80` | tắt app giữa chừng ⇒ thiếu dữ liệu vĩnh viễn (tới khi `epoch` đổi) |
| 8 | `syncNow` nuốt yêu cầu khi đang chạy | `sync.ts:130` | thay đổi tới giữa lúc pull không được kéo ngay; B chậm thêm tới 120 s |
| 9 | Tab ẩn/iOS PWA: không có `visibilitychange`/`pageshow` | `sync.ts:187-190` | B không làm mới khi mở lại app (chưa kiểm chứng trên máy) |
| 10 | Xem trước báo cáo tính ở client (và PH có đường tính lại ở client), máy chủ tính `snapshot` khi phát hành | `ReportsPage.tsx:98-113`; `guardian.ts:518-528`; `routes/reports.ts:88+`; api-spec mục 8 | hai bản số có thể khác nhau |
| 11 | `pull` luôn trả cả 11 câu JOIN dù trang rỗng; `snapshotPage` tính lại `meta` mỗi trang | `sync-read.ts:104-111`, `:85` | tốn đọc D1 vô ích (xem mục 5) |
| 12 | Dọn: `updateStoreView`/`toView`, `updateStudent`, `foundation.ts`, `defaults.ts`, `seed.ts` không dùng ở production | tìm toàn `src` | mã chết |

---

## 5. Backend: endpoint đọc web đang dùng và số câu D1

Đơn vị: **lượt** = số `await` tới D1 (một `batch` = 1 lượt); **câu** = số câu SQL (trong batch tính từng câu). Đếm theo luồng chính, từ `worker/src/routes/*.ts` và `worker/src/db/*.ts`.

Chi phí xác thực mỗi request (`middleware/auth.ts:46-119`): route thường 3 lượt/5 câu (`findSessionByTokenHash` 1 + `loadMembership` 1 + `batch` 3, `db/identity.ts:35-186`); route `/v1/sync/*`: `authenticateSession` 1 lượt rồi `syncIdentity` 1 + `batch` 3 = 3 lượt/5 câu (`db/sync.ts:70-90`). `touchSession` (UPDATE) chạy `waitUntil`, tối đa ~mỗi giờ.

| Endpoint (web đang gọi) | Lượt D1 | Câu SQL | Ghi chú / N+1 |
|---|---|---|---|
| `GET /me` | 5 (4 nếu chưa chọn vai: `findSession` 2 lần) | 9 | `getMe`: batch 3 + `role_permissions` 1 (`db/auth.ts:252-331`). Gọi mỗi lần loader chạy |
| `PUT /session/membership` | 5 | 8 | auth 3 + `findActiveMembership` 1 + batch(UPDATE+DELETE token) 1 |
| `GET /sync/pull` | 4 | 5 + (2 + 11) = 18 (staff) / 17 (PH) | 1 batch: `meta`, trang `change_log`, rồi **mỗi thực thể một câu JOIN** (`sync-read.ts:104-113`). Không N+1; nhưng gửi đủ 11 câu cả khi trang rỗng, và CTE `page` tính lại cho mỗi câu |
| `GET /sync/snapshot` | 4 | 6 | `meta` có `MAX(seq)` trên `change_log` |
| `GET /sync/snapshot/{entity}` (mỗi trang) | 5 | 7 | `meta` tính lại mỗi trang (`sync-read.ts:85`); 11 thực thể ⇒ 55 lượt ⇒ snapshot đầy đủ ≈ 4 + 55 + 4 = **63 lượt** |
| `POST /sync/push` (N lệnh) | `3 + 1 + 1 + ~(2…4)·N` | | `initialState` 1 batch trước; mỗi lệnh: `prior` 1 + `commit` 1 batch (+ đọc lại buổi/ô đã bị `evict` ≈2 với lệnh điểm danh/điểm liên tiếp, `db/sync.ts:106-112,258-300`). Điểm danh 30 em ≈ 120 lượt trong **một** request; nghi vấn vượt giới hạn truy vấn/invocation của gói Free (cần xác minh con số giới hạn và hành vi `batch`) — **không phải N+1 theo nghĩa SELECT-trong-vòng-lặp trên đọc, nhưng là tuần tự tuyến tính theo số lệnh** |
| `POST /classes` | 4 | 3 + k (k = số buổi lặp 56 ngày ≈ 8 × số ngày/tuần) | 1 batch lớn (`db/classes.ts:66-88`) |
| `PATCH /classes/:id` | 5 | 1 + `SELECT` + (đổi lịch: 2 + k) + 1 | đổi lịch xoá/chèn buổi trong batch |
| `POST /classes/:id/students` | 5–6 | 3 + 1 (+1 nếu có SĐT) + batch(1 + liên kết) | `linkedUsersForPhone` 1 lượt nếu có SĐT (`db/students.ts:121-143`) |
| `PATCH /students/:id` | 5–7 | | thêm 1–2 lượt tra liên kết khi đổi SĐT (`:146-188`) |
| `POST /classes/:id/sessions` | 6 | | class 1 + INSERT 1 + COUNT 1 (`db/sessions.ts:70-99`) |
| `PATCH /sessions/:id` | 6 | | SELECT, UPDATE, SELECT (`:151-203`) |
| `POST /sessions/:id/cancel` | ≥6 | | SELECT, EXISTS, batch (`:101-150`) |
| `PUT /students/:id/reports/:month` | 6 | | student 1 + UPSERT 1 + SELECT 1 (`routes/reports.ts:39-87`) |
| `POST /students/:id/reports/:month/publish` | ≈16 | | `previewReport` 7 (1 + 5 song song + 1) + student + existing + thông báo ≥1 + batch (`routes/reports.ts:88-198`, `db/reports.ts:28-100`) |

Endpoint `GET` danh sách (`/classes`, `/classes/:id/students`, `/classes/:id/sessions`, `/calendar`, `/sessions/:id/{attendance,slips,homework}`, `/classes/:id/tests`, `/tests/:id/scores`, `/classes/:id/reports`, `/students/:id/report-preview`) **tồn tại ở backend nhưng web không gọi**. Không thấy N+1 kiểu SELECT-trong-vòng-lặp ở các endpoint đọc web dùng; chỗ gần nhất là `push` (đọc lại sau `evict`) và `pull` (11 câu cố định).

---

## 6. Đối chiếu thiết kế (`api-spec.md` mục 6, `offline-plan.md`) với thực tế

| Thiết kế | Thực tế web | Lệch |
|---|---|---|
| Đọc từ kho cục bộ; ghi kho + outbox cùng transaction (offline-plan "Hợp đồng chung") | Màn đọc bộ nhớ `store.ts`; ghi: `commitState` (bộ nhớ) **trước**, rồi `persistCommand` (Dexie) bất đồng bộ, lỗi bị `.catch(()=>{})` | Thứ tự ngược; bộ nhớ có thể hiện giá trị chưa lưu được; không phải một transaction với UI |
| Nhóm ghi offline: điểm danh, điểm, bài kiểm tra, nhận xét, BTVN (architecture mục 5) | Đúng cho 5 nhóm; **lớp/học sinh/buổi/đổi lịch/báo cáo** là REST cần mạng, chỉ cập nhật bộ nhớ (học sinh có thêm Dexie) | Không có sai theo spec ("Cần mạng"), nhưng thiếu ghi Dexie ⇒ biến mất khi hydrate (mục 4 #4) |
| `pull` theo cursor, không N+1, một batch (api-spec 6.3) | Đúng ở server (`sync-read.ts`); client dùng đúng `cursor/epoch` và xử lý 409 | khớp |
| Tần suất: mở app, focus, **ngay sau mỗi `push`**, định kỳ 120 s (6.3); offline-plan: thêm "sau mỗi thay đổi ≈2 s" | Có đủ (interval 120 s, focus, online, debounce 2 s, pull ngay sau push). Thiếu: `visibilitychange`; "mở app" = loader chặn `/me` (không phải kéo ngầm) | Nhẹ; nhưng "mở app" bị cài đặt thành chặn UI |
| Snapshot: lấy `cursor` **trước**, tải các thực thể, sau đó `pull` từ cursor đó (6.6) | Cursor lấy trước nhưng **ghi vào `meta` ngay trang đầu** | Mất tính "xong mới có cursor" (mục 4 #7) |
| Phụ huynh: cache chỉ đọc kèm "cập nhật lúc …" (architecture mục 5, offline-plan #4) | Không có nhãn "cập nhật lúc" trong `src/roles` | Thiếu |
| Báo cáo do máy chủ tính, hai client giống nhau (api-spec mục 8) | Xem trước tính ở client; chỉ `snapshot` phát hành do máy chủ | Lệch (mục 4 #10) |
| `GET /classes/{id}/reports`, `/students/{id}/report-preview`, `/classes`, `/calendar`… (api-spec 5, 8) | Không dùng | Web dựa hoàn toàn vào `pull` |
| Xung đột: máy chủ sau cùng thắng, không có màn xung đột (api-spec 6.5; offline-plan) | Đúng: client không có UI xung đột; lệnh `rejected` giữ lại, `setSaveStatus("error")` | khớp (lưu ý: `architecture.md` mục 5 dòng "Xung đột" của web vẫn mô tả cách cũ — docs mâu thuẫn nội bộ; hỏi người dùng nếu cần sửa) |
| Đăng xuất chặn khi outbox còn lệnh (offline-plan) | Có (`outbox.ts:57-72`) | khớp |

---

## 7. Gợi ý việc đo cho DA-2 (không thực hiện ở bước này)

1. Đo thời gian thật của chuỗi đổi tab: `GET /me` p50/p95 từ trình duyệt (mạng di động) và số lần `GET /sync/pull` mỗi lần đổi tab (xác nhận revalidate theo `?tab=`).
2. Đo thời gian snapshot đầy đủ cho một workspace thật (63 lượt D1, 13 request tuần tự) và xem trên Free có chạm giới hạn nào.
3. Thử `push` 30–50 lệnh điểm danh để xem giới hạn truy vấn/invocation của Worker Free (mục 5, dòng `POST /sync/push`).
4. Hai thiết bị: A thêm học sinh, đo B thấy sau bao lâu trong 3 điều kiện (focus/nền/iOS PWA).
5. Kiểm tra lỗi #3 (báo cáo sao = 0 sau tải lại) bằng tài khoản có phiếu đã gửi.

## Bổ sung từ GL (lead UI chuyển, 2026-10-23): đổi mật khẩu
| Thao tác | Đường | Lỗi |
|---|---|---|
| Đổi mật khẩu (`src/data/auth` `changePassword`) | `POST` đổi mật khẩu rồi `GET /me` | POST thành công nhưng `/me` lỗi ⇒ UI báo lỗi; người dùng thử lại bằng mật khẩu cũ ⇒ bị từ chối. Cần: thành công khi POST thành công; `/me` lỗi xử lý riêng (thử lại nền, không chặn). Có test. |
| Khôi phục buổi đã huỷ (`setSessionStatus(id,"planned")`, `src/data/repositories/sessions.ts` ~92) | chỉ bộ nhớ, không gọi API | Mất khi đồng bộ lại. `docs/spec.md` (dòng 37, 212) và `api-spec.md` không có thao tác khôi phục buổi (tìm "khôi phục/restore" không thấy) ⇒ ngoài spec: gỡ khỏi lớp dữ liệu, báo lead UI gỡ nút. Có test. |
| Thêm học sinh (`createStudent`, REST `POST`) | REST, không khoá chống trùng | Gửi lại (mạng chập chờn/bấm 2 lần) ⇒ có thể tạo 2 học sinh. Cân nhắc idempotency key/command id cho mọi ghi REST. Có test. |

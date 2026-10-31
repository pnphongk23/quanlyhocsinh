# ERD — MVP hiện tại

Cập nhật: 2026-10-24. Phản ánh schema D1 trong `worker/migrations/0001_schema.sql` và các migration tiếp theo; phạm vi nghiệp vụ đối chiếu `docs/spec.md`, mục 8. Không phải mô hình thiết kế cho các tính năng làm sau.

**Cách đọc:** `||` = đúng một; `o|` = không hoặc một; `o{` = không hoặc nhiều. PK = khóa chính, FK = khóa ngoại, UK = khóa duy nhất một cột. PK nhiều cột là khóa ghép. `nullable` = có thể NULL. Nét liền biểu diễn FK trong schema; nét đứt biểu diễn liên kết logic không có FK.

Các sơ đồ lược bớt timestamp chung và cột người tạo/sửa; chỉ vẽ quan hệ chính để dễ đọc. Bảng xuất hiện lại ở sơ đồ khác là cùng một bảng. Khóa ngoại ghép chứa `workspace_id`/`class_id` được rút gọn thành một đường quan hệ; xem migration để biết đầy đủ ràng buộc. Không phải cột có hậu tố `_id` nào cũng có FK.

## Tổng quan nghiệp vụ

```mermaid
erDiagram
    workspaces ||--o{ classes : "chứa"
    classes ||--o{ students : "có học sinh"
    classes ||--o{ class_sessions : "có buổi học"
    classes ||--o{ tests : "có bài kiểm tra"
    users ||--o{ guardian_student : "phụ huynh"
    students ||--o{ guardian_student : "được liên kết"
    class_sessions ||--o{ attendance : "điểm danh"
    students ||--o{ attendance : "có kết quả"
    tests ||--o{ scores : "có điểm"
    students ||--o{ scores : "nhận điểm"
    class_sessions ||--o{ session_comments : "phiếu buổi học"
    students ||--o{ session_comments : "nhận phiếu"
    class_sessions ||--o{ homework_sections : "giao BTVN"
    homework_sections ||--o{ homework_grades : "được chấm"
    students ||--o{ homework_grades : "nhận kết quả"
    students ||--o{ reports : "báo cáo tháng"
    reports ||--o{ report_publications : "các lần phát hành"
```

## 1. Tài khoản, workspace và phân quyền

```mermaid
erDiagram
    workspaces {
        text id PK
        text name
        text timezone
        integer change_floor
        integer version
    }
    users {
        text id PK
        text phone UK
        text display_name "nullable"
        text password_hash
        integer must_change_password
        text password_changed_at "nullable"
        text status
        integer version
    }
    roles {
        text id PK
        text workspace_id FK
        text name
        text scope_kind
        integer is_system
        text system_key "nullable"
        integer version
    }
    role_permissions {
        text role_id PK,FK
        text perm_group PK
        text level
    }
    memberships {
        text id PK
        text workspace_id FK
        text user_id FK
        text role_id FK
        text status
        integer scope_epoch
        integer version
    }
    member_classes {
        text workspace_id FK
        text membership_id PK,FK
        text class_id PK,FK
    }
    guardian_student {
        text workspace_id FK
        text user_id PK,FK
        text student_id PK,FK
    }
    auth_sessions {
        text id PK
        text user_id FK
        text membership_id FK "nullable"
        text token_hash UK
        text device_label "nullable"
        text last_seen_at
        text expires_at
        text revoked_at "nullable"
    }
    auth_throttle {
        text key PK
        integer fails
        text window_start
        text locked_until "nullable"
    }
    workspaces ||--o{ roles : "workspace_id"
    workspaces ||--o{ memberships : "workspace_id"
    users ||--o{ memberships : "user_id"
    roles ||--o{ memberships : "role_id"
    roles ||--o{ role_permissions : "role_id"
    memberships ||--o{ member_classes : "membership_id"
    classes ||--o{ member_classes : "class_id"
    users ||--o{ guardian_student : "user_id"
    students ||--o{ guardian_student : "student_id"
    users ||--o{ auth_sessions : "user_id"
    memberships o|--o{ auth_sessions : "membership_id"
```

## 2. Lớp, buổi học, điểm danh, điểm và BTVN

```mermaid
erDiagram
    classes {
        text id PK
        text workspace_id FK
        text name
        text status
        integer weekdays
        text start_time
        text generated_until "nullable"
        integer version
    }
    students {
        text id PK
        text workspace_id FK
        text class_id FK
        text name
        text parent_phone "nullable"
        text enrolled_at
        text left_at "nullable"
        text status
        integer version
    }
    class_sessions {
        text id PK
        text workspace_id FK
        text class_id FK
        text date
        text start_time
        text origin
        integer is_makeup
        text status
        text note
        text cancelled_at "nullable"
        integer version
    }
    attendance {
        text workspace_id FK
        text class_id FK
        text session_id PK,FK
        text student_id PK,FK
        text status
        text note
        text late_at "nullable"
        integer version
    }
    tests {
        text id PK
        text workspace_id FK
        text class_id FK
        text name
        text date
        integer max
        integer archived
        integer version
    }
    scores {
        text workspace_id FK
        text class_id FK
        text test_id PK,FK
        text student_id PK,FK
        real value "nullable"
        integer version
    }
    session_comments {
        text workspace_id FK
        text class_id FK
        text session_id PK,FK
        text student_id PK,FK
        integer stars "nullable"
        text note
        text status
        text sent_at "nullable"
        integer version
    }
    homework_sections {
        text id PK
        text workspace_id FK
        text class_id FK
        text session_id FK
        text kind
        text title
        text description
        integer version
    }
    homework_grades {
        text workspace_id FK
        text class_id FK
        text section_id PK,FK
        text student_id PK,FK
        text level "nullable"
        integer version
    }
    workspaces ||--o{ classes : "workspace_id"
    classes ||--o{ students : "class_id"
    classes ||--o{ class_sessions : "class_id"
    classes ||--o{ tests : "class_id"
    class_sessions ||--o{ attendance : "class_id, session_id"
    students ||--o{ attendance : "class_id, student_id"
    tests ||--o{ scores : "class_id, test_id"
    students ||--o{ scores : "class_id, student_id"
    class_sessions ||--o{ session_comments : "class_id, session_id"
    students ||--o{ session_comments : "class_id, student_id"
    class_sessions ||--o{ homework_sections : "class_id, session_id"
    homework_sections ||--o{ homework_grades : "class_id, section_id"
    students ||--o{ homework_grades : "class_id, student_id"
```

## 3. Báo cáo và phiên bản phát hành

```mermaid
erDiagram
    reports {
        text id PK
        text workspace_id FK
        text class_id FK
        text student_id FK
        text month
        text status
        text general_comment
        integer needs_republish
        integer publication_count
        text published_at "nullable"
        integer version
    }
    report_publications {
        text id PK
        text workspace_id FK
        text class_id
        text student_id
        text report_id FK
        text month
        integer publication_no
        text snapshot
        text pdf_key "nullable"
        integer pdf_bytes "nullable"
        text published_by FK
        text published_at
    }
    classes ||--o{ reports : "class_id"
    students ||--o{ reports : "student_id"
    reports ||--o{ report_publications : "report_id"
    users ||--o{ report_publications : "published_by"
```

## 4. Thông báo và push

```mermaid
erDiagram
    notifications {
        integer id PK
        text workspace_id FK
        text user_id FK
        text membership_id FK
        text kind
        text event_key
        text student_id FK
        text session_id FK "nullable"
        text report_id FK "nullable"
        text test_id FK "nullable"
        text read_at "nullable"
        text deliveries_expanded_at "nullable"
        text expansion_started_at "nullable"
        text delivery_cursor "nullable"
        text expansion_lease_id "nullable"
        text expansion_lease_until "nullable"
        text ready_at
        text group_key "nullable"
        integer event_version
    }
    device_tokens {
        text id PK
        text workspace_id FK
        text user_id FK
        text membership_id FK
        text auth_session_id FK
        text token UK
        text platform
        integer registration_version
        text bound_at
    }
    push_deliveries {
        integer notification_id PK,FK
        text membership_id FK
        text device_id PK,FK
        integer registration_version
        text status
        integer attempts
        text next_attempt_at
        text lease_id "nullable"
        text lease_until "nullable"
        text sent_at "nullable"
        text error_code "nullable"
    }
    fcm_oauth_cache {
        text project_id PK
        text credential_key_id
        text access_token "nullable"
        text refresh_at "nullable"
        text expires_at "nullable"
        text lease_id "nullable"
        text lease_until "nullable"
    }
    users ||--o{ notifications : "user_id"
    memberships ||--o{ notifications : "membership_id, user_id"
    students ||--o{ notifications : "student_id"
    class_sessions o|--o{ notifications : "session_id"
    reports o|--o{ notifications : "report_id"
    tests o|--o{ notifications : "test_id"
    users ||--o{ device_tokens : "user_id"
    memberships ||--o{ device_tokens : "membership_id, user_id"
    auth_sessions ||--o{ device_tokens : "auth_session_id"
    notifications ||--o{ push_deliveries : "notification_id, membership_id"
    device_tokens ||--o{ push_deliveries : "device_id, membership_id"
```

## 5. Lịch sử và đồng bộ

```mermaid
erDiagram
    attendance_history {
        integer id PK
        text workspace_id
        text session_id
        text student_id
        text old_status "nullable"
        text new_status
        text old_note "nullable"
        text new_note "nullable"
        text old_late_at "nullable"
        text new_late_at "nullable"
        integer old_version
        integer new_version
        text changed_by "nullable"
        text changed_at
    }
    score_history {
        integer id PK
        text workspace_id
        text test_id
        text student_id
        real old_value "nullable"
        real new_value "nullable"
        integer old_version
        integer new_version
        text changed_by "nullable"
        text changed_at
    }
    applied_commands {
        text command_id PK
        text workspace_id
        text membership_id
        text type
        text status
        text result
        text applied_at
    }
    sync_conflicts {
        text id PK
        text workspace_id FK
        text class_id FK
        text entity
        text k1
        text k2
        text server_value
        integer server_version
        text client_value
        integer client_base_version
        text command_id
        text membership_id
        text resolved_at "nullable"
        text resolved_by FK "nullable"
        text resolution "nullable"
        integer version
    }
    change_log {
        integer seq PK
        text workspace_id
        text entity
        text k1
        text k2
        text op
        text class_id
        text student_id "nullable"
    }
    classes ||--o{ sync_conflicts : "class_id"
    users o|--o{ sync_conflicts : "resolved_by"
    attendance ||..o{ attendance_history : "lịch sử ô điểm danh"
    scores ||..o{ score_history : "lịch sử ô điểm"
    memberships ||..o{ applied_commands : "membership_id logic"
    memberships ||..o{ sync_conflicts : "membership_id logic"
```

## Các điểm cần lưu ý

- **29 bảng ứng dụng** trong schema hiện tại, chưa tính `sqlite_sequence` nội bộ SQLite.
- `students` thuộc một lớp qua `class_id`; chưa có bảng ghi danh nhiều lớp riêng. Ngày vào/nghỉ nằm ở `enrolled_at`, `left_at`.
- Một user có nhiều membership; mỗi membership thuộc một workspace và một role. `member_classes` là phạm vi lớp được gán, không phải phân công giáo viên chính/trợ giảng.
- `guardian_student` nối phụ huynh với học sinh theo user, không theo membership. Một phụ huynh có thể liên kết nhiều con.
- Điểm danh, điểm, phiếu buổi học và chấm BTVN dùng khóa ghép hai cột. Các FK ghép giúp giữ dữ liệu cùng workspace/lớp.
- `tests.max` là điểm tối đa từng bài. `scores.value` có thể NULL; không có dòng hoặc giá trị NULL biểu diễn chưa có điểm. Không có cột điểm trung bình hay vắng thi.
- `homework_sections` duy nhất theo `(session_id, kind)`, tối đa bốn loại. Buổi chấm là buổi chưa hủy kế tiếp, suy ra khi đọc; không có FK lưu buổi chấm. Kết quả chấm được phụ huynh xem theo trạng thái gửi phiếu.
- `reports` duy nhất theo `(student_id, month)`; `report_publications` duy nhất theo `(report_id, publication_no)`, lưu snapshot mỗi lần phát hành. Schema còn có `pdf_key`, `pdf_bytes`; sự tồn tại của cột không chứng minh tệp PDF được lưu trên máy chủ.
- `attendance_history` và `score_history` do trigger ghi khi sửa. Các cột định danh trong hai bảng này không khai báo FK. `applied_commands` chống áp dụng lặp; `sync_conflicts` giữ hai giá trị xung đột; `change_log` phục vụ kéo thay đổi. `k1`, `k2` là khóa theo loại entity, không có FK tĩnh.
- `auth_throttle` và `fcm_oauth_cache` là bảng kỹ thuật độc lập, không có FK.

## Khác biệt với tài liệu thiết kế

ERD này ghi nhận hiện trạng, không thay đổi spec hoặc kiến trúc:

- Schema có `users.password_hash`, `auth_sessions`, `auth_throttle`; chưa có bảng OTP hoặc `invites` được mô tả trong tài liệu.
- Schema push hiện tại dùng `device_tokens`, `push_deliveries`, `fcm_oauth_cache`, khác hướng Web Push/VAPID trong `docs/architecture.md`.
- Chưa có bảng bài giảng/tệp R2, học phí, lương hoặc phân công/dạy thay. Những phần này không được thêm vào ERD MVP.

## Kiểm chứng

Đã áp dụng tuần tự cả ba migration vào SQLite tạm trong bộ nhớ, đọc lại `PRAGMA table_info` và `PRAGMA foreign_key_list` để đối chiếu bảng, cột, PK và các đường FK. Toàn bộ 29 bảng ứng dụng được bao phủ trong năm sơ đồ chi tiết. Đây là kiểm chứng schema trong repo, không phải kiểm tra database production.

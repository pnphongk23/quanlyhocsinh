# Lính A — Giao diện dữ liệu (phiếu buổi học + BTVN + bỏ Vắng thi)

Cập nhật: 2026-10-20 · Phạm vi sửa: `design/prototype/src/data/**` (không sửa `src/features`, `src/app`, `src/shared`).

Kiểm chứng đã chạy trong `design/prototype`:

- `npx vitest run src/data` → **17 file, 196 test pass** (0 fail).
- `npx tsc --noEmit` → **19 lỗi, tất cả nằm trong `src/features`** (UI chưa cập nhật theo type mới); **0 lỗi trong `src/data`**.

---

## 1. Kiểu dữ liệu (`src/data/types.ts`)

```ts
export interface Score {
  id: string;
  testId: string;
  studentId: string;
  /** null = Chưa có điểm (không tính vào trung bình). Không có trạng thái Vắng thi. */
  value: number | null;
} // ĐÃ XOÁ trường `absent`

export type StarLevel = 1 | 2 | 3;

export interface Comment {
  id: string;
  classId: string;
  studentId: string;
  sessionId: string;          // BẮT BUỘC (không còn null)
  stars: StarLevel | null;    // null = chưa chọn sao
  note: string;               // ghi chú tự do, không bắt buộc
  status: "draft" | "sent";
  sendQueued: boolean;        // đã bấm gửi lúc mất mạng, sẽ tự gửi khi online
  sentAt: string | null;
  updatedAt: string;
  createdAt: string;          // giữ lại: thời điểm tạo phiếu
} // ĐÃ XOÁ trường `content`

export type HomeworkKind = "vocabulary" | "reading" | "speaking" | "exercise";
export type HomeworkLevel = "excellent" | "done" | "not_done";

export interface HomeworkSection {
  id: string;
  sessionId: string;          // buổi giao bài
  kind: HomeworkKind;
  title: string;
  description: string;        // "" khi không có mô tả
}

export interface HomeworkGrade {
  sectionId: string;
  studentId: string;
  level: HomeworkLevel;
} // Không có dòng = "Chưa chấm"

export interface Member {
  // ...các trường cũ...
  /** Con được liên kết (chỉ role phụ huynh dùng). */
  studentIds?: string[];
}

export interface StoreState {
  // ...các trường cũ...
  homeworkSections: HomeworkSection[];
  homeworkGrades: HomeworkGrade[];
}
```

Nhãn tiếng Việt: `HomeworkKind` → Luyện từ vựng / Luyện đọc / Luyện nói / Bài tập; `HomeworkLevel` → Hoàn thành tốt / Hoàn thành / Chưa hoàn thành (xem `HOMEWORK_KIND_LABELS`, `HOMEWORK_LEVEL_LABELS`).

## 2. Câu mẫu sao (`src/data/logic.ts`)

```ts
export const STAR_TEMPLATES: Record<StarLevel, string>; // đúng nguyên văn spec mục 4, kể cả emoji
export const STAR_LEVELS: StarLevel[];                  // [1, 2, 3]
export function starTemplate(stars: StarLevel | null): string | null;

export function averageScore(scores: Pick<Score, "value">[]): number | null;
// Chỉ bỏ giá trị null; đổi chữ ký: không còn Pick<Score, "value" | "absent">
```

`STAR_TEMPLATES`:
- 3: `Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!`
- 2: `Con hoàn thành 2 sao 🌟🌟. Ghi bài đầy đủ, tham gia hoạt động học tập. Còn mất trật tự.`
- 1: `Con chỉ đạt 1 sao 🌟. Chưa tập trung, nói chuyện làm việc riêng. Đã ghi chép bài đầy đủ.`

## 3. Logic thuần BTVN + phiếu (`src/data/homework.ts`, mới)

```ts
export const HOMEWORK_KIND_LABELS: Record<HomeworkKind, string>;
export const HOMEWORK_LEVEL_LABELS: Record<HomeworkLevel, string>;
export const HOMEWORK_KINDS: HomeworkKind[];   // vocabulary, reading, speaking, exercise
export const HOMEWORK_LEVELS: HomeworkLevel[]; // excellent, done, not_done

export function compareSessions(a: Session, b: Session): number;
export function classSessions(sessions: Session[], classId: string): Session[]; // sort ngày+giờ

/** Buổi kế tiếp CHƯA HỦY của lớp sau buổi N (buổi chấm BTVN). Null = "Chưa có buổi chấm". */
export function gradingSessionFor(sessions: Session[], sessionId: string): Session | null;

/** Như trên + danh sách buổi bị hủy đã bỏ qua (để báo "buổi 19 bị hủy, chấm ở buổi 20"). */
export function gradingSessionPlan(
  sessions: Session[],
  sessionId: string,
): { session: Session | null; cancelled: Session[] };

/** Buổi gần nhất TRƯỚC buổi N mà không bị hủy (buổi đã giao BTVN). Null = buổi đầu. */
export function previousHomeworkSession(sessions: Session[], sessionId: string): Session | null;

/** Học sinh đang học vào ngày buổi: enrolledAt ≤ ngày buổi ≤ leftAt (leftAt null = còn học). */
export function studentsOnSession(state: StoreState, session: Session): Student[];

/** Học sinh đã rời lớp TRƯỚC ngày buổi (phiếu cũ vẫn giữ, hiện thẻ riêng). */
export function leftStudentsForSession(state: StoreState, sessionId: string): Student[];

export function homeworkSectionsFor(state: StoreState, sessionId: string): HomeworkSection[];
export function homeworkGradeLevel(state: StoreState, sectionId: string, studentId: string): HomeworkLevel | null;
export function missingHomeworkKinds(state: StoreState, sessionId: string): HomeworkKind[];

export type TicketStatus = "none" | "draft" | "queued" | "sent";
export function ticketStatusOf(comment: Comment | null): TicketStatus;
// none = chưa chọn sao (hoặc chưa có phiếu); sent; queued = đang chờ mạng; draft = nháp

export type HomeworkPreviousState = "first" | "none-given" | "has";

export interface HomeworkSummary {
  state: HomeworkPreviousState;
  session: Session | null;   // buổi đã giao bài (null khi "first")
  totalSections: number;
  gradedSections: number;
  ungradedSections: number;
}
export function homeworkSummaryFor(
  state: StoreState,
  givingSession: Session | null,
  studentId: string,
): HomeworkSummary;

export interface TicketRow {
  student: Student;
  comment: Comment | null;
  stars: StarLevel | null;
  status: TicketStatus;      // none | draft | queued | sent
  sentAt: string | null;
  previousHomework: HomeworkSummary;
}
/** Danh sách phiếu của một buổi. Buổi hủy hoặc không tồn tại → []. */
export function buildTicketRows(state: StoreState, sessionId: string): TicketRow[];

export interface UngradedHomeworkNotice {
  students: Student[];   // các em còn ít nhất một phần BTVN chưa chấm
  ungradedParts: number; // tổng lượt (em × phần) chưa chấm
}
/** Đếm phần BTVN buổi trước còn "Chưa chấm" của các em sẽ gửi (mặc định cả lớp). */
export function ungradedHomeworkNotice(
  state: StoreState,
  sessionId: string,
  studentIds?: string[],
): UngradedHomeworkNotice;

export interface HomeworkSectionProgress {
  section: HomeworkSection;
  total: number; graded: number; ungraded: number;
}
export interface HomeworkGradingRow {
  student: Student;
  absentAtGiving: boolean;                 // vắng HOẶC có phép ở buổi giao bài
  givingAttendance: Attendance["status"] | null;
  grades: Record<string, HomeworkLevel | null>; // sectionId → mức chấm
  graded: number; ungraded: number;
}
export interface HomeworkGradingPlan {
  state: "exists" | "moved" | "none";      // moved = buổi chấm bị chuyển do hủy
  session: Session | null;
  cancelled: Session[];                    // buổi hủy nằm giữa buổi giao và buổi chấm
}
export interface HomeworkContext {
  session: Session;
  cancelled: boolean;                      // buổi đang xem đã hủy: không giao, không chấm
  previous: {
    state: HomeworkPreviousState;          // first | none-given | has
    givingSession: Session | null;
    sections: HomeworkSectionProgress[];
    rows: HomeworkGradingRow[];            // chỉ em đang học ở buổi đang xem
  };
  today: {
    sections: HomeworkSection[];
    missingKinds: HomeworkKind[];          // "còn n loại" khi bấm Thêm phần
    grading: HomeworkGradingPlan;
  };
}
/** Ngữ cảnh tab Bài tập về nhà. Buổi không tồn tại → null. Buổi hủy → previous rỗng, today rỗng, grading "none". */
export function homeworkContext(state: StoreState, sessionId: string): HomeworkContext | null;
```

## 4. Repository nhận xét / phiếu (`src/data/repositories/comments.ts`)

```ts
export const listComments: (classId: string) => Comment[];      // giữ nguyên
export function listSessionComments(sessionId: string): Comment[]; // giữ nguyên (ngoài phạm vi → [])

export function getSessionComment(sessionId: string, studentId: string): Comment | null;

/** Upsert theo (sessionId, studentId). Ghi qua commit() nên lưu được offline. */
export function saveSessionComment(input: {
  sessionId: string;
  studentId: string;
  stars: StarLevel | null;
  note?: string;
}): Comment;

export interface SendTicketsResult {
  sent: string[];                 // studentId đã gửi (hoặc đã xếp hàng chờ mạng)
  skipped: string[];              // bỏ qua vì chưa chọn sao
  queued: boolean;                // true = mất mạng, sẽ tự gửi khi có mạng
  ungraded: UngradedHomeworkNotice; // phần BTVN buổi trước còn "Chưa chấm" của các em sẽ gửi
}
export function sendSessionTickets(sessionId: string, studentIds?: string[]): SendTicketsResult;

/** Gửi mọi phiếu đang chờ mạng khi có mạng; trả số phiếu đã gửi (0 khi vẫn offline). */
export function flushQueuedTickets(): number;
// Đã tự đăng ký window.addEventListener("online", flushQueuedTickets) trong module này.
```

Hành vi chính:

- `saveSessionComment`: phiếu mới → `status: "draft"`, `sentAt: null`. Sửa phiếu **đã gửi** → giữ `status: "sent"`, giữ `sentAt` lần đầu, `note`/`stars` mới áp ngay (không có bản nháp song song, không gửi lại). Sửa phiếu đang chờ mạng → giữ `sendQueued`.
- Chặn: mức sao ngoài 1/2/3 (`"Mức sao phải là 1, 2 hoặc 3."`), bỏ sao của phiếu đã gửi (`"Phiếu đã gửi phải giữ mức sao."`), buổi đã hủy (`"Buổi học đã hủy nên không có phiếu buổi học."`), học sinh khác lớp (`"Nhận xét phải thuộc cùng lớp."`), phụ huynh/không quyền (`"Bạn không có quyền thực hiện thao tác này."`), em không đang học ở ngày buổi (`"Học sinh không học ở buổi này."`).
- `sendSessionTickets`: chỉ gửi phiếu **đã chọn sao**; em chưa chọn sao nằm trong `skipped` (không chặn cả lớp). Trả `ungraded` để hộp xác nhận (ảnh 43) hiện "n em · n phần BTVN còn Chưa chấm". Gửi được khi còn phần chưa chấm. Buổi hủy → lỗi `"Buổi học đã hủy nên không có phiếu để gửi."`. Không có phiếu nào đủ điều kiện → không ghi hàng đợi.
- Mất mạng (`navigator.onLine === false`): không ném lỗi; đánh dấu `sendQueued = true` cho từng phiếu và ghi hàng đợi; UI hiện "Chờ mạng" / "Sẽ gửi khi có mạng". Khi online trở lại, `flushQueuedTickets()` chuyển tất cả phiếu chờ sang `status: "sent"`, đặt `sentAt`, `sendQueued: false` (gửi **mọi** phiếu đang chờ, không riêng một buổi).

## 5. Repository BTVN (`src/data/repositories/homework.ts`, mới)

Quyền: nhóm `comments_reports` mức `write` cho mọi thao tác ghi. Mọi thao tác ghi đi qua `commit()` → lưu được offline (vào hàng đợi). Buổi đã hủy bị chặn: `"Buổi học đã hủy nên không giao hoặc chấm bài tập."`

```ts
export function listHomeworkSections(sessionId: string): HomeworkSection[]; // ngoài phạm vi → []
export function listHomeworkGrades(sectionId: string): HomeworkGrade[];     // ngoài phạm vi → []

export function saveHomeworkSection(input: {
  id?: string;            // có id = sửa phần đã có (không đổi buổi)
  sessionId: string;
  kind: HomeworkKind;
  title: string;          // bắt buộc, tự trim
  description?: string;   // không bắt buộc
}): HomeworkSection;

export function deleteHomeworkSection(id: string): void;

export function setHomeworkGrade(
  sectionId: string,
  studentId: string,
  level: HomeworkLevel | null, // null = bỏ kết quả → "Chưa chấm"
): HomeworkGrade | null;

export function setHomeworkGradeForAll(sectionId: string, level: HomeworkLevel): number;
// Chỉ em còn đang học ở buổi chấm; trả số em đã chấm. Ghi đè mức cũ của các em đó.
```

Hành vi / lỗi:

- Mỗi buổi tối đa một phần mỗi loại: `"Mỗi loại chỉ có một phần trong một buổi."`; tiêu đề trống: `"Nhập tiêu đề phần bài tập."`; đổi buổi của phần đã có: `"Không chuyển phần bài tập sang buổi khác."`.
- Sửa tiêu đề/mô tả luôn được (kể cả phần đã chấm).
- Xoá chỉ khi phần chưa có `HomeworkGrade` nào: `"Đã chấm cho học sinh nên không xoá được. Vẫn sửa được tiêu đề và mô tả."`.
- Chấm theo buổi chấm suy ra (`gradingSessionFor`): phần chưa có buổi chấm → `"Chưa có buổi chấm cho phần bài tập này."` (vd. BTVN giao ở buổi cuối). Em đã rời lớp trước buổi chấm → `"Học sinh không còn học ở buổi chấm này."`. Em vắng buổi giao bài vẫn chấm bình thường.
- `setHomeworkGrade(..., null)` xoá dòng chấm (không lưu level null).

## 6. Điểm (`src/data/repositories/scores.ts`)

- `saveScore(input: Omit<Score, "id">)` — bỏ xử lý `absent`; `value` giữ nguyên như truyền vào (`null` = Chưa có điểm). Phần còn lại (quyền, thang 0–10, log sửa điểm, cờ `needsRepublish`) không đổi.

## 7. Migration (`src/data/migrations.ts`)

```ts
export function migrateScores(scores: unknown): Score[];
// Bỏ trường `absent`; absent === true → value: null. Mảng không hợp lệ → [].

export function migrateComments(comments: unknown): Comment[];
// Bỏ nhận xét cũ không có `stars` (nhận xét tự do `content`), bỏ phiếu thiếu classId/studentId/sessionId.
// Phiếu giữ lại được điền note "" , status draft|sent, sendQueued false, sentAt, updatedAt (fallback sentAt/createdAt/"1970-01-01T00:00:00.000Z"), createdAt.

export function migrateStoreSessions(...); // giữ nguyên
export function migrateStore(data): StoreState;
```

`migrateStore` bổ sung:

- `scores`: qua `migrateScores`; `comments`: qua `migrateComments`.
- `homeworkSections` / `homeworkGrades`: có mảng thì giữ (kể cả rỗng), thiếu thì `[]` (localStorage cũ **không** tự có dữ liệu BTVN mẫu — bấm "Đặt lại dữ liệu mẫu" ở Cài đặt để xem seed mới).
- Nếu members chưa có membership role `guardian` và workspace là seed (có `member-lan-admin`) → thêm membership phụ huynh mẫu + thêm vào `auth.memberIds` (chạy lại không thêm trùng).
- `migrateStoreSessions` giữ nguyên.

## 8. Quyền phụ huynh (`src/data/repositories/access.ts`, `students.ts`)

```ts
export function isGuardian(): boolean;
export function linkedStudentIds(): Set<string>;          // Member.studentIds của membership đang dùng
export function canAccessStudent(studentId: string): boolean;
// Admin/nhân sự: theo lớp được gán như cũ. Phụ huynh: chỉ con được liên kết.
```

- `getStudent(id)` (students.ts) giờ dùng `canAccessStudent` → phụ huynh đọc được hồ sơ con liên kết, không đọc được em khác. Hành vi của nhân sự/Admin không đổi.
- `can(...)` giữ nguyên: role `kind === "guardian"` không bao giờ có mức `write`. `listSessionComments`, `listComments`, `listHomeworkSections`, `buildTicketRows`... đều theo phạm vi lớp nên phụ huynh nhận `[]`.
- Seed: `MEMBER_IDS.lanGuardian = "member-lan-guardian"` (role `role-guardian`, `studentIds: ["6a-student-1", "6a-student-8"]`, `classIds: []`), nằm trong `auth.memberIds` sau Admin và Giáo viên.

## 9. Seed mới (`src/data/seed.ts`) — id ứng với từng trạng thái ảnh

Lớp: `6a` = "Tiếng Anh giao tiếp 6A" (10 em, `6a-student-0..9`); `ielts` = "IELTS 7.0" (`ielts-student-0..9`).

Buổi lớp 6A: `6a-session-0` (21/09) … `6a-session-7` (14/10, đã diễn ra), `6a-session-8` (19/10, `planned`), `6a-extra-session` (25/10 17:00, học bù, `planned`), `6a-extra-cancelled` (16/10 18:00, học bù **đã hủy**).
Buổi lớp IELTS: `ielts-session-0` (22/09) … `ielts-session-8` (20/10, `planned`, **buổi cuối**).

Học sinh đã rời lớp: `6a-student-9` = "Đỗ Hải Nam", `leftAt = "2026-10-09"`, còn 1 phiếu cũ đã gửi ở `6a-session-5`.

Phần BTVN:

| id | buổi giao | loại | tiêu đề |
|---|---|---|---|
| `6a-hw-6-vocabulary` | `6a-session-6` (12/10) | vocabulary | Unit 5 · 12 từ chủ đề Food |
| `6a-hw-6-exercise` | `6a-session-6` | exercise | Workbook trang 38–39 |
| `6a-hw-7-vocabulary` | `6a-session-7` (14/10) | vocabulary | Unit 6 · 15 từ chủ đề Travel |
| `6a-hw-7-speaking` | `6a-session-7` | speaking | Kể về chuyến đi gần nhất |
| `6a-hw-7-exercise` | `6a-session-7` | exercise | Workbook trang 42–43 |
| `ielts-hw-8-vocabulary` | `ielts-session-8` (20/10) | vocabulary | Unit 7 · 15 từ chủ đề Health |
| `ielts-hw-8-exercise` | `ielts-session-8` | exercise | Workbook trang 50–51 |

Kết quả chấm mẫu cho BTVN buổi `6a-session-6` (chấm ở `6a-session-7`): Luyện từ vựng **8/9 em đã chấm**, Bài tập **7/9 em đã chấm**. Chưa chấm: `6a-student-0` (cả 2 phần, **vắng buổi giao bài** — điểm danh `absent` ở `6a-session-6`) và `6a-student-3` (phần Bài tập). → `ungradedHomeworkNotice(6a-session-7)` = 2 em · 3 phần (khớp hộp xác nhận ảnh 43).

Phiếu mẫu (`6a-session-7` trừ phiếu cuối):

| id | em | buổi | sao | trạng thái |
|---|---|---|---|---|
| `6a-student-1-comment-s8` | Trần Gia Bảo | `6a-session-7` | 3 | sent, `sentAt 2026-10-14T13:14:00.000Z` |
| `6a-student-2-comment-s8` | Lê Khánh Chi | `6a-session-7` | 2 | draft |
| `6a-student-3-comment-s8` | Phạm Đức Dũng | `6a-session-7` | 2 | draft + `sendQueued: true` ("Chờ mạng") |
| `6a-student-9-comment-s6` | Đỗ Hải Nam (đã rời lớp) | `6a-session-5` | 2 | sent (phiếu cũ giữ lại) |
| `ielts-student-0-comment-s8` | IELTS em 0 | `ielts-session-7` | 3 | sent |
| `ielts-student-1-comment-s8` | IELTS em 1 | `ielts-session-7` | 3 | draft |

Các em còn lại của `6a-session-7` (`6a-student-0`, `4`, `5`, `6`, `7`, `8`) **chưa chọn sao** → `buildTicketRows` cho 9 dòng với status `none, sent, draft, queued, none, none, none, none, none`.

### Bản đồ ảnh → dữ liệu

| Ảnh | Dùng gì |
|---|---|
| 40 danh sách nhận xét | `buildTicketRows(state, "6a-session-7")`: 9 dòng, `status` + `stars` + `previousHomework` (2/2 hoặc 0/2, 1/2 phần đã chấm). Bộ lọc: `status === "none"` (Chưa chọn sao), `status !== "sent"` (Chưa gửi). |
| 41 sheet nhận xét (nháp) | phiếu `6a-student-2-comment-s8` (draft, 2 sao, ghi chú rỗng) hoặc `6a-student-3` (queued); câu mẫu lấy `STAR_TEMPLATES[stars]`. |
| 42 sửa phiếu đã gửi | phiếu `6a-student-1-comment-s8`: `saveSessionComment` giữ `status "sent"`, `sentAt` không đổi. |
| 43 xác nhận gửi cả lớp | `ungradedHomeworkNotice(state, "6a-session-7")` → 2 em · 3 phần; đếm phiếu sẽ gửi = 3 (student 1, 2, 3), chưa chọn sao = 6. |
| 44 gửi khi mất mạng | phiếu `6a-student-3-comment-s8` đang `sendQueued`; hoặc gọi `sendSessionTickets` khi `navigator.onLine === false` → `queued: true`, mọi phiếu thành "Chờ mạng". |
| 45 buổi đầu chưa có BTVN | `homeworkContext(state, "6a-session-0")` (hoặc `ielts-session-0`): `previous.state === "first"`, `givingSession === null`. |
| 46 buổi trước không giao BTVN | `homeworkContext(state, "6a-session-1")` (hoặc `6a-session-6`): `previous.state === "none-given"`, `sections: []`. |
| 47 học sinh đã rời lớp | `leftStudentsForSession(state, "6a-session-7")` → `6a-student-9` (Đỗ Hải Nam, "Đã rời lớp"); phiếu cũ `6a-student-9-comment-s6`; `buildTicketRows` không có em này. |
| 50 bài tập buổi trước (chấm dở) | `homeworkContext(state, "6a-session-7").previous`: 2 phần, `sections` = `[vocabulary 8/9, exercise 7/9]`, `rows` cho từng em; `gradingSessionFor` → `6a-session-7`. |
| 51 bài tập hôm nay (bình thường, "chấm ở buổi kế") | `homeworkContext(state, "6a-session-6").today`: 2 phần, `grading.state === "exists"`, `grading.session.id === "6a-session-7"`; `missingKinds = ["reading","speaking"]` ("còn 2 loại"). |
| 52 thêm phần | `homeworkContext(state, "6a-session-7").today.missingKinds` = `["reading"]` ("còn 1 loại"); `saveHomeworkSection`. |
| 53 sửa phần đã chấm | `saveHomeworkSection({ id: "6a-hw-6-vocabulary", ... })` sửa được; `deleteHomeworkSection("6a-hw-6-vocabulary")` ném "Đã chấm cho học sinh nên không xoá được…". |
| 54 sửa phần chưa chấm | `6a-hw-7-vocabulary` / `6a-hw-7-speaking` / `6a-hw-7-exercise` (chưa có grade) → xoá được. `6a-hw-6-*` chưa chấm ở `6a-student-0/3` nhưng **đã có grade** của em khác nên vẫn không xoá được. |
| 55 buổi đầu | như 45 (`6a-session-0`, `ielts-session-0`). |
| 56 buổi trước không giao | như 46 (`6a-session-1`, hoặc `6a-session-6`). |
| 57 buổi chấm bị hủy | `homeworkContext(state, "6a-session-7").today.grading` → `state: "moved"`, `session.id === "6a-session-8"`, `cancelled: [6a-extra-cancelled]` (16/10). |
| 58 chưa có buổi chấm | `homeworkContext(state, "ielts-session-8").today.grading` → `state: "none"`, `session: null`; `today.sections` 2 phần; `missingKinds = ["reading","speaking"]`. |
| 59 em vắng buổi giao bài | `homeworkContext(state, "6a-session-7").previous.rows` → `6a-student-0` có `absentAtGiving: true`, `givingAttendance: "absent"`, `ungraded: 2` (hiện chip "Vắng buổi giao bài" + "Chưa chấm"). |
| 62 chấm từ sheet nhận xét | dùng `buildTicketRows(...).previousHomework` để hiện tóm tắt; điều hướng sang tab BTVN (UI). |

## 10. Test đã thêm/sửa trong `src/data`

- Mới: `src/data/homework.test.ts` (19 test: câu mẫu, buổi chấm/chuyển do hủy, phiếu, first/none-given/has, vắng buổi giao bài, buổi hủy, đếm phần chưa chấm).
- Mới: `src/data/repositories/comments.test.ts` (12 test: upsert, giữ sent, chặn mức sao, buổi hủy, quyền phụ huynh, gửi bỏ qua em chưa chọn sao, gửi khi còn bài chưa chấm, offline queue + flush, sửa phiếu đang chờ mạng).
- Mới: `src/data/repositories/homework.test.ts` (11 test: một phần mỗi loại, sửa, xoá, chặn xoá khi đã chấm, chấm từng em/cả lớp, giới hạn em còn học, chưa có buổi chấm, offline, quyền phụ huynh).
- Sửa theo spec (không nới lỏng): `logic.test.ts` (bỏ `absent`), `migrations.test.ts` (+5 test migration điểm/nhận xét/BTVN/phụ huynh), `access.test.ts` (+ membership phụ huynh trong danh sách, + test phạm vi phụ huynh), `classScopeRegression.test.ts` (API phiếu mới; payload lệch lớp dùng `6a-session-5` + `ielts-student-0`), `teaching.test.ts` (thêm 1 dòng buổi hủy 16/10 — seed mới), `repositories.test.ts` (ghim `vi.setSystemTime(2026-10-18)` cho test `updateClass`: test này đã **fail sẵn** trước khi sửa vì đồng hồ máy đã qua 19/10).
- Seed có thêm membership phụ huynh nên `access.test` kỳ vọng 3 membership.

## 11. Lỗi typecheck còn lại (chờ Lính UI) — chỉ trong `src/features`

Các Lính UI đang sửa `src/features` song song (một số lỗi `Score.absent` ở `src/features/scores` đã hết trong lúc tôi làm), nên danh sách dưới đây là **ảnh chụp lúc 07:07 ngày 20/10**: 19 lỗi, tất cả trong `src/features`, **0 lỗi trong `src/data`**:

- `src/features/comments/CommentsPanel.tsx` (8): dùng `saveComment`, `sendComment`, `comment.content`.
- `src/features/reports/reportModel.ts` (1) + `ReportsPage.tsx` (4) + `reportModel.test.ts` (5): `score.absent`, `comment.content`.
- `src/features/class-space/TestsTab.tsx` (1): `score.absent`.

Gợi ý map nhanh: `score.absent ? "Vắng thi" : …` → `score.value === null ? "Chưa có điểm" : format(score.value)`; `comment.content` → `starTemplate(comment.stars)` + `comment.note`; `saveComment` → `saveSessionComment`; `sendComment(id)` → `sendSessionTickets(sessionId)`.

---

Status: DONE_WITH_CONCERNS

Summary: Đã đổi tầng dữ liệu sang phiếu sao + BTVN + bỏ Vắng thi, thêm seed phủ đủ trạng thái ảnh 40–59 và membership phụ huynh; `npx vitest run src/data` pass 195/195, typecheck chỉ còn lỗi trong `src/features`.

Concerns/Blockers:

1. `listMembers()` (`src/data/repositories/staff.ts`, không được sửa trong lượt này) trả **tất cả** members → membership phụ huynh mới (`member-lan-guardian`) sẽ lẫn vào màn Nhân sự (`src/features/staff/MembersPage.tsx`): đếm thành viên, danh sách, có thể cả nút mời/gán lớp. Cần lọc `role.kind === "staff"` (hoặc thêm bộ lọc "loại thành viên") ở tầng UI/repository khi làm màn nhân sự.
2. Chưa có API đọc cho màn phụ huynh: `listSessionComments`/`buildTicketRows`/`listHomeworkSections`/`homeworkContext` đều theo phạm vi lớp/buổi nên phụ huynh (classIds rỗng) nhận rỗng. Đã có `canAccessStudent`, `linkedStudentIds`, `getStudent` cho con liên kết, nhưng phiếu đã gửi + BTVN của con cần thêm hàm đọc riêng (ảnh 08, 09, 14, 15). Đề nghị lead giao bổ sung khi làm màn phụ huynh.
3. Migration chỉ điền `homeworkSections/homeworkGrades = []` cho localStorage cũ; muốn thấy dữ liệu BTVN mẫu phải bấm "Đặt lại dữ liệu mẫu" (Cài đặt) hoặc xoá key `teacher-prototype-v1`.
4. Seed giữ `6a-session-8` (19/10) ở trạng thái `planned` dù ngày đã qua so với đồng hồ hiện tại (20/10) — cần cho trạng thái "buổi chấm bị chuyển do hủy" và các test hiện có; UI không nên chặn xem/chấm theo `isFutureSession` cho buổi này.
5. Ba membership của Cô Lan trùng tên "Cô Lan": màn chọn vai trò sẽ hiện 2 dòng giống nhau (Admin/Giáo viên) và thêm dòng Phụ huynh — cần nhãn loại vai trò rõ (UI), không phải lỗi dữ liệu.

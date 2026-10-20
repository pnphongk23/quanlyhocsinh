# Lính A2 — Dữ liệu cho báo cáo tháng và màn phụ huynh

Cập nhật: 2026-10-20 · Phạm vi sửa: `design/prototype/src/data/**` (thêm `repositories/guardian.ts`,
sửa `types.ts`, `migrations.ts`, `seed.ts`, `repositories/staff.ts`, `repositories/reports.ts`, test)
và `src/features/reports/reportModel.ts` + `reportModel.test.ts`. Không sửa file nào khác trong
`src/features`, `src/app`, `src/shared`.

Kiểm chứng trong `design/prototype`:

- `npx vitest run src/data src/features/reports` → **19 file, 230 test pass** (0 fail).
- `npx tsc --noEmit` → **0 lỗi trong `src/data` và `src/features/reports/reportModel*`**. Lỗi còn lại
  đều ở file của Lính UI khác: `src/features/comments/CommentsPanel.tsx`,
  `src/features/class-space/TestsTab.tsx`, `src/features/reports/ReportsPage.tsx`.

---

## 1. `reportModel` (`src/features/reports/reportModel.ts`)

### 1.1 Chữ ký

```ts
export interface MonthlyStudentReportData {
  sessions: Session[];
  attendance: Attendance[];
  tests: Test[];
  scores: Score[];
  /** Phiếu buổi học của lớp; chỉ phiếu status: "sent" mới được tính. */
  comments: Comment[];
  /** Các phần BTVN của lớp. */
  homeworkSections: HomeworkSection[];
  /** Kết quả chấm BTVN của lớp. */
  homeworkGrades: HomeworkGrade[];
  /** Nhận xét chung của tháng, lưu ở Report.generalComment. */
  generalComment: string;
}

export interface MonthlyStarTally {
  ticketCount: number;                    // số buổi có phiếu đã gửi
  byStars: Record<StarLevel, number>;     // { 1: n, 2: n, 3: n }
}

export interface MonthlyHomeworkTally {
  kind: HomeworkKind;
  label: string;                          // "Luyện từ vựng" | "Luyện đọc" | "Luyện nói" | "Bài tập"
  excellent: number;                      // Hoàn thành tốt
  done: number;                           // Hoàn thành
  not_done: number;                       // Chưa hoàn thành
  total: number;                          // = excellent + done + not_done
}

export interface MonthlyStudentReport {
  student: Student;
  month: string;                          // "YYYY-MM"
  sessions: Session[];                    // buổi held trong tháng, trong khoảng vào lớp..rời lớp
  attendance: Attendance[];
  tests: Array<{ test: Test; score: Score | undefined }>;
  average: number | null;                 // TB bài có điểm; null = chưa có điểm nào
  gradedTestCount: number;                // số bài đã có điểm ("3 bài kiểm tra")
  attendanceCount: number;                // số buổi có mặt hoặc muộn ("8/9 buổi")
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  stars: MonthlyStarTally;
  homework: MonthlyHomeworkTally[];       // thứ tự Luyện từ vựng → Bài tập; chỉ loại có kết quả được tính
  generalComment: string;
  suggestion: string | null;              // gợi ý nhận xét chung (null khi chưa có phiếu nào)
  ready: boolean;                         // missing rỗng
  missing: string[];
}

export function buildMonthlyStudentReport(
  student: Student,
  month: string,
  data: MonthlyStudentReportData,
): MonthlyStudentReport | null;

export function buildStarSuggestion(byStars: Record<StarLevel, number>): string | null;
```

### 1.2 Cách tính (spec mục 4 "Nhận xét và báo cáo")

- **Buổi**: `status === "held"`, thuộc đúng lớp của em, ngày trong tháng, trong khoảng
  `enrolledAt ≤ ngày ≤ leftAt`. Em chưa vào lớp hoặc đã rời lớp trước tháng → hàm trả `null`
  (tháng không đúng định dạng `YYYY-MM` cũng trả `null`).
- **Điểm**: chỉ bài trong tháng và trong khoảng vào/rời lớp. `Score.value === null`
  ("Chưa có điểm") **không** tính vào `average` nhưng **vẫn là dữ liệu còn thiếu**
  (`Thiếu điểm <tên bài>`); mỗi bài thiếu là một dòng riêng.
- **Sao**: chỉ phiếu `status === "sent"` và có `stars` 1/2/3, buổi của phiếu nằm trong tháng.
  Phiếu nháp / đang chờ mạng / phiếu tháng khác không tính. `ticketCount` = tổng số phiếu đã gửi
  ("8 buổi có phiếu" ở ảnh 07/10).
- **BTVN**: chỉ tính phần BTVN **giao trong tháng** (buổi giao trong khoảng vào/rời lớp) khi
  thoả cả hai điều kiện: (a) phần đã được chấm cho em, (b) **phiếu của buổi chấm đã gửi cho em**
  (buổi chấm suy ra bằng `gradingSessionFor`, bỏ qua buổi hủy). Phần "Chưa chấm" và phần có kết quả
  nhưng phiếu buổi chấm chưa gửi đều không xuất hiện. BTVN **không** quy ra điểm và **không** vào
  `average`. Chỉ những loại có ít nhất một kết quả được tính mới có dòng trong `homework`.
- **Nhận xét chung**: lấy từ `data.generalComment` (đã trim). **Không** lấy từ nhận xét buổi học —
  điều kiện cũ dựa trên nhận xét tự do đã bỏ.
- **`missing`** (nhãn đúng chữ trong ảnh 13/26): `"Thiếu điểm danh"`, `"Thiếu điểm <tên bài>"`,
  `"Thiếu nhận xét chung"`. `ready = missing.length === 0`.
- **Gợi ý nhận xét chung** (nguyên văn ảnh 13/26):
  `Gợi ý theo số buổi 3/2/1 sao của tháng: Tháng này con có <n3> buổi 3 sao, <n2> buổi 2 sao, <n1> buổi 1 sao.`
  Tháng chưa có phiếu đã gửi nào → `null` (spec/ảnh không nêu câu thay thế, không bịa).

## 2. Kiểu dữ liệu thay đổi (`src/data/types.ts`)

```ts
export interface Report {
  id: string; classId: string; studentId: string; month: string;
  status: "draft" | "published";
  needsRepublish: boolean;
  /** MỚI: nhận xét chung của tháng do giáo viên soạn (nội dung báo cáo). */
  generalComment: string;
  /** MỚI: thời điểm phát hành gần nhất; null = chưa phát hành (UI có thể hiện "Đã phát hành · 12/10"). */
  publishedAt: string | null;
}
```

`Report` chưa có chỗ lưu nhận xét chung nên đã bổ sung `generalComment` (spec mục 4 liệt kê
"nhận xét chung" là nội dung báo cáo). `publishedAt` phục vụ nhãn "Đã phát hành · 12/10" (ảnh 13).

Repository báo cáo (`src/data/repositories/reports.ts`):

- `saveReport(input)` — báo cáo mới có `generalComment: ""`, `publishedAt: null` (hành vi cũ giữ nguyên).
- `publishReport(id)` — như cũ, thêm `publishedAt = new Date().toISOString()`.
- **MỚI** `saveReportComment(id: string, generalComment: string): Report` — lưu nhận xét chung
  (tự `trim`), dùng cho ô "Nhận xét chung của tháng" + nút "Dùng gợi ý làm bản nháp" (ảnh 13/26).
  Sửa nhận xét chung của báo cáo đã phát hành **không** tự bật `needsRepublish` (spec chỉ nêu cờ này
  cho trường hợp sửa điểm — xem mục 6, câu hỏi mở).

`src/data/migrations.ts`: thêm `migrateReports(reports)` (điền `generalComment: ""`, `publishedAt: null`,
bỏ bản ghi thiếu `classId/studentId/month`) và `migrateStore` dùng nó cho `reports`.

## 3. Repository phụ huynh (`src/data/repositories/guardian.ts`, mới)

Chỉ đọc. Chỉ role `kind === "guardian"`; mọi hàm kiểm `canAccessStudent` (con được liên kết qua
`Member.studentIds`) và mức Đọc của nhóm quyền tương ứng.

```ts
export const GUARDIAN_PERMISSION_ERROR = "Bạn không có quyền thực hiện thao tác này.";
export const STUDENT_ACCESS_ERROR = "Bạn không có quyền truy cập học sinh này.";

export interface GuardianChild { student: Student; className: string }

export function listMyChildren(): GuardianChild[];
// Con được liên kết (Member.studentIds), sắp theo tên (localeCompare "vi").

export interface ChildHomeworkResult {
  section: HomeworkSection;
  kind: HomeworkKind;
  kindLabel: string;            // nhãn tiếng Việt của loại phần
  level: HomeworkLevel | null;  // null = "Chưa chấm"
}

export interface ChildTicket {
  comment: Comment;
  session: Session;
  sessionNumber: number;        // "Buổi 18" (bỏ buổi đã hủy, như màn giáo viên)
  date: string;                 // session.date "YYYY-MM-DD"
  stars: StarLevel;             // 1 | 2 | 3 (phiếu chưa chọn sao không bao giờ trả về)
  template: string;             // câu mẫu cố định của mức sao
  note: string;                 // ghi chú tự do, "" nếu không có
  sentAt: string | null;
  homework: {                   // kết quả chấm BTVN buổi trước đi kèm phiếu
    session: Session | null;    // buổi giao bài; null khi buổi đầu tiên của lớp
    sessionNumber: number | null;
    sections: ChildHomeworkResult[];
  };
}

export function listChildTickets(studentId: string): ChildTicket[];
// Chỉ phiếu status "sent" (không có nháp / "chờ mạng"), mới nhất trước (ngày + giờ buổi).

export function getChildTicket(studentId: string, sessionId: string): ChildTicket | null;
// null khi phiếu chưa gửi hoặc không có phiếu → phụ huynh không thấy bản nháp.

export interface ChildHomeworkGrading {
  state: "exists" | "moved" | "none";  // bình thường / bị chuyển do hủy / chưa có buổi chấm
  session: Session | null;             // buổi chấm
  sessionNumber: number | null;
  cancelled: Array<{ session: Session; sessionNumber: number }>; // buổi hủy bị bỏ qua
}

export interface ChildHomeworkSection {
  section: HomeworkSection;
  kind: HomeworkKind;
  kindLabel: string;
  graded: boolean;              // phiếu của buổi chấm đã gửi → được hiện kết quả
  level: HomeworkLevel | null;  // null = "Chưa chấm"
}

export interface ChildHomework {
  session: Session;             // buổi giao bài
  sessionNumber: number;
  date: string;
  sections: ChildHomeworkSection[];
  grading: ChildHomeworkGrading;
}

export function getChildHomework(studentId: string, sessionId?: string): ChildHomework[];
// Đề BTVN hiện NGAY khi giáo viên lưu (không cần gửi phiếu).
// Không truyền sessionId → mọi buổi có giao BTVN cho con, mới nhất trước.
// Có sessionId → mảng 0 hoặc 1 phần tử (buổi không có BTVN / không thuộc con → []).
// Bỏ buổi đã hủy và buổi ngoài khoảng ngày vào lớp..ngày rời lớp.

export interface ChildOverviewAttendance {
  attended: number;   // "16/18 buổi": có mặt + muộn
  total: number;      // số buổi đã diễn ra trong tháng của em
  late: number; excused: number; absent: number;
}
export interface ChildOverviewScore { test: Test; value: number; date: string }

export interface ChildOverview {
  student: Student;
  className: string;
  month: string;
  attendance: ChildOverviewAttendance | null;  // null khi role phụ huynh bị tắt nhóm Buổi học và điểm danh
  average: number | null;                      // TB tháng này
  previousMonthAverage: number | null;         // TB tháng trước (null nếu tháng trước không có điểm)
  averageChange: number | null;                // average − previousMonthAverage
  latestComment: ChildTicket | null;           // phiếu đã gửi gần nhất (mức sao + câu mẫu + ghi chú)
  recentScores: ChildOverviewScore[];          // bài đã có điểm, mới nhất trước
  teacherNote: string | null;                  // "Điều cô muốn chia sẻ" = generalComment của báo cáo ĐÃ PHÁT HÀNH mới nhất
}

export function getChildOverview(studentId: string, month: string): ChildOverview | null;
// null khi em chưa vào lớp hoặc đã rời lớp trước tháng đó.

export interface ChildMonthlyReport {
  report: Report;                 // status "published", có generalComment + publishedAt
  body: MonthlyStudentReport;     // dựng bằng buildMonthlyStudentReport
  needsRepublish: boolean;        // điểm có cập nhật, cần phát hành lại
}

export function getChildMonthlyReport(studentId: string, month: string): ChildMonthlyReport | null;
// CHỈ khi báo cáo đã phát hành; báo cáo nháp hoặc chưa có → null.
```

Hành vi / bảo vệ:

- Vai trò không phải phụ huynh (Admin, Giáo viên, Trợ giảng) gọi hàm nào cũng bị từ chối
  `"Bạn không có quyền thực hiện thao tác này."` (`listMyChildren` cũng vậy — không trả rỗng lặng lẽ).
- Học sinh không phải con được liên kết → `"Bạn không có quyền truy cập học sinh này."`
  (không lộ em đó có tồn tại hay không).
- Nhóm quyền bị Admin tắt: phiếu/BTVN/báo cáo (nhóm `comments_reports`) → ném cùng lỗi quyền;
  tổng quan vẫn mở nhưng phần bị tắt trả `null`/rỗng (`attendance: null`, `average: null`,
  `latestComment: null`, `recentScores: []`).
- Sửa phiếu, sửa/chấm BTVN, sửa điểm sau khi gửi/phát hành → phụ huynh thấy bản mới ngay
  (không có bản nháp song song, không cần gửi lại).
- Không có hàm ghi nào trong file; mọi thao tác ghi sẵn có vẫn chặn phụ huynh như trước.
- Không trả trung bình lớp hay điểm em khác (spec 3.1): mọi truy vấn lọc theo `student.id`.

## 4. `listMembers()` lọc membership phụ huynh (`src/data/repositories/staff.ts`)

`listMembers()` giờ chỉ trả membership có role `kind === "staff"`. Kiểm tra bằng
`srcwalk trace callers listMembers --scope src`: 6 call site, cả 6 đều là màn nhân sự
(`MembersPage`, `RolesPage` — dòng "{n} vai trò · {m} nhân sự", `SessionDetailPage` →
`activeStaffMembers()` vốn đã tự lọc `role.kind === "staff"`), không nơi nào cần membership phụ huynh:

- Màn chọn vai trò dùng `listMyMemberships()` (không đổi).
- Đếm người theo role dùng `roleMemberCount(roleId)` (không đổi → vẫn đếm được membership phụ huynh).
- Cần đọc dữ liệu phụ huynh thì dùng `repositories/guardian.ts`.

Test: `staff.test.ts` thêm 1 test (không có `member-lan-guardian`, `roleMemberCount(ROLE_IDS.guardian) === 1`,
membership phụ huynh vẫn còn trong workspace). Test cũ giữ nguyên.

## 5. Seed bổ sung (cuối `src/data/seed.ts`, hàm `seedReportAndGuardianViews`)

Không đổi dữ liệu của phần trên (Lính A). Thêm:

| Dữ liệu | Id | Dùng cho ảnh |
|---|---|---|
| Báo cáo tháng 10 đã phát hành, có nhận xét chung | `6a-student-1-report` (`status: published`, `publishedAt: 2026-10-12T09:00:00.000Z`, `generalComment` có nội dung) | 10, 13, 26 (con của membership phụ huynh Cô Lan) |
| Báo cáo tháng 10 đã phát hành (chưa có nhận xét chung) | `6a-student-0-report`, `ielts-student-0-report`, `ielts-student-1-report` | 13/26: nhãn "Thiếu nhận xét chung" |
| Báo cáo nháp | `6a-student-8-report` (draft, `generalComment: ""`) | 10: phụ huynh chưa thấy báo cáo của con thứ hai; 13: nhãn "Nháp"/"Thiếu dữ liệu" |
| Phiếu đã gửi thêm trong tháng 10 | `6a-student-1-comment-s5` (3 sao, buổi 05/10), `-s6` (2 sao, 07/10), `-s7` (1 sao, 12/10) | 07, 10: "Nhận xét theo sao" 3 sao ×2 / 2 sao ×1 / 1 sao ×1, "4 buổi có phiếu"; 14: danh sách phiếu |
| Phiếu đã gửi của con thứ hai | `6a-student-8-comment-s6` (2 sao), `-s7` (3 sao) | 14, 15: chuyển giữa hai con |
| Phiếu đã gửi sẵn có | `6a-student-1-comment-s8` (3 sao, 14/10, có ghi chú) | 07, 14, 15: "Nhận xét mới nhất" |
| Phần BTVN giao ở buổi cuối (học bù 25/10) | `6a-hw-extra-vocabulary` (buổi `6a-extra-session`) | 35: "Chưa có buổi chấm" |

Bản đồ ảnh → API (chỉ phần dữ liệu):

| Ảnh | Gọi gì |
|---|---|
| 07 GV báo cáo tháng xem trước | `buildMonthlyStudentReport(student, "2026-10", {...})`: `attendanceCount/sessions.length`, `lateCount`, `average`, `gradedTestCount`, `stars.ticketCount` + `stars.byStars`, `homework`, `generalComment`, `suggestion` |
| 10 PH báo cáo tháng | `getChildMonthlyReport("6a-student-1", "2026-10")` → `body.stars`, `body.homework`, `body.generalComment` |
| 13 / 26 duyệt & phát hành | `buildMonthlyStudentReport(...)`: `ready`, `missing` (`"Thiếu nhận xét chung"`, `"Thiếu điểm Unit 5"`), `suggestion`; lưu bằng `saveReportComment` |
| 08 PH phiếu buổi học | `getChildTicket("6a-student-1", "6a-session-7")` (sao + câu mẫu + ghi chú + `homework.sections` với `level`) + `getChildHomework("6a-student-1", "6a-session-7")` (BTVN mới + `grading`) |
| 09 PH BTVN của con | `getChildHomework("6a-student-1")` → mới nhất trước, `sections[].level`, `grading` |
| 14 PH nhận xét | `listChildTickets("6a-student-1")` (mới nhất trước; phần tử `[0]` là "Mới") |
| 15 PH tổng quan | `getChildOverview("6a-student-1", "2026-10")`: `attendance` (3/4 buổi · 0 muộn · 1 có phép), `average` 9, `previousMonthAverage` 7, `averageChange` +2, `latestComment`, `recentScores`, `teacherNote` (= `generalComment` của báo cáo đã phát hành mới nhất, ở seed là "Tháng này con tiến bộ…") |
| 34 PH BTVN buổi chấm bị hủy | `getChildHomework("6a-student-1", "6a-session-7")[0].grading` → `state: "moved"`, `session = 6a-session-8`, `cancelled = [6a-extra-cancelled]` (16/10) |
| 35 PH BTVN chưa có buổi chấm | `getChildHomework("6a-student-1", "6a-extra-session")[0].grading` → `state: "none"`, `session: null` |

## 6. Quyết định của lead (2026-10-20) / ghi chú cho Lính UI

1. **"Điều cô muốn chia sẻ"** (ảnh 15) — ĐÃ CHỐT: `getChildOverview().teacherNote` lấy `generalComment`
   (nhận xét chung) của báo cáo **ĐÃ PHÁT HÀNH mới nhất** của con (tháng mới nhất; cùng tháng thì
   `publishedAt` mới nhất). Chưa có báo cáo phát hành, hoặc nhận xét chung để trống, hoặc role phụ
   huynh bị tắt nhóm Nhận xét và báo cáo → `null` và UI ẩn khối. Giá trị được `trim`; seed hiện tại
   cho `6a-student-1` (báo cáo tháng 10 đã phát hành) nên màn 15 có lời nhắn ngay.
2. `suggestion` trả `null` khi tháng chưa có phiếu đã gửi — ảnh không có trạng thái này; UI ẩn nút
   "Dùng gợi ý làm bản nháp" khi `null`.
3. Cờ "cần phát hành lại" — ĐÃ CHỐT giữ nguyên: chỉ bật khi sửa điểm sau khi phát hành (đúng spec mục 4).
   Sửa nhận xét chung của báo cáo đã phát hành không bật cờ.
4. Hai test đỏ ngoài phạm vi (không do thay đổi này): `src/features/class-space/sessionDetailTabs.test.tsx`
   — (a) chờ chữ "Phụ huynh thay đổi ngay" mà `CommentsPanel` hiện chưa có (Lính UI đang làm dở, còn
   sót `require("node:fs").writeFileSync("/tmp/dbg2.html", …)` trong test), (b) kỳ vọng "Chỉ điểm danh
   được từ ngày học" cho buổi 19/10 trong khi hôm nay đã là 20/10 nên buổi không còn ở tương lai.

---

Status: DONE_WITH_CONCERNS

Summary: Đã dựng lại `reportModel` theo nội dung báo cáo mới (chuyên cần, điểm, số buổi 3/2/1 sao,
BTVN theo loại, nhận xét chung + câu gợi ý nguyên văn, `ready`/`missing`), thêm `repositories/guardian.ts`
chỉ đọc dữ liệu đã gửi/đã phát hành của con được liên kết, lọc membership phụ huynh khỏi `listMembers()`
và bổ sung seed cho báo cáo tháng 10; `npx vitest run src/data src/features/reports` pass 230/230,
typecheck sạch trong phạm vi được giao. Sau review của lead: `teacherNote` đã nối vào `generalComment`
của báo cáo đã phát hành mới nhất (+3 test mới).

Concerns/Blockers:

1. Ảnh 34/35 cần trạng thái "Chưa có buổi chấm": đã thêm phần BTVN ở buổi học bù 25/10 của 6A để
   phụ huynh (chỉ liên kết hai con lớp 6A) demo được `grading.state: "none"`; ảnh 35 gốc dùng lớp IELTS.
2. `getChildMonthlyReport` import `reportModel` từ `src/features/reports` (theo yêu cầu dùng lại
   `buildMonthlyStudentReport`), tức tầng `data` phụ thuộc `features/reports`; không có vòng import
   nhưng nếu muốn thuần kiến trúc thì nên chuyển `reportModel` sang `src/data` sau.
5. Hai test đỏ ở `src/features/class-space/sessionDetailTabs.test.tsx` là của Lính UI đang làm song song
   (một test chờ chữ chưa có trong `CommentsPanel`, một test phụ thuộc ngày vì buổi 19/10 đã qua),
   không liên quan thay đổi dữ liệu này.

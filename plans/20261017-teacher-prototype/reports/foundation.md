# Foundation prototype giáo viên

Ngày thực hiện: 2026-10-17.

## Kết quả

Đã đọc AGENTS.md, toàn bộ docs/spec.md, docs/architecture.md, plan.md, foundation-brief.md; tham chiếu Main, ClassList, WebClasses trong design/export.

Đã dựng Vite + React + TypeScript tại gốc, React Router, CSS Modules; không thêm UI/state library. Có scripts dev/build/typecheck/test, lockfile, .gitignore, manifest standalone và icon SVG. Vitest đã nâng lên 4.1.12 sau khi audit phát hiện lỗ hổng ở nhánh cũ; npm install cuối cùng báo 0 vulnerabilities.

- Token đúng màu yêu cầu, font hệ thống tiếng Việt, reset, focus rõ.
- Button, Card, Chip, Field/Input, Modal/Sheet dùng dialog native, EmptyState, Spinner; điều khiển tương tác cao tối thiểu 44px.
- SaveStatus bốn trạng thái, useSaveStatus; định dạng vi-VN, điểm một chữ số thập phân.
- Store trong bộ nhớ + localStorage + subscription/useStore; dữ liệu và pending lưu cùng một snapshot.
- Repository mỗi thực thể một file; sửa điểm/điểm danh ghi lịch sử trước, sau, thời gian, người sửa.
- Outbox mô phỏng local -> khoảng 800ms -> synced; offline giữ pending, online/focus tiếp tục. Lỗi lưu không thay snapshot và không xóa pending.
- Guard đăng nhập, phiên lưu local, không lưu mật khẩu; chặn logout khi pending còn.
- TeacherShell: dưới 1024px MobileLayout/tab dưới, từ 1024px DesktopLayout/sidebar 248px. Chuyển lớp giữ loại màn hiện tại; trạng thái lưu tổng và pending count.
- Đủ 10 route theo plan, page export default trong thư mục feature riêng, gọi useIsDesktop. Màn nghiệp vụ là stub; Login/Settings có thao tác tối thiểu để dùng thử foundation.
- “Đặt lại dữ liệu mẫu” tại /cai-dat, có xác nhận trước khi thay dữ liệu và xóa phiên.
- Seed 2 lớp, mỗi lớp 10 học sinh (1 đã nghỉ), 8 buổi held + 1 planned, 4 bài kiểm tra, điểm trống/vắng thi, nhận xét và báo cáo nháp/đã gửi hoặc phát hành. SĐT giả “09xx xxx xxx”.

Ngoại lệ prototype đã được plan.md xác định: desktop chỉ mức prototype, localStorage thay Dexie; auth, sync, gửi và phát hành mô phỏng. Không đổi spec/architecture, không backend/phụ huynh/SMS/OTP. Giữ nguyên các thay đổi có sẵn trong design/.

## API repositories

Import kiểu từ src/data/types.ts. ID lớp mẫu: 6a, ielts. Học sinh: 6a-student-0 … 6a-student-9 (tương tự ielts). weekdays theo Date.getDay(): Chủ nhật=0, thứ Hai=1.

Repository đồng bộ: trả giá trị hoặc throw Error tiếng Việt. Ghi nghiệp vụ thêm pending; phiên/chọn lớp là thiết lập local. UI bắt lỗi và hiển thị; không log payload.

### classes.ts

    listClasses(): Class[]
    getClass(id: string): Class | undefined
    createClass(input: Omit<Class, 'id' | 'status'>): Class
    updateClass(id: string, patch: Partial<Pick<Class, 'name' | 'weekdays' | 'time'>>): void
    archiveClass(id: string): void
    getCurrentClassId(): string | null
    setCurrentClass(id: string): void

createClass sinh buổi planned theo lịch lặp trong 28 ngày từ ngày hiện tại. archiveClass cần online. updateClass chỉ đổi metadata, chưa tái sinh lịch khi đổi lịch.

### students.ts

    listStudents(classId: string, includeLeft?: boolean): Student[]
    getStudent(id: string): Student | undefined
    createStudent(input: Omit<Student, 'id' | 'status' | 'leftAt'>): Student
    updateStudent(id: string, patch: Partial<Pick<Student, 'name'>>): void
    markStudentLeft(id: string, leftAt: string): void
    studentAverage(id: string): number | null
    studentAttendanceRate(id: string): number | null
    studentAbsenceWarning(id: string): boolean

includeLeft mặc định true. Nghỉ học giữ điểm/điểm danh, lưu ngày rời lớp. Không có API xóa. Chưa mở sửa SĐT vì luồng gỡ quyền phụ huynh ngoài prototype.

### sessions.ts

    listSessions(classId: string): Session[]
    createSession(input: Omit<Session, 'id'>): Session
    setSessionStatus(id: string, status: Session['status']): void
    cancelSession(id: string): void
    heldSessionCount(classId: string): number

listSessions tăng dần theo ngày; chỉ held tính số buổi. Chủ tính năng cần đánh dấu held khi buổi diễn ra.

### attendance.ts, tests.ts, scores.ts

    listAttendance(sessionId: string): Attendance[]
    saveAttendance(input: Omit<Attendance, 'id'>): Attendance
    listTests(classId: string): Test[]
    createTest(input: Omit<Test, 'id' | 'max'>): Test
    listScores(testId: string): Score[]
    saveScore(input: Omit<Score, 'id'>): Score

Upsert điểm danh theo sessionId+studentId, điểm theo testId+studentId. Sửa bản ghi có sẵn tạo ChangeLog cùng snapshot. Kiểm tra cùng lớp và ngày trong thời gian theo học. Điểm từ 0–10; absent=true chuẩn hóa value=null. Test luôn max=10. Ghi điểm tháng có báo cáo published bật needsRepublish.

### comments.ts, reports.ts

    listComments(classId: string): Comment[]
    saveComment(input: Omit<Comment, 'id' | 'status' | 'createdAt'>, id?: string): Comment
    sendComment(id: string): void
    listReports(classId: string): Report[]
    saveReport(input: Pick<Report, 'classId' | 'studentId' | 'month'>): Report
    publishReport(id: string): void

saveComment luôn draft; sendComment/publishReport cần online và chỉ đổi trạng thái mô phỏng. month dạng YYYY-MM; saveReport trả bản đã có nếu trùng học sinh/tháng. publishReport xóa needsRepublish.

### auth.ts, maintenance.ts

    getAuthSession(): AuthSession | null
    login(email: string, password: string): AuthSession
    logout(): void
    resetSeed(): void

Email/mật khẩu bất kỳ nhưng không rỗng. Không phải xác thực thật. resetSeed re-export từ seed qua maintenance, thay dữ liệu/pending/lịch sử/phiên; UI có xác nhận.

### Logic và format

    averageScore(scores: Pick<Score, 'value' | 'absent'>[]): number | null
    attendanceRate(records: Pick<Attendance, 'status'>[]): number | null
    consecutiveAbsences(student: Student, sessions: Session[], records: Attendance[]): number
    hasAbsenceWarning(student: Student, sessions: Session[], records: Attendance[]): boolean
    formatDate(value: string | Date): string
    formatTime(value: string | Date): string
    formatScore(value: number | null): string

Logic ở src/data/logic.ts; format ở src/shared/format/index.ts (re-export averageScore). TB không làm tròn trước hiển thị. Chuyên cần bỏ Có phép khỏi mẫu số, Muộn tính có đi; không có mẫu hợp lệ trả null. Vắng liên tiếp xét held mới nhất thuộc thời gian học, bỏ planned/cancelled; thiếu bản ghi hoặc trạng thái khác Vắng chặn chuỗi. Không cảnh báo học sinh đã nghỉ.

## useStore và SaveStatus

Ví dụ trong page:

    import { useStore } from '../../data/store';
    import { listStudents } from '../../data/repositories/students';
    import { SaveStatus, useSaveStatus } from '../../shared/SaveStatus';
    import { usePendingCount } from '../../data/outbox';

    useStore(); // subscribe, lấy dữ liệu bằng repository
    const students = listStudents(classId);
    const currentClassId = useStore(state => state.currentClassId);
    const { status, markUnsaved, clearStatus, setStatus } = useSaveStatus();
    const pending = usePendingCount();
    // Đang sửa form: markUnsaved().
    // Repository ghi thành công: clearStatus() để theo outbox.
    // Ghi throw: setStatus('error'), giữ nội dung form.
    return <><SaveStatus status={status} /><span>{pending} thay đổi chờ</span></>;

SaveStatus không truyền status tự theo trạng thái tổng. useSaveStatus trả status, setStatus(SaveState | null), markUnsaved(), clearStatus(). Override giữ đến clearStatus; không tự set synced để giả định đã đồng bộ.

useStore dùng useSyncExternalStore trên snapshot ổn định; selector có thể trả mảng mới. Không sửa trực tiếp object/mảng trả về, không gọi storage/mạng từ UI; ghi qua repository.

## Bằng chứng nghiệm thu

| Lệnh | Kết quả |
| --- | --- |
| npm install | Thành công; lượt cuối audit 100 packages, 0 vulnerabilities |
| npm run typecheck | Exit 0 |
| npm run build | Exit 0; 76 modules; main JS gzip 105.40 kB, CSS gzip 1.70 kB; route có chunk riêng |
| npm test | Exit 0; 2 files, 13/13 tests passed |
| npm run dev -- --host 127.0.0.1 | Vite ready, http://127.0.0.1:5173 |
| git diff --check | Exit 0 |

Tests: TB bỏ trống/vắng thi/giữ điểm 0; chuyên cần Có phép/Muộn; hai buổi vắng, bỏ hủy/planned, học sinh nghỉ; lịch sử sửa; report cần phát hành lại; persistence dữ liệu+pending; mock ACK; offline; chặn logout; quota giữ snapshot/pending; từ chối điểm ngoài thang và ghi chéo lớp.

Trình duyệt Paseo: resize 390×844 và 1280×900, duyệt React Router, kiểm h1/route/scrollWidth/điều hướng, xem screenshot cả hai layout.

| Route | 390px | 1280px |
| --- | --- | --- |
| /dang-nhap | Đăng nhập | Đăng nhập |
| /lop | Lớp của tôi | Lớp của tôi |
| /lop/moi | Tạo lớp mới | Tạo lớp mới |
| /lop/6a/hoc-sinh | Học sinh | Học sinh |
| /cai-dat | Cài đặt | Cài đặt |
| /lop/6a/diem-danh | Điểm danh | Điểm danh |
| /lop/6a/diem | Điểm số | Điểm số |
| /lop/6a/diem/bai-moi | Tạo bài kiểm tra | Tạo bài kiểm tra |
| /lop/6a/nhan-xet | Nhận xét | Nhận xét |
| /lop/6a/bao-cao | Báo cáo | Báo cáo |

Không tràn ngang; sidebar 248px; tab mobile cao 61px. Chưa đăng nhập mở /lop/6a/diem chuyển /dang-nhap. Điền form và bấm đăng nhập thành công. Đổi select 6a -> ielts trên màn điểm đổi URL /lop/ielts/diem.

Browser ghi điểm 8.5: ngay sau ghi local/pending=1, localStorage=8.5; sau 818ms synced/pending=0. Tải lại /cai-dat vẫn giữ điểm 8.5, lớp ielts, phiên đăng nhập. Manifest có display=standalone, icon HTTP 200. Đã bấm reset qua hộp xác nhận ở Cài đặt: trở về /dang-nhap, auth=null, điểm mẫu đầu về 6, lớp hiện tại 6a, pending=0.

Kiểm window error/unhandledrejection và console ở lượt kiểm cuối: không có lỗi. Trong lúc formatter ghi hàng loạt file, Vite có HMR reload lỗi tạm thời; sau tải lại/duyệt lại không tái hiện. Không có console log SĐT/nội dung nhận xét trong source.

## Giới hạn và điểm chưa chắc

- Foundation/stub theo brief, chưa dùng dữ liệu thật: không server ACK, auth thật, trigger D1, snapshot báo cáo/PDF. Các khác biệt này được plan/brief yêu cầu mô phỏng.
- Không service worker theo brief: chưa đảm bảo mở app từ đầu khi mất mạng; chỉ lưu thao tác trên app đang mở.
- Có manifest/icon. Tôi không thể xác minh việc cài lên iPhone hoạt động vì môi trường kiểm thử không có iPhone thật/Safari cài PWA. Chưa thử thiếu dung lượng trên thiết bị thật.
- Chưa có đồng bộ đa tab/thiết bị, migration, xung đột, retry mạng thật. localStorage chỉ dành prototype.
- Seed cố định tháng 9–10/2026 để tái lập.
- Sửa lịch lớp chưa được spec chốt chi tiết; updateClass không tự sửa/xóa buổi đã sinh, cần hỏi trước khi mở rộng nghiệp vụ.
- Chủ A/B/C thay nội dung các file feature tương ứng, giữ repository/SaveStatus/shell dùng chung. Login/Settings chỉ có thao tác tối thiểu hỗ trợ thử nền.

## Vòng sửa

Phạm vi vòng sửa sau review ngày 2026-10-17: R11 phần shell, R10 chỉ ghi nhận quyết định. Chỉ sửa src/app/TeacherShell.tsx và src/app/shell.module.css, cùng báo cáo này. Không sửa src/features, repositories/classes.ts hoặc repositories/attendance.ts. Không nhận xử lý các mục review ngoài phần đã giao.

### R11 — Đã sửa phần shell

- Header mobile bỏ dòng thương hiệu và nhãn chọn lớp chiếm một hàng riêng (vẫn giữ accessible label). Giữ bộ chọn lớp và trạng thái lưu/pending; chú thích đồng bộ mô phỏng có title, desktop vẫn hiện đầy đủ.
- Shell sở hữu lề ngang 20px trên mobile; bỏ padding ngang và margin bù ở root trang qua selector shell. Không sửa CSS tính năng. Quy tắc này cũng tránh cộng lề lần hai khi trang Điểm danh có CSS bù của phần tính năng.
- Mobile có năm tab Lớp, Điểm danh, Điểm, Nhận xét, Thêm. Thêm mở Sheet với Học sinh, Báo cáo, Cài đặt và shortcut tạo lớp/bài kiểm tra. Sheet tự đóng khi bấm link, đổi route hoặc đổi breakpoint; tab Thêm được đánh dấu khi đang ở Học sinh/Báo cáo/Cài đặt.
- Desktop đưa Học sinh, Báo cáo, Cài đặt vào sidebar cùng bốn mục chính; sidebar sticky, cao bằng viewport, cuộn nội bộ khi cần.
- Bỏ nhóm link sau toàn bộ nội dung. Không sửa vị trí nút Lưu Điểm danh hay bảng Học sinh desktop: chúng thuộc src/features và được giao cho worker khác.

Bằng chứng bằng trình duyệt Paseo, origin thử http://127.0.0.1:5174:

| Kịch bản R11 | Kết quả đo/quan sát |
| --- | --- |
| 390×844, mở /lop/6a/diem-danh | Header shell 83,5px, giảm rõ từ khoảng 180px trong review |
| Đo lề lồng ở Điểm danh | Root trang padding-inline=0px, margin-inline=0px, x=20px; card rộng 335px trên clientWidth 375px (viewport 390px có scrollbar 15px), thay vì khoảng 303px trước sửa |
| Cuộn hết danh sách, bấm Thêm | Nút vẫn ở y=792–836px trong viewport cao 844px; kích thước khoảng 73,4×44px |
| Mở Thêm | Có Học sinh, Báo cáo, Cài đặt; mỗi link 287×44px; không tràn ngang |
| Bấm Báo cáo từ Thêm | Đến /lop/6a/bao-cao, nội dung Báo cáo tải được, Sheet đóng |
| Bấm Học sinh từ Thêm | Đến /lop/6a/hoc-sinh, tiêu đề Học sinh, Sheet đóng; tab Thêm có class active |
| 1280×900, sidebar | Rộng 248px, đủ 7 mục; từng link cao 44px |
| Bấm Học sinh trong sidebar rồi cuộn trang | Đúng /lop/6a/hoc-sinh; sidebar vẫn sát đầu viewport (đo -0,5px do làm tròn), không tràn ngang |
| Console ở origin thử mới | Không có error/warning ứng dụng; window error/unhandledrejection rỗng |

Chọn kiểm chứng trình duyệt cho R11 vì đây là sửa kích thước/layout/điều hướng thực tế; không thêm test Vitest chỉ kiểm chuỗi CSS hoặc sao chép implementation.

### R10 — Không sửa, quyết định có chủ đích

Giữ nguyên useStore theo yêu cầu vòng sửa. Đây là hook subscription do foundation cung cấp cho UI, dùng useSyncExternalStore(subscribe, getStore, getStore), rồi trả selector(snapshot); bản thân hook không ghi dữ liệu. Đọc src/data/store.ts:51–55 xác nhận hợp đồng này. UI lấy dữ liệu nghiệp vụ và ghi thay đổi qua repositories; không sửa trực tiếp snapshot hoặc localStorage. Import/gọi useStore để đăng ký cập nhật là cách dùng được chấp nhận, không phải một đường ghi vòng qua repositories. Ví dụ hướng dẫn useStore trong báo cáo foundation được giữ nguyên.

Không thêm test/thay implementation cho R10 vì đây là quyết định hợp đồng được người dùng chỉ định giữ nguyên.

### Kiểm tra lại sau sửa

Lượt cuối lúc 21:45 ngày 2026-10-17:

- npm run typecheck: exit 0.
- npm run build: exit 0; 95 modules, main JS gzip 106,78 kB.
- npm test: exit 0; 7 test files, 25/25 tests passed.
- Dev server dùng cổng 5174 vì 5173 đang có tiến trình khác.
- Một lượt đầu typecheck/build gặp Draft chưa định nghĩa tại features/scores; không sửa file ngoài phạm vi. Sau cập nhật của worker phụ trách, lượt kiểm cuối đã qua.

Status bên dưới chỉ xác nhận phần được giao của vòng sửa; các giới hạn production/iPhone thật đã ghi ở trên vẫn còn.

Status: DONE

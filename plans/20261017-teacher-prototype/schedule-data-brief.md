# Worker F: lớp dữ liệu cho sửa lịch lớp, buổi lẻ, nhóm buổi

Đọc AGENTS.md, docs/spec.md (mục 3, 4, 8: đã cập nhật về buổi học/lịch), docs/architecture.md, rồi design/prototype/src/data/** (types.ts, store.ts, outbox.ts, seed.ts, repositories/classes.ts, sessions.ts, attendance.ts, helpers.ts, logic.ts, repositories.test.ts). Chỉ sửa trong design/prototype/src/data/**. KHÔNG sửa src/features, src/app, src/shared (ba worker UI sẽ làm ngay sau bạn và dùng API bạn tạo). Không git commit, không thêm thư viện, không sửa test cũ cho qua.

## Yêu cầu nghiệp vụ (người dùng đã chốt)
1. Sửa lịch lặp của lớp (ngày trong tuần + giờ): chỉ đổi các buổi CHƯA diễn ra. Giữ nguyên buổi held, cancelled, buổi lẻ (manual) và mọi buổi đã có bản ghi điểm danh. Không xoá dữ liệu có nghĩa; buổi planned tự sinh, ngày >= hôm nay, chưa có điểm danh thì mới được thay.
2. Thêm buổi lẻ ngoài lịch lặp (ví dụ học bù): ngày + giờ + ghi chú tuỳ chọn, ngày >= hôm nay, không trùng (cùng lớp, cùng ngày, cùng giờ).
3. Màn Buổi học cần nhóm: buổi hiện tại / sắp tới / đã qua.
4. Tab Lịch cần dữ liệu buổi của mọi lớp theo khoảng ngày.
Hôm nay = ngày hệ thống (new Date()); cho hàm nhận tham số `today` (YYYY-MM-DD, mặc định hôm nay) để test.

## Thay đổi dữ liệu
- types.ts: Session thêm `time: string` (HH:mm), `origin: "recurring" | "manual"`, `note?: string`.
- Dữ liệu đã lưu trong localStorage của người dùng chưa có các trường này: viết migration khi đọc store (origin mặc định "recurring", time mặc định giờ của lớp, giữ nguyên mọi dữ liệu khác), có test cho migration. seed.ts: cập nhật có đủ trường, thêm 1 buổi lẻ vào seed lớp 6a (ngày tương lai trong 14 ngày sau 2026-10-18) để có dữ liệu thử.
- createClass sinh buổi với time và origin "recurring".

## API (giữ đúng tên và chữ ký; mọi hàm throw Error tiếng Việt khi sai)
repositories/sessions.ts (hoặc file mới repositories/schedule.ts, export lại ở nơi cần):
- `createExtraSession(input: { classId: string; date: string; time: string; note?: string }, today?: string): Session` (origin "manual", status "planned"; lỗi nếu lớp đã lưu trữ, ngày < hôm nay, giờ sai định dạng, trùng).
- `previewScheduleChange(classId: string, next: { weekdays: number[]; time: string }, today?: string): { toRemove: Session[]; toAdd: { date: string; time: string }[]; kept: Session[]; retimed: Session[] }` — chỉ tính, không ghi. `retimed` = buổi planned tự sinh còn giữ nhưng đổi giờ.
- `updateClassSchedule(classId: string, next: { weekdays: number[]; time: string }, today?: string): { removed: number; added: number; retimed: number }` — ghi trong một commit: cập nhật class.weekdays/time, xoá buổi planned recurring (ngày >= today, chưa có điểm danh) không còn khớp lịch mới, thêm buổi mới cho 28 ngày kể từ today (cùng horizon với createClass) trừ ngày đã có buổi (kể cả buổi lẻ), đổi giờ cho buổi planned recurring còn khớp. Validation giống createClass (tên không đổi). Giữ nhất quán `sessionNumber`.
- `updateClass`: nếu patch có weekdays hoặc time thì gọi updateClassSchedule (không để lịch lớp lệch buổi); giữ chữ ký cũ để UI cũ không vỡ.
- `cancelSession`/`setSessionStatus` như cũ. Thêm `updateExtraSession(id, patch: { date?: string; time?: string; note?: string }, today?: string): void` chỉ cho buổi manual còn planned (đổi ngày/giờ/ghi chú, cùng validation, không trùng).
- File mới src/data/sessionGroups.ts (hàm thuần, có test):
  `splitSessions(sessions: Session[], today: string): { current: Session[]; upcoming: Session[]; past: Session[] }` — current = buổi có date === today (mọi trạng thái) HOẶC, nếu hôm nay không có buổi, đúng MỘT buổi planned gần nhất sau hôm nay; upcoming = các buổi planned còn lại sau current, tăng dần; past = held, cancelled, và planned có ngày < today (bị bỏ lỡ), giảm dần (mới nhất trước).
  `listScheduleEntries(from: string, to: string, today?: string): { session: Session; classId: string; className: string }[]` — mọi lớp active, buổi planned và held và cancelled trong [from, to] gồm hai đầu, sắp theo ngày rồi giờ (`localeCompare` trên `${date} ${time}`).
  `groupEntriesByDate(entries): { date: string; entries: typeof entries }[]` tăng dần.
  `monthGrid(year: number, month1to12: number): { date: string; inMonth: boolean }[][]` — lưới 6 hàng x 7 cột bắt đầu Thứ Hai (kiểu Việt Nam; nhãn cột T2..CN do UI), ngày YYYY-MM-DD.
- Hàm thời gian dùng ngày địa phương, không dùng toISOString (tránh lệch múi giờ UTC+7).

## Test (vitest, thêm vào bộ hiện có; không giảm test cũ)
Sửa lịch giữ buổi held/cancelled/manual/đã điểm danh; thêm/xoá đúng buổi tương lai; đổi giờ; không trùng buổi lẻ; ngày quá khứ bị từ chối; migration cũ -> mới; splitSessions (có buổi hôm nay / không có / planned bị bỏ lỡ); listScheduleEntries; monthGrid (tháng 10/2026 bắt đầu thứ Năm; tháng bắt đầu Chủ nhật).

## Kiểm
`npm run typecheck && npm run build && npm test` sạch từ design/prototype. Ghi plans/20261017-teacher-prototype/reports/schedule-data.md: API cuối (chữ ký thật), quyết định đáng chú ý, giới hạn; kết thúc bằng Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT.

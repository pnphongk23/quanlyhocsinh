# Báo cáo lớp dữ liệu lịch

## API đã triển khai

- `createExtraSession(input: { classId: string; date: string; time: string; note?: string }, today?: string): Session`
- `previewScheduleChange(classId: string, next: { weekdays: number[]; time: string }, today?: string): { toRemove: Session[]; toAdd: { date: string; time: string }[]; kept: Session[]; retimed: Session[] }`
- `updateClassSchedule(classId: string, next: { weekdays: number[]; time: string }, today?: string): { removed: number; added: number; retimed: number }`
- `updateClass(id, patch)` giữ chữ ký hiện có; thay đổi `weekdays` hoặc `time` được đồng bộ với buổi học trong một commit.
- `updateExtraSession(id: string, patch: { date?: string; time?: string; note?: string }, today?: string): void`
- `splitSessions(sessions: Session[], today: string): { current: Session[]; upcoming: Session[]; past: Session[] }`
- `listScheduleEntries(from: string, to: string, today?: string): { session: Session; classId: string; className: string }[]`
- `groupEntriesByDate(entries): { date: string; entries: typeof entries }[]`
- `monthGrid(year: number, month1to12: number): { date: string; inMonth: boolean }[][]`

## Quyết định và giới hạn

- Lịch chỉ xóa buổi recurring ở trạng thái planned, từ hôm nay trở đi và chưa có điểm danh. Buổi held, cancelled, manual hoặc đã có điểm danh được giữ.
- Khi đổi lịch, buổi planned recurring còn hợp thứ được đổi giờ. Buổi mới sinh trong 28 ngày từ `today`; ngày đã có bất kỳ buổi nào đều được bỏ qua.
- Ngày dùng giờ địa phương và không chuyển qua `toISOString`. Seed có buổi lẻ ngày 25/10/2026 cho lớp 6A.
- Migration khi đọc store bổ sung `origin: "recurring"` và lấy `time` từ lịch của lớp cho dữ liệu cũ, giữ các trường khác.
- `Session.time` và `Session.origin` để optional trong khai báo TypeScript để các fixture và consumer UI prototype hiện có còn typecheck trong giới hạn chỉ sửa `src/data/**`. Seed và store sau migration đều có giá trị đầy đủ; consumer mới nên coi hai trường là bắt buộc ở dữ liệu đã nạp.
- `updateClassScheduleWithName` là helper dùng để giữ một commit khi `updateClass` nhận đồng thời tên và lịch.

## Kiểm chứng

- `npm run typecheck` — đạt.
- `npm run build` — đạt.
- `npm test` — 10 file, 40 test đạt.

Status: DONE_WITH_CONCERNS

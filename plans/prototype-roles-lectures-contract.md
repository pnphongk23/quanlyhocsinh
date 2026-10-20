# Hợp đồng chung: prototype bài giảng, nhân sự, role

Phạm vi: `design/prototype/src` (React + Vite + CSS modules, dữ liệu mô phỏng bằng localStorage). Nguồn nghiệp vụ: `docs/spec.md` mục 4 (Bài giảng, Phân quyền và role, Tài khoản), mục 5.1. Thiết kế tham chiếu: Claude Design (không truy cập được từ đây), nên theo spec và style hiện có của prototype.

Kiểu dữ liệu đã có sẵn trong `src/data/types.ts` (Role, Member, Lecture, LectureSection, LectureFile, SessionLecture, PermissionGroup, PermissionLevel, StoreState mới: roles, members, activeMemberId, lectures, sessionLectures; AuthSession.memberIds). `shared/ui` có thêm `Fab` và `NoAccess`.

## API tầng dữ liệu (worker "data" cài, các worker UI gọi đúng chữ ký này)

`src/data/repositories/access.ts`
```ts
export const PERMISSION_GROUPS: { id: PermissionGroup; label: string }[]; // 6 nhóm, nhãn tiếng Việt: Lớp, Học sinh, Buổi học và điểm danh, Điểm, Bài giảng, Nhận xét và báo cáo
export const GUARDIAN_GROUPS: PermissionGroup[]; // sessions_attendance, scores, comments_reports, lectures
export function getActiveMember(): Member | null;
export function getActiveRole(): Role | null;
export function listMyMemberships(): Array<{ member: Member; role: Role }>;
export function switchRole(memberId: string): void; // memberId phải thuộc auth.memberIds
export function isAdmin(): boolean;
export function can(group: PermissionGroup, level: "read" | "write"): boolean; // write bao gồm read; Admin luôn true
export function useAccess(): { member: Member | null; role: Role | null; isAdmin: boolean; can: (g: PermissionGroup, l: "read" | "write") => boolean; multipleRoles: boolean };
export function requirePermission(group: PermissionGroup, level: "read" | "write"): void; // throw Error("Bạn không có quyền thực hiện thao tác này.")
```

`src/data/repositories/lectures.ts`
```ts
export type LectureFilter = "mine" | "all" | "archived";
export function listLectures(filter?: LectureFilter): Lecture[]; // "mine" = createdBy là member đang dùng; "all" = chưa lưu trữ mà người dùng thấy được (người tạo, Admin, hoặc có buổi trong lớp được gán); "archived" = đã lưu trữ
export function getLecture(id: string): Lecture | undefined; // trả undefined nếu không thấy được
export function createLecture(input: { title: string; sections: Array<Omit<LectureSection, "id" | "files"> & { files: Array<Omit<LectureFile, "id">> }> }): Lecture; // yêu cầu quyền lectures:write; có tệp thì requireOnline()
export function updateLecture(id: string, input: same as createLecture): Lecture; // buổi đang dùng đổi theo
export function archiveLecture(id: string): void;
export function restoreLecture(id: string): void;
export function listSessionLectures(sessionId: string): Lecture[]; // theo position
export function attachLecture(sessionId: string, lectureId: string): void;
export function detachLecture(sessionId: string, lectureId: string): void;
export function listLectureSessions(lectureId: string): Array<{ session: Session; className: string }>;
export function lectureUsageCount(lectureId: string): number;
```

`src/data/repositories/staff.ts` (mọi hàm ghi yêu cầu isAdmin(), ngược lại throw)
```ts
export function listMembers(): Member[];
export function getMember(id: string): Member | undefined;
export function inviteMember(input: { name: string; phone: string; roleId: string; classIds: string[] }): Member; // status "invited", invitedAt = now; requireOnline
export function resendInvite(memberId: string): void; // cập nhật invitedAt
export function cancelInvite(memberId: string): void; // xoá thành viên đang ở trạng thái invited
export function setMemberClasses(memberId: string, classIds: string[]): void;
export function setMemberRole(memberId: string, roleId: string): void;
export function setMemberDisabled(memberId: string, disabled: boolean): void; // không xoá dữ liệu; không cho vô hiệu hoá Admin cuối cùng
export function listRoles(): Role[];
export function getRole(id: string): Role | undefined;
export function createRole(input: { name: string; kind: RoleKind; permissions: Partial<Record<PermissionGroup, PermissionLevel>> }): Role; // guardian: chỉ GUARDIAN_GROUPS, mức tối đa read, các nhóm khác ép "none"
export function updateRole(id: string, input: { name?: string; permissions?: Partial<Record<PermissionGroup, PermissionLevel>> }): Role; // role system (Admin) không sửa được; kind không đổi
export function roleMemberCount(roleId: string): number;
export function roleDisplayKind(kind: RoleKind): string; // "Nhân sự" | "Phụ huynh"
```

Dữ liệu mẫu (seed): role Admin (system), Giáo viên, Trợ giảng, Phụ huynh; vài thành viên (Cô Lan: có hai membership Admin và Giáo viên để thấy màn chọn vai trò; Thầy Quang Minh: Giáo viên, 2 lớp; Cô Thu Trang: Trợ giảng, 1 lớp; một người "invited"); 2-3 bài giảng mẫu ("Unit 3: Present Perfect" 4 phần, "Từ vựng chủ đề Travel" 3 phần) gắn vào vài buổi; `auth` đăng nhập mẫu trả `memberIds`.
`listClasses()` chỉ trả lớp mà thành viên đang dùng nhìn thấy (Admin thấy tất cả; vai trò khác chỉ lớp trong `classIds`).
Các hàm ghi hiện có (lớp, học sinh, buổi, điểm danh, điểm, nhận xét, báo cáo) gọi `requirePermission(nhóm tương ứng, "write")`.

## Đường dẫn route (worker "shell" đăng ký trong router, các worker UI export default đúng file)
- `/chon-vai-tro` → `features/auth/RolePickerPage.tsx` (shell)
- `/bai-giang` → `features/lectures/LibraryPage.tsx`
- `/bai-giang/moi` → `features/lectures/LectureEditorPage.tsx` (tạo mới)
- `/bai-giang/:lectureId` → `features/lectures/LectureDetailPage.tsx`
- `/bai-giang/:lectureId/sua` → `features/lectures/LectureEditorPage.tsx` (sửa)
- `/nhan-su` → `features/staff/MembersPage.tsx`
- `/nhan-su/moi` → `features/staff/InvitePage.tsx`
- `/nhan-su/:memberId` → `features/staff/MemberDetailPage.tsx`
- `/vai-tro` → `features/staff/RolesPage.tsx`
- `/vai-tro/moi` và `/vai-tro/:roleId` → `features/staff/RoleEditorPage.tsx`
Các màn trên là màn con (nút quay lại, không tab bar mới). FAB cách đáy 24px ở màn không có tab bar.

## Quy tắc UI chung
- Dùng đúng `shared/ui` và token CSS sẵn có (xem `src/styles/tokens.css`). Không thêm màu, font, thư viện mới.
- Tiếng Việt, vùng chạm >= 44px, một tay trên iPhone 390px. Không có chip trạng thái đồng bộ (SaveStatus tự ẩn khi không lỗi).
- Nút thêm mới đầu trang dùng `Fab`.
- Quyền: ẩn hoặc khoá nút ghi theo `useAccess().can(...)`; màn không có quyền đọc hiện `NoAccess`. Quản trị (nhân sự, role) chỉ Admin, người khác thấy `NoAccess`.

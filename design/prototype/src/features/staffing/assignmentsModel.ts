import type {
  Class,
  ClassStaff,
  Member,
  Role,
  StaffPosition,
  Student,
} from "../../data/types";

/** Thứ tự hiển thị trong tuần: Thứ Hai → Chủ nhật. */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Lịch lớp gọn cho thẻ/bảng: "T2 · T4, 18:00". */
export function classScheduleLabel(
  klass: Pick<Class, "weekdays" | "time">,
): string {
  const days = [...klass.weekdays]
    .sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b))
    .map((day) => WEEKDAY_SHORT[day])
    .filter(Boolean);
  return days.length ? `${days.join(" · ")}, ${klass.time}` : klass.time;
}

/** Chỉ đếm học sinh đang học, bỏ em đã nghỉ/chuyển lớp. */
export function activeStudentCount(
  students: Student[],
  classId: string,
): number {
  return students.filter(
    (student) => student.classId === classId && student.status === "active",
  ).length;
}

export interface ClassAssignment {
  klass: Class;
  schedule: string;
  studentCount: number;
  mainId: string | null;
  mainName: string | null;
  assistantIds: string[];
  assistantNames: string[];
  /** Lớp chưa có giáo viên chính: thẻ hiện nhãn cảnh báo và nút "Chọn". */
  needsMain: boolean;
}

/** Gộp lớp + phân công thành dữ liệu hiển thị cho thẻ (mobile) và bảng (desktop). */
export function classAssignments(input: {
  classes: Class[];
  classStaff: ClassStaff[];
  students: Student[];
  members: Member[];
}): ClassAssignment[] {
  const nameById = new Map(
    input.members.map((member) => [member.id, member.name] as const),
  );
  return input.classes.map((klass) => {
    const rows = input.classStaff.filter((item) => item.classId === klass.id);
    const main = rows.find((item) => item.position === "main") ?? null;
    const assistants = rows.filter((item) => item.position === "assistant");
    return {
      klass,
      schedule: classScheduleLabel(klass),
      studentCount: activeStudentCount(input.students, klass.id),
      mainId: main?.memberId ?? null,
      mainName: main ? (nameById.get(main.memberId) ?? "Không rõ") : null,
      assistantIds: assistants.map((item) => item.memberId),
      assistantNames: assistants.map(
        (item) => nameById.get(item.memberId) ?? "Không rõ",
      ),
      needsMain: main === null,
    };
  });
}

/** Chỉ nhân sự (role.kind "staff") đang hoạt động mới được phân công. */
export function activeStaff(members: Member[], roles: Role[]): Member[] {
  const kindById = new Map(roles.map((role) => [role.id, role.kind] as const));
  return members
    .filter(
      (member) =>
        member.status === "active" &&
        kindById.get(member.roleId) === "staff",
    )
    .sort(
      (a, b) => a.name.localeCompare(b.name, "vi") || a.id.localeCompare(b.id),
    );
}

/** Tên role hiện dưới tên nhân sự trong modal (Admin, Giáo viên, Trợ giảng). */
export function roleNameOf(roleId: string, roles: Role[]): string {
  return roles.find((role) => role.id === roleId)?.name ?? "Nhân sự";
}

export interface AssignmentSelection {
  mainId: string | null;
  assistantIds: string[];
}

/**
 * Tính thay đổi cần ghi từ lựa chọn trong modal so với phân công hiện tại.
 * Thuần khiết: modal chỉ gọi hàm này lúc bấm "Lưu phân công".
 * Thứ tự thực hiện: gỡ trợ giảng trước, rồi đặt/gỡ chính, rồi thêm trợ giảng.
 */
export function planAssignmentChanges(
  current: AssignmentSelection,
  next: AssignmentSelection,
): {
  assign: Array<{ memberId: string; position: StaffPosition }>;
  remove: string[];
} {
  const remove: string[] = [];
  const assign: Array<{ memberId: string; position: StaffPosition }> = [];

  for (const memberId of current.assistantIds)
    if (!next.assistantIds.includes(memberId)) remove.push(memberId);

  if (next.mainId && next.mainId !== current.mainId)
    assign.push({ memberId: next.mainId, position: "main" });
  else if (!next.mainId && current.mainId) remove.push(current.mainId);

  for (const memberId of next.assistantIds)
    if (
      !current.assistantIds.includes(memberId) &&
      memberId !== next.mainId
    )
      assign.push({ memberId, position: "assistant" });

  return { assign, remove };
}

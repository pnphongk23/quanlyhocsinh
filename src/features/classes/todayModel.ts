import type { Session, StoreState } from "../../data/types";
import { previousHomeworkSession } from "../../data/homework";

export interface TodayTask {
  session: Session;
  tab: "diem-danh" | "nhan-xet" | "btvn";
  label: string;
  count: number;
}

export function buildTodayAgenda(state: StoreState, today: string) {
  const activeClasses = new Set(state.classes.filter((item) => item.status === "active").map((item) => item.id));
  const sessions = state.sessions
    .filter((item) => activeClasses.has(item.classId) && item.status !== "cancelled")
    .sort((a, b) => `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`));
  const todaySessions = sessions.filter((item) => item.date === today);
  const nextSession = sessions.find((item) => item.date > today) ?? null;
  const since = new Date(`${today}T12:00:00`);
  since.setDate(since.getDate() - 14);
  const from = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;
  const recent = sessions.filter((item) => item.date >= from && item.date <= today);
  const tasks: TodayTask[] = [];

  for (const session of recent) {
    const students = state.students.filter((student) =>
      student.classId === session.classId && student.enrolledAt <= session.date && (!student.leftAt || session.date <= student.leftAt),
    );
    if (session.status === "planned") {
      tasks.push({ session, tab: "diem-danh", label: "Điểm danh chưa xong", count: 1 });
    }
    const unsent = students.filter((student) => !state.comments.some((comment) =>
      comment.sessionId === session.id && comment.studentId === student.id && comment.status === "sent",
    )).length;
    if (unsent) tasks.push({ session, tab: "nhan-xet", label: `Phiếu chưa gửi (${unsent} em)`, count: unsent });

    const giving = previousHomeworkSession(state.sessions, session.id);
    const sections = giving ? state.homeworkSections.filter((item) => item.sessionId === giving.id) : [];
    let ungraded = 0;
    for (const section of sections) {
      for (const student of students) {
        if (!state.homeworkGrades.some((grade) => grade.sectionId === section.id && grade.studentId === student.id)) ungraded++;
      }
    }
    if (ungraded) tasks.push({ session, tab: "btvn", label: `BTVN chưa chấm (${ungraded} em/phần)`, count: ungraded });
  }

  return { todaySessions, nextSession, tasks: tasks.slice(0, 5), remaining: Math.max(0, tasks.length - 5) };
}

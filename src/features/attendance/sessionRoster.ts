import type { Session, Student } from "../../data/types";

export function studentsForSession(students: Student[], session: Session): Student[] {
  return students.filter(
    (student) =>
      student.enrolledAt <= session.date &&
      (student.leftAt === null || student.leftAt >= session.date),
  );
}

import { describe, it, expect } from "vitest";
import { createSeed } from "./seed";
import { MEMBER_IDS } from "./defaults";
import { sessionStaff, teachingEntries } from "./teaching";

const lan = MEMBER_IDS.lanTeacher;
const minh = MEMBER_IDS.minh;
const trang = MEMBER_IDS.trang;

describe("Người dạy hiệu lực của buổi", () => {
  it("buổi thường giữ nguyên phân công của lớp", () => {
    const d = createSeed();
    expect(sessionStaff(d, "6a-session-4")).toEqual([
      { position: "main", memberId: lan },
    ]);
    expect(sessionStaff(d, "ielts-session-0")).toEqual([
      { position: "main", memberId: minh },
      { position: "assistant", memberId: trang },
    ]);
  });
  it("thay đúng vị trí của người bị thay", () => {
    const d = createSeed();
    expect(sessionStaff(d, "6a-session-6")).toEqual([
      { position: "main", memberId: minh },
    ]);
  });
  it("buổi học bù: người thay dạy cả vị trí đó của buổi", () => {
    const d = createSeed();
    // Buổi học bù 25/10 chưa gán ai nên Thầy Minh dạy thay toàn bộ vị trí
    // giáo viên chính, Cô Lan (giáo viên chính của lớp) không dạy buổi đó.
    expect(sessionStaff(d, "6a-extra-session")).toEqual([
      { position: "main", memberId: minh },
    ]);
  });
  it("buổi đã huỷ không đổi người", () => {
    const d = createSeed();
    d.sessions.find((s) => s.id === "6a-session-6")!.status = "cancelled";
    expect(sessionStaff(d, "6a-session-6")).toEqual([
      { position: "main", memberId: lan },
    ]);
  });
  it("buổi không tồn tại trả danh sách rỗng", () => {
    expect(sessionStaff(createSeed(), "khong-co")).toEqual([]);
  });
});

describe("Buổi dạy của một người", () => {
  it("Cô Lan tháng 10: 3 buổi dạy, 1 buổi bị thay, 1 buổi hủy, 1 buổi dự kiến", () => {
    const d = createSeed();
    const entries = teachingEntries(d, lan, "2026-10-01", "2026-10-31");
    expect(
      entries.map((entry) => [entry.session.id, entry.kind, entry.counted]),
    ).toEqual([
      ["6a-session-4", "own", true],
      ["6a-session-5", "own", true],
      ["6a-session-6", "replaced", false],
      ["6a-session-7", "own", true],
      ["6a-extra-cancelled", "own", false],
      ["6a-session-8", "own", false],
    ]);
    const replaced = entries.find((entry) => entry.kind === "replaced")!;
    expect(replaced.position).toBe("main");
    expect(replaced.otherMemberId).toBe(minh);
  });
  it("chỉ lấy buổi trong khoảng ngày, kể cả hai đầu", () => {
    const d = createSeed();
    expect(
      teachingEntries(d, lan, "2026-10-05", "2026-10-05").map(
        (entry) => entry.session.id,
      ),
    ).toEqual(["6a-session-4"]);
    expect(teachingEntries(d, lan, "2026-10-01", "2026-09-30")).toEqual([]);
  });
  it("Thầy Minh tháng 10: dạy thay 12/10, dạy bù 25/10 và các buổi IELTS", () => {
    const d = createSeed();
    const entries = teachingEntries(d, minh, "2026-10-01", "2026-10-31");
    expect(
      entries.map((entry) => [entry.session.id, entry.kind, entry.counted]),
    ).toEqual([
      ["ielts-session-3", "own", true],
      ["ielts-session-4", "own", true],
      ["ielts-session-5", "own", true],
      ["6a-session-6", "substitute", true],
      ["ielts-session-6", "own", true],
      ["ielts-session-7", "own", true],
      ["ielts-session-8", "own", false],
      ["6a-extra-session", "substitute", false],
    ]);
    const substitute = entries.find(
      (entry) => entry.session.id === "6a-session-6",
    )!;
    expect(substitute.position).toBe("main");
    expect(substitute.otherMemberId).toBe(lan);
    const makeUp = entries.find(
      (entry) => entry.session.id === "6a-extra-session",
    )!;
    expect(makeUp.otherMemberId).toBeNull();
  });
  it("buổi đã huỷ: người bị thay trở lại là own, người thay không có buổi", () => {
    const d = createSeed();
    d.sessions.find((s) => s.id === "6a-session-6")!.status = "cancelled";
    const replaced = teachingEntries(d, lan, "2026-10-12", "2026-10-12");
    expect(replaced).toHaveLength(1);
    expect(replaced[0].kind).toBe("own");
    expect(replaced[0].counted).toBe(false);
    expect(teachingEntries(d, minh, "2026-10-12", "2026-10-12")).toEqual([]);
  });
  it("Cô Trang chỉ có buổi IELTS ở vị trí trợ giảng", () => {
    const d = createSeed();
    const entries = teachingEntries(d, trang, "2026-09-01", "2026-10-31");
    expect(entries).toHaveLength(9);
    expect(
      entries.every(
        (entry) =>
          entry.classId === "ielts" &&
          entry.position === "assistant" &&
          entry.kind === "own",
      ),
    ).toBe(true);
    expect(entries.filter((entry) => entry.counted)).toHaveLength(8);
  });
  it("sắp theo ngày rồi giờ trong cùng ngày", () => {
    const d = createSeed();
    d.sessions.push({
      id: "6a-session-4-extra",
      classId: "6a",
      date: "2026-10-05",
      time: "16:00",
      status: "held",
    });
    const ids = teachingEntries(d, lan, "2026-10-05", "2026-10-05").map(
      (entry) => entry.session.id,
    );
    expect(ids).toEqual(["6a-session-4-extra", "6a-session-4"]);
  });
});

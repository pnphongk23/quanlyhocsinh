import { describe, expect, it } from "vitest";
import type { HomeworkSummary, TicketRow } from "../../data/homework";
import type { Student } from "../../data/types";
import {
  filterTicketRows,
  homeworkLine,
  initialsOf,
  sendButtonLabel,
  sendButtonDisabled,
  sendableCount,
  ticketBadge,
  ticketCounts,
  ticketFilterLabel,
} from "./commentsModel";

function student(name: string): Student {
  return {
    id: name,
    classId: "6a",
    name,
    parentPhone: "",
    enrolledAt: "2026-09-01",
    leftAt: null,
    status: "active",
  };
}

function row(
  name: string,
    options: Partial<Pick<TicketRow, "stars" | "status" | "sentAt" | "attended">> = {},
  previous: Partial<HomeworkSummary> = {},
): TicketRow {
  const who = student(name);
  return {
    student: who,
      comment: options.status === "sent" || options.status === "draft" || options.status === "queued" ? ({ id: name, classId: "6a", studentId: name, sessionId: "session", criteria: 31, comment: null, scale: 5, stars: options.stars ?? 5, note: "", status: options.status === "sent" ? "sent" : "draft", sendQueued: options.status === "queued", sentAt: options.sentAt ?? null, updatedAt: "", createdAt: "" }) : null,
      stars: options.stars ?? null,
      attended: options.attended ?? false,
    status: options.status ?? (options.stars ? "draft" : "none"),
    sentAt: options.sentAt ?? null,
    previousHomework: {
      state: "has",
      session: null,
      totalSections: 2,
      gradedSections: 2,
      ungradedSections: 0,
      ...previous,
    },
  };
}

  describe("bộ lọc danh sách phiếu", () => {
  const rows = [
    row("A", { stars: 3, status: "sent", sentAt: "2026-10-14T13:14:00.000Z" }),
    row("B", { stars: 2, status: "draft" }),
    row("C", { stars: 2, status: "queued" }),
      row("D", { attended: true }),
      row("E"),
  ];

    it("đếm Tất cả / Chưa gửi và gắn số vào nhãn", () => {
      const counts = ticketCounts(rows);
      expect(counts).toEqual({ all: 5, unsent: 4 });
      expect(ticketFilterLabel("all", counts)).toBe("Tất cả (5)");
      expect(ticketFilterLabel("unsent", counts)).toBe("Chưa gửi (4)");
    });

  it("lọc Chưa gửi bỏ phiếu đã gửi nhưng giữ phiếu chờ mạng", () => {
    expect(
      filterTicketRows(rows, "unsent").map((item) => item.student.id),
    ).toEqual(["B", "C", "D", "E"]);
    expect(filterTicketRows(rows, "all")).toHaveLength(5);
  });

  it("chỉ phiếu đã chọn sao và chưa gửi mới nằm trong nút gửi cả lớp", () => {
      expect(sendableCount(rows)).toBe(3);
    expect(sendableCount([row("A"), row("B")])).toBe(0);
  });

  it("giữ nhãn nút và khoá gửi khi mất mạng", () => {
    expect(sendButtonLabel(5, false)).toBe("Gửi phiếu cả lớp (5)");
    expect(sendButtonLabel(5, true)).toBe("Gửi phiếu cả lớp (5)");
    expect(sendButtonLabel(0, true)).toBe("Gửi phiếu cả lớp (0)");
    expect(sendButtonDisabled(5, false)).toBe(false);
    expect(sendButtonDisabled(5, true)).toBe(true);
    expect(sendButtonDisabled(0, false)).toBe(true);
  });
});

describe("nhãn trạng thái phiếu", () => {
  it("đã gửi kèm giờ gửi, chờ mạng và chưa gửi", () => {
    const sent = ticketBadge(
      row("A", { stars: 3, status: "sent", sentAt: "2026-10-14T13:14:00.000Z" }),
    );
    expect(sent.label.startsWith("Đã gửi · ")).toBe(true);
    expect(sent.tone).toBe("success");
    expect(ticketBadge(row("B", { stars: 2, status: "queued" }))).toEqual({
      label: "Chờ mạng",
      tone: "warning",
    });
    expect(ticketBadge(row("C"))).toEqual({
      label: "Chưa gửi",
      tone: "neutral",
    });
    expect(ticketBadge(row("D", { stars: 2, status: "draft" }))).toEqual({
      label: "Chưa gửi",
      tone: "neutral",
    });
  });

  it("avatar lấy hai chữ đầu của hai từ cuối", () => {
    expect(initialsOf("Nguyễn Minh Anh")).toBe("MA");
    expect(initialsOf("Trần Gia Bảo")).toBe("GB");
    expect(initialsOf("Đỗ Hải Nam")).toBe("HN");
    expect(initialsOf("  Lê   Khánh Chi ")).toBe("KC");
  });
});

describe("dòng tóm tắt BTVN buổi trước (ảnh 40, 45, 46)", () => {
  it("đã chấm đủ", () => {
    const line = homeworkLine(row("A").previousHomework);
      expect(line).toEqual({ text: "BTVN buổi trước: 2/2 phần đã chấm", tone: "muted" });
  });

  it("còn phần Chưa chấm thì đếm số phần và tô màu cảnh báo", () => {
    const line = homeworkLine(
      row("A", {}, { gradedSections: 1, ungradedSections: 1 })
        .previousHomework,
    );
    expect(line).toEqual({
      text: "BTVN buổi trước: 1 phần Chưa chấm",
      tone: "warning",
    });
  });

  it("buổi đầu và buổi trước không giao BTVN", () => {
    expect(
      homeworkLine(
        row("A", {}, { state: "first", totalSections: 0, gradedSections: 0 })
          .previousHomework,
      ),
      ).toEqual({ text: "Bài tập buổi trước chưa có", tone: "muted" });
    expect(
      homeworkLine(
        row("A", {}, { state: "none-given", totalSections: 0, gradedSections: 0 })
          .previousHomework,
      ),
    ).toEqual({ text: "Buổi trước không giao BTVN", tone: "muted" });
  });
});

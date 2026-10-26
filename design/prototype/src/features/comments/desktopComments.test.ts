import { describe, expect, it } from "vitest";
import { createSeed } from "../../data/seed";
import { replaceStore } from "../../data/store";
import { buildTicketRows } from "../../data/homework";
import { homeworkCountsLine } from "./CommentsDesktop";
import { attendanceLabel, desktopTicketLabel } from "./TicketEditor";
import { stepMonthChoice } from "../reports/reviewStatus";
import { latestTestLabel, latestTestScore, trimNumber } from "../reports/latestTest";
import { createSeed as seed } from "../../data/seed";

describe("Danh sách nhận xét trên web (ảnh 04)", () => {
  it("dòng tóm tắt BTVN buổi trước đếm theo mức chấm", () => {
    const state = createSeed();
    const rows = buildTicketRows(state, "6a-session-7");
    const byName = (name: string) =>
      rows.find((row) => row.student.name.includes(name))!;
    expect(homeworkCountsLine(state, byName("Trần Gia Bảo"))).toBe(
      "BTVN buổi trước: 1 tốt · 1 xong",
    );
    expect(homeworkCountsLine(state, byName("Phạm Đức Dũng"))).toBe(
      "BTVN buổi trước: 1 tốt",
    );
    expect(homeworkCountsLine(state, byName("Nguyễn Minh Anh"))).toBe(
      "BTVN buổi trước: chưa chấm",
    );
  });

  it("buổi đầu và buổi trước không giao BTVN có câu riêng", () => {
    const state = createSeed();
    const first = buildTicketRows(state, "6a-session-0")[0];
    expect(homeworkCountsLine(state, first)).toBe(
      "Buổi đầu · chưa có BTVN buổi trước",
    );
    const noneGiven = buildTicketRows(state, "6a-session-1")[0];
    expect(homeworkCountsLine(state, noneGiven)).toBe(
      "Buổi trước không giao BTVN",
    );
  });

  it("trạng thái phiếu: Đã gửi / Nháp / Chưa chọn sao", () => {
    const state = createSeed();
    const rows = buildTicketRows(state, "6a-session-7");
    const byName = (name: string) =>
      rows.find((row) => row.student.name.includes(name))!;
    expect(desktopTicketLabel(byName("Trần Gia Bảo"))).toBe("Đã gửi");
    expect(desktopTicketLabel(byName("Lê Khánh Chi"))).toBe("Nháp");
    expect(desktopTicketLabel(byName("Bùi Tuấn Kiệt"))).toBe("Chưa chọn sao");
  });

  it("dòng điểm danh cạnh tên em đúng chữ ảnh 04", () => {
    expect(
      attendanceLabel({
        id: "a",
        sessionId: "s",
        studentId: "st",
        status: "late",
        note: "",
        lateAt: "18:10",
      }),
    ).toBe("Có mặt · Muộn 18:10");
    expect(attendanceLabel(undefined)).toBe("Chưa điểm danh");
    expect(
      attendanceLabel({
        id: "a",
        sessionId: "s",
        studentId: "st",
        status: "absent",
        note: "",
        lateAt: null,
      }),
    ).toBe("Vắng");
  });
});

describe("Báo cáo chỉ chọn một tháng (ảnh 15)", () => {
  it("bước sang tháng liền trước / liền sau trong danh sách có dữ liệu", () => {
    const choices = ["2026-10", "2026-09", "2026-08"];
    expect(stepMonthChoice(choices, "2026-10", 1)).toBe("2026-09");
    expect(stepMonthChoice(choices, "2026-09", -1)).toBe("2026-10");
  });

  it("ở đầu/cuối danh sách thì giữ nguyên tháng đang chọn", () => {
    const choices = ["2026-10", "2026-09"];
    expect(stepMonthChoice(choices, "2026-10", -1)).toBe("2026-10");
    expect(stepMonthChoice(choices, "2026-09", 1)).toBe("2026-09");
    expect(stepMonthChoice(choices, "2026-07", 1)).toBe("2026-07");
  });
});

describe("Kiểm tra gần nhất ở thẻ báo cáo (R1-06)", () => {
  it("lấy bài có ngày muộn nhất mà em đã có điểm, kèm /điểm tối đa", () => {
    replaceStore(seed());
    const tests = [
      { id: "t1", classId: "6a", name: "Từ vựng", date: "2026-10-01", max: 15 },
      { id: "t2", classId: "6a", name: "Nói", date: "2026-10-10", max: 20 },
    ];
    const scores = [
      { id: "s1", testId: "t1", studentId: "st", value: 12 },
      { id: "s2", testId: "t2", studentId: "st", value: 14 },
    ];
    const latest = latestTestScore(tests, scores, "st");
    expect(latest).toMatchObject({ name: "Nói", value: 14, max: 20 });
    expect(latestTestLabel(latest)).toBe("Nói · 14/20");
  });

  it("bài chưa có điểm và bài lưu trữ không được chọn", () => {
    const tests = [
      { id: "t1", classId: "6a", name: "Cũ", date: "2026-10-01", max: 15 },
      { id: "t2", classId: "6a", name: "Lưu trữ", date: "2026-10-10", max: 20, archived: true },
    ];
    const scores = [
      { id: "s1", testId: "t1", studentId: "st", value: 9 },
      { id: "s2", testId: "t2", studentId: "st", value: 18 },
    ];
    expect(latestTestScore(tests, scores, "st")?.name).toBe("Cũ");
    expect(latestTestScore(tests, scores, "khac")).toBeNull();
    expect(latestTestLabel(null)).toBe("Chưa có điểm");
  });

  it("số điểm gọn: 14 và 7,5", () => {
    expect(trimNumber(14)).toBe("14");
    expect(trimNumber(7.5)).toBe("7,5");
  });
});

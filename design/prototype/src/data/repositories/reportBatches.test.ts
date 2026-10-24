import { beforeEach, describe, expect, it } from "vitest";
import { createSeed } from "../seed";
import { getStore, replaceStore, updateStore } from "../store";
import { defaultRange, resolveRange, sessionChoices } from "../reportRange";
import {
  createReportBatch,
  listReportBatches,
  saveReport,
} from "./reports";
import { cancelSession } from "./sessions";
import { batchCounts, buildBatchRows, readClassReportSource } from "../../features/reports/batchRows";

beforeEach(() => {
  replaceStore(createSeed());
});

const rowsOf = (batchId: string) => {
  const batch = getStore().reportBatches.find((item) => item.id === batchId)!;
  return buildBatchRows(batch, readClassReportSource("6a"))!;
};

describe("khoảng mặc định của đợt báo cáo", () => {
  it("từ Buổi 1 đến buổi đã diễn ra gần nhất", () => {
    const range = defaultRange(getStore().sessions, "6a")!;
    const resolved = resolveRange(getStore().sessions, {
      classId: "6a",
      ...range,
    })!;
    expect(resolved.fromNumber).toBe(1);
    expect(resolved.toNumber).toBe(8);
    expect(resolved.label).toBe("Buổi 1–8 · 21/09–14/10");
  });

  it("lớp chưa có buổi nào đã diễn ra thì không có khoảng mặc định", () => {
    updateStore((draft) => {
      draft.sessions.forEach((session) => {
        if (session.classId === "6a") session.status = "planned";
      });
    });
    expect(defaultRange(getStore().sessions, "6a")).toBeNull();
  });

  it("buổi hủy không nằm trong lựa chọn và không có số", () => {
    const labels = sessionChoices(getStore().sessions, "6a").map((c) => c.label);
    expect(labels).not.toContain(expect.stringContaining("16/10"));
    expect(labels[0]).toBe("Buổi 1 · 21/09");
  });
});

describe("tạo đợt báo cáo cho cả lớp", () => {
  it("mỗi học sinh có học trong khoảng nhận một bản nháp", () => {
    const range = defaultRange(getStore().sessions, "6a")!;
    const batch = createReportBatch({ classId: "6a", ...range });
    const drafts = getStore().reports.filter((r) => r.batchId === batch.id);
    expect(drafts).toHaveLength(10);
    expect(drafts.every((r) => r.status === "draft" && r.month === "2026-10")).toBe(true);
    expect(listReportBatches("6a")[0].id).toBe(batch.id);
  });

  it("cho trùng khoảng với đợt khác", () => {
    const range = defaultRange(getStore().sessions, "6a")!;
    const a = createReportBatch({ classId: "6a", ...range });
    const b = createReportBatch({ classId: "6a", ...range });
    expect(a.id).not.toBe(b.id);
    expect(listReportBatches("6a").map((x) => x.id)).toEqual(
      expect.arrayContaining([a.id, b.id]),
    );
  });

  it("từ chối buổi bắt đầu sau buổi kết thúc và buổi đã hủy", () => {
    const { fromSessionId, toSessionId } = defaultRange(getStore().sessions, "6a")!;
    expect(() =>
      createReportBatch({ classId: "6a", fromSessionId: toSessionId, toSessionId: fromSessionId }),
    ).toThrow("Buổi bắt đầu phải trước");
    expect(() =>
      createReportBatch({ classId: "6a", fromSessionId, toSessionId: "6a-extra-cancelled" }),
    ).toThrow("Không chọn buổi đã hủy.");
  });

  it("học sinh vào lớp sau khoảng không có báo cáo, em rời giữa khoảng vẫn có", () => {
    updateStore((draft) => {
      const late = draft.students.find((s) => s.id === "6a-student-2")!;
      late.enrolledAt = "2026-10-20";
      const left = draft.students.find((s) => s.id === "6a-student-3")!;
      left.leftAt = "2026-10-06";
    });
    const range = defaultRange(getStore().sessions, "6a")!;
    const batch = createReportBatch({ classId: "6a", ...range });
    const ids = getStore().reports.filter((r) => r.batchId === batch.id).map((r) => r.studentId);
    expect(ids).not.toContain("6a-student-2");
    expect(ids).toContain("6a-student-3");
  });

  it("em vào lớp giữa khoảng chỉ tính các buổi từ ngày vào lớp", () => {
    updateStore((draft) => {
      draft.students.find((s) => s.id === "6a-student-4")!.enrolledAt = "2026-10-07";
    });
    const row = rowsOf("6a-report-batch").rows.find((r) => r.report.student.id === "6a-student-4")!;
    // Buổi 5–8 là 05/10, 07/10, 12/10, 14/10; em vào 07/10 nên chỉ tính 3 buổi.
    expect(row.report.sessions).toHaveLength(3);
  });

  it("số liệu chỉ tính buổi chưa hủy trong khoảng", () => {
    const full = rowsOf("6a-report-batch").rows[0].report.sessions;
    expect(full).toHaveLength(4);
    cancelSession("6a-session-5");
    const after = resolveRange(getStore().sessions, getStore().reportBatches.find((b) => b.id === "6a-report-batch")!);
    expect(after?.label).toBe("Buổi 5–7 · 05/10–14/10");
    expect(rowsOf("6a-report-batch").rows[0].report.sessions).toHaveLength(3);
  });

  it("đợt mất buổi cuối do hủy thì không còn hợp lệ", () => {
    cancelSession("6a-session-7");
    const batch = getStore().reportBatches.find((b) => b.id === "6a-report-batch")!;
    expect(buildBatchRows(batch, readClassReportSource("6a"))).toBeNull();
  });
});

describe("bản báo cáo trong đợt", () => {
  it("saveReport không tạo trùng bản của một em trong cùng đợt", () => {
    const a = saveReport({ classId: "6a", studentId: "6a-student-5", batchId: "6a-report-batch" });
    const b = saveReport({ classId: "6a", studentId: "6a-student-5", batchId: "6a-report-batch" });
    expect(a.id).toBe(b.id);
  });

  it("đếm trạng thái đợt: đã phát hành, nháp, cần phát hành lại", () => {
    updateStore((draft) => {
      draft.reports.find((r) => r.id === "6a-student-1-report")!.needsRepublish = true;
    });
    const counts = batchCounts(rowsOf("6a-report-batch").rows);
    expect(counts.total).toBe(10);
    expect(counts.published).toBe(0);
    expect(counts.republish).toBe(1);
    expect(counts.published + counts.republish + counts.draft).toBe(10);
  });
});

describe("chuyển báo cáo tháng cũ sang đợt", () => {
  it("báo cáo chưa có batchId được gắn vào đợt suy ra từ buổi đã diễn ra trong tháng", async () => {
    const { migrateStore } = await import("../migrations");
    const state = createSeed();
    const legacy = state.reports.map(({ batchId: _b, ...rest }) => rest);
    const migrated = migrateStore({ ...state, reportBatches: undefined, reports: legacy });
    const batch = migrated.reportBatches.find((b) => b.id === "legacy-6a-2026-10")!;
    expect(resolveRange(migrated.sessions, batch)?.label).toBe("Buổi 5–8 · 05/10–14/10");
    const report = migrated.reports.find((r) => r.id === "6a-student-1-report")!;
    expect(report.batchId).toBe("legacy-6a-2026-10");
    expect(report.status).toBe("published");
  });
});

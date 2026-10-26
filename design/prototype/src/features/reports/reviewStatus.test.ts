import { describe, expect, it } from "vitest";
import type { Report } from "../../data/types";
import {
  monthPeriodLabel,
  publishAllLabel,
  REPUBLISH_NOTE,
  reportMonthTitle,
  reportSlot,
  reviewSummary,
} from "./reviewStatus";

const report = (patch: Partial<Report> = {}): Report => ({
  id: "6a-student-1-report",
  classId: "6a",
  studentId: "6a-student-1",
  batchId: "6a-report-batch",
  month: "2026-10",
  status: "draft",
  needsRepublish: false,
  generalComment: "",
  publishedAt: null,
  ...patch,
});

const ready = { ready: true, missing: [] };
const notReady = {
  ready: false,
  missing: ["Thiếu nhận xét chung", "Thiếu điểm Unit 5"],
};

describe("trạng thái từng em trên màn duyệt báo cáo (ảnh 13/26)", () => {
  it("em còn thiếu dữ liệu luôn hiện Thiếu dữ liệu kèm lý do đầu tiên", () => {
    const slot = reportSlot(notReady, report({ status: "published" }));
    expect(slot.label).toBe("Thiếu dữ liệu");
    expect(slot.tone).toBe("warning");
    expect(slot.detail).toBe("Thiếu nhận xét chung · Thiếu điểm Unit 5");
    expect(slot.publishable).toBe(false);
  });

  it("báo cáo đã phát hành hiện ngày phát hành và không cần phát hành lại", () => {
    const slot = reportSlot(
      ready,
      report({ status: "published", publishedAt: "2026-10-12T09:00:00.000Z" }),
    );
    expect(slot.label).toMatch(/^Đã phát hành · \d{1,2}\/10$/);
    expect(slot.tone).toBe("success");
    expect(slot.publishable).toBe(false);
    expect(slot.publishLabel).toBe("Phát hành lại");
  });

  it("cờ điểm có cập nhật hiện Cần phát hành lại và cho phát hành lại", () => {
    const slot = reportSlot(
      ready,
      report({
        status: "published",
        needsRepublish: true,
        publishedAt: "2026-10-12T09:00:00.000Z",
      }),
    );
    expect(slot.label).toBe("Cần phát hành lại");
    expect(slot.tone).toBe("primary");
    expect(slot.detail).toBe(REPUBLISH_NOTE);
    expect(slot.publishable).toBe(true);
    expect(slot.publishLabel).toBe("Phát hành lại");
  });

  it("bản nháp và em chưa có bản ghi đều sẵn sàng phát hành", () => {
    const draft = reportSlot(ready, report());
    expect(draft.label).toBe("Nháp");
    expect(draft.publishable).toBe(true);
    expect(draft.publishLabel).toBe("Phát hành");

    const fresh = reportSlot(ready, undefined);
    expect(fresh.label).toBe("Sẵn sàng");
    expect(fresh.publishable).toBe(true);
  });
});

describe("tổng hợp đầu màn duyệt", () => {
  it("đếm đúng số sẵn sàng, thiếu dữ liệu, đã phát hành và số cần phát hành", () => {
    const slots = [
      reportSlot(ready, report()),
      reportSlot(ready, report({ status: "published", publishedAt: "2026-10-12T09:00:00.000Z" })),
      reportSlot(ready, report({ status: "published", needsRepublish: true })),
      reportSlot(notReady, undefined),
    ];
    expect(reviewSummary(slots)).toEqual({
      total: 4,
      ready: 3,
      missing: 1,
      published: 1,
      publishable: 2,
    });
    expect(publishAllLabel(3)).toBe("Phát hành 3 báo cáo");
    expect(publishAllLabel(0)).toBe("Phát hành báo cáo");
    expect(monthPeriodLabel("2026-10")).toBe("Tháng 10");
    expect(reportMonthTitle("2026-10")).toBe("Báo cáo tháng 10");
  });
});

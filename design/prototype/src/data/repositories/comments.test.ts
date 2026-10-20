import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../seed";
import { getStore, replaceStore } from "../store";
import { MEMBER_IDS } from "../defaults";
import { switchRole } from "./access";
import {
  flushQueuedTickets,
  getSessionComment,
  listSessionComments,
  saveSessionComment,
  sendSessionTickets,
} from "./comments";

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("navigator", { onLine: true });
  replaceStore(createSeed());
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Lưu phiếu buổi học", () => {
  it("tạo nháp rồi upsert đúng buổi + em, không tạo phiếu trùng", () => {
    const draft = saveSessionComment({
      sessionId: "6a-session-8",
      studentId: "6a-student-4",
      stars: 2,
    });
    expect(draft).toMatchObject({
      sessionId: "6a-session-8",
      studentId: "6a-student-4",
      classId: "6a",
      stars: 2,
      note: "",
      status: "draft",
      sendQueued: false,
      sentAt: null,
    });
    const edited = saveSessionComment({
      sessionId: "6a-session-8",
      studentId: "6a-student-4",
      stars: 3,
      note: "Con tiến bộ rõ rệt.",
    });
    expect(edited.id).toBe(draft.id);
    expect(edited.stars).toBe(3);
    expect(edited.note).toBe("Con tiến bộ rõ rệt.");
    expect(
      getStore().comments.filter(
        (comment) =>
          comment.sessionId === "6a-session-8" &&
          comment.studentId === "6a-student-4",
      ),
    ).toHaveLength(1);
    expect(getSessionComment("6a-session-8", "6a-student-4")?.id).toBe(
      draft.id,
    );
  });

  it("phiếu đã gửi giữ trạng thái sent khi sửa, phụ huynh thấy ngay", () => {
    const sent = getSessionComment("6a-session-7", "6a-student-1")!;
    expect(sent.status).toBe("sent");
    const edited = saveSessionComment({
      sessionId: "6a-session-7",
      studentId: "6a-student-1",
      stars: 2,
      note: "Hôm nay con cần tập trung hơn.",
    });
    expect(edited).toMatchObject({
      id: sent.id,
      status: "sent",
      stars: 2,
      note: "Hôm nay con cần tập trung hơn.",
      sentAt: sent.sentAt,
    });
    expect(
      getStore().comments.filter(
        (comment) =>
          comment.sessionId === "6a-session-7" &&
          comment.studentId === "6a-student-1",
      ),
    ).toHaveLength(1);
  });

  it("phiếu đã gửi không được bỏ mức sao", () => {
    expect(() =>
      saveSessionComment({
        sessionId: "6a-session-7",
        studentId: "6a-student-1",
        stars: null,
      }),
    ).toThrow("Phiếu đã gửi phải giữ mức sao.");
  });

  it("chỉ nhận mức sao 1, 2, 3 hoặc null", () => {
    expect(() =>
      saveSessionComment({
        sessionId: "6a-session-8",
        studentId: "6a-student-4",
        stars: 4 as unknown as 1,
      }),
    ).toThrow("Mức sao phải là 1, 2 hoặc 3.");
  });

  it("chỉ lưu phiếu cho em đang học vào ngày buổi", () => {
    expect(() =>
      saveSessionComment({
        sessionId: "6a-session-8",
        studentId: "6a-student-9",
        stars: 3,
      }),
    ).toThrow("Học sinh không học ở buổi này.");
  });

  it("buổi đã hủy không có phiếu", () => {
    expect(() =>
      saveSessionComment({
        sessionId: "6a-extra-cancelled",
        studentId: "6a-student-4",
        stars: 3,
      }),
    ).toThrow("Buổi học đã hủy nên không có phiếu buổi học.");
  });

  it("phụ huynh chỉ đọc, không lưu hay gửi phiếu", () => {
    switchRole(MEMBER_IDS.lanGuardian);
    expect(listSessionComments("6a-session-7")).toEqual([]);
    expect(() =>
      saveSessionComment({
        sessionId: "6a-session-7",
        studentId: "6a-student-1",
        stars: 3,
      }),
    ).toThrow("Bạn không có quyền thực hiện thao tác này.");
    expect(() => sendSessionTickets("6a-session-7")).toThrow(
      "Bạn không có quyền thực hiện thao tác này.",
    );
  });
});

describe("Gửi phiếu cả lớp", () => {
  it("chỉ gửi phiếu đã chọn sao, bỏ qua em chưa chọn sao", () => {
    const result = sendSessionTickets("6a-session-7");
    expect(result.sent).toEqual([
      "6a-student-1",
      "6a-student-2",
      "6a-student-3",
    ]);
    expect(result.skipped).toEqual([
      "6a-student-0",
      "6a-student-4",
      "6a-student-5",
      "6a-student-6",
      "6a-student-7",
      "6a-student-8",
    ]);
    expect(result.queued).toBe(false);
    for (const studentId of result.sent)
      expect(getSessionComment("6a-session-7", studentId)?.status).toBe("sent");
  });

  it("gửi được khi còn phần BTVN chưa chấm và trả số phần để hỏi xác nhận", () => {
    const result = sendSessionTickets("6a-session-7", [
      "6a-student-1",
      "6a-student-3",
    ]);
    expect(result.sent).toEqual(["6a-student-1", "6a-student-3"]);
    expect(result.ungraded.students.map((student) => student.id)).toEqual([
      "6a-student-3",
    ]);
    expect(result.ungraded.ungradedParts).toBe(1);
  });

  it("không có phiếu nào chọn sao thì không ghi hàng đợi", () => {
    const before = getStore().pending.length;
    const result = sendSessionTickets("6a-session-8");
    expect(result.sent).toEqual([]);
    expect(result.queued).toBe(false);
    expect(getStore().pending).toHaveLength(before);
  });

  it("mất mạng: xếp hàng, hiện chờ mạng và tự gửi khi có mạng", () => {
    saveSessionComment({
      sessionId: "6a-session-8",
      studentId: "6a-student-4",
      stars: 3,
    });
    vi.stubGlobal("navigator", { onLine: false });
    const result = sendSessionTickets("6a-session-8", ["6a-student-4"]);
    expect(result).toMatchObject({ queued: true, sent: ["6a-student-4"] });
    expect(getSessionComment("6a-session-8", "6a-student-4")).toMatchObject({
      status: "draft",
      sendQueued: true,
      sentAt: null,
    });
    expect(getStore().pending.length).toBeGreaterThan(0);
    expect(flushQueuedTickets()).toBe(0);

    vi.stubGlobal("navigator", { onLine: true });
    // Seed có sẵn một phiếu đang chờ mạng của buổi 14/10 nên gửi cả hai.
    expect(flushQueuedTickets()).toBe(2);
    expect(getSessionComment("6a-session-8", "6a-student-4")).toMatchObject({
      status: "sent",
      sendQueued: false,
    });
    expect(
      getSessionComment("6a-session-8", "6a-student-4")?.sentAt,
    ).toBeTruthy();
    expect(getSessionComment("6a-session-7", "6a-student-3")).toMatchObject({
      status: "sent",
      sendQueued: false,
    });
  });

  it("sửa phiếu đang chờ mạng vẫn giữ hàng đợi gửi", () => {
    vi.stubGlobal("navigator", { onLine: false });
    saveSessionComment({
      sessionId: "6a-session-8",
      studentId: "6a-student-4",
      stars: 1,
    });
    sendSessionTickets("6a-session-8", ["6a-student-4"]);
    const edited = saveSessionComment({
      sessionId: "6a-session-8",
      studentId: "6a-student-4",
      stars: 3,
      note: "Con đã sửa bài đầy đủ.",
    });
    expect(edited).toMatchObject({ stars: 3, sendQueued: true, status: "draft" });
  });
});

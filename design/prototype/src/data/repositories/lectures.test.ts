import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../seed";
import { replaceStore } from "../store";
import { MEMBER_IDS } from "../defaults";
import {
  archiveLecture,
  attachLecture,
  createLecture,
  detachLecture,
  getLecture,
  lectureUsageCount,
  listLectureSessions,
  listLectures,
  listSessionLectures,
  restoreLecture,
  updateLecture,
} from "./lectures";

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

/** Đặt membership đang dùng (thêm vào phiên để switchRole hợp lệ). */
function actAs(memberId: string): void {
  const state = createSeed();
  state.auth = { phone: "900000001", memberIds: [memberId] };
  state.activeMemberId = memberId;
  replaceStore(state);
}

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

describe("Thư viện bài giảng", () => {
  it("người tạo thấy bài giảng của mình dù chưa gắn buổi nào", () => {
    actAs(MEMBER_IDS.lanTeacher);
    const created = createLecture({
      title: "  Bài mới  ",
      sections: [{ title: "Phần 1", description: "Mô tả", files: [] }],
    });
    expect(created.title).toBe("Bài mới");
    expect(created.createdBy).toBe(MEMBER_IDS.lanTeacher);
    expect(getLecture(created.id)?.id).toBe(created.id);
    expect(listLectures("mine").map((item) => item.id)).toContain(created.id);
    expect(listLectures("all").map((item) => item.id)).toContain(created.id);
  });

  it("vai trợ giảng chỉ thấy bài giảng gắn với buổi của lớp được gán", () => {
    actAs(MEMBER_IDS.trang);
    const ids = listLectures("all").map((item) => item.id);
    expect(ids).toContain("lecture-travel-vocab");
    expect(ids).not.toContain("lecture-present-perfect");
    expect(getLecture("lecture-present-perfect")).toBeUndefined();
    expect(listSessionLectures("6a-session-1")).toEqual([]);
  });

  it("lưu trữ và khôi phục bài giảng", () => {
    archiveLecture("lecture-travel-vocab");
    expect(listLectures("archived").map((item) => item.id)).toContain(
      "lecture-travel-vocab",
    );
    expect(listLectures("all").map((item) => item.id)).not.toContain(
      "lecture-travel-vocab",
    );
    restoreLecture("lecture-travel-vocab");
    expect(listLectures("all").map((item) => item.id)).toContain(
      "lecture-travel-vocab",
    );
  });
});

describe("Gắn bài giảng nhiều-nhiều", () => {
  it("một buổi dùng nhiều bài giảng, một bài dùng cho nhiều buổi nhiều lớp", () => {
    expect(listSessionLectures("6a-session-1").map((item) => item.id)).toEqual([
      "lecture-present-perfect",
      "lecture-travel-vocab",
    ]);
    expect(lectureUsageCount("lecture-travel-vocab")).toBe(2);
    expect(
      listLectureSessions("lecture-travel-vocab").map((item) => item.className),
    ).toEqual(["IELTS 7.0", "Tiếng Anh giao tiếp 6A"]);
  });

  it("gắn rồi gỡ chỉ đổi liên kết và cập nhật lượt dùng", () => {
    const before = listSessionLectures("6a-session-2").length;
    attachLecture("6a-session-2", "lecture-travel-vocab");
    expect(lectureUsageCount("lecture-travel-vocab")).toBe(3);
    expect(listSessionLectures("6a-session-2").map((item) => item.id)).toEqual([
      "lecture-travel-vocab",
    ]);
    // Gắn trùng không tạo liên kết thứ hai.
    attachLecture("6a-session-2", "lecture-travel-vocab");
    expect(listSessionLectures("6a-session-2").length).toBe(before + 1);

    detachLecture("6a-session-2", "lecture-travel-vocab");
    expect(listSessionLectures("6a-session-2")).toEqual([]);
    expect(lectureUsageCount("lecture-travel-vocab")).toBe(2);
    // Bài giảng vẫn còn trong thư viện.
    expect(getLecture("lecture-travel-vocab")).toBeDefined();
  });
});

describe("Sửa bài giảng", () => {
  it("đổi nội dung cho mọi buổi đang dùng, chỉ sửa một nơi", () => {
    const before = listSessionLectures("6a-session-1").find(
      (item) => item.id === "lecture-present-perfect",
    )!;
    expect(before.sections[0].title).toBe("Khởi động");

    updateLecture("lecture-present-perfect", {
      title: "Unit 3: Present Perfect (mới)",
      sections: [{ title: "Phần mới", description: "Mô tả mới", files: [] }],
    });

    const first = listSessionLectures("6a-session-1").find(
      (item) => item.id === "lecture-present-perfect",
    )!;
    const second = listSessionLectures("6a-session-0").find(
      (item) => item.id === "lecture-present-perfect",
    )!;
    expect(first.title).toBe("Unit 3: Present Perfect (mới)");
    expect(first.sections.map((section) => section.title)).toEqual([
      "Phần mới",
    ]);
    expect(second.sections).toEqual(first.sections);
  });
});

describe("Quyền bài giảng", () => {
  it("vai trò chỉ đọc không tạo, sửa, lưu trữ hay gắn được", () => {
    actAs(MEMBER_IDS.trang);
    expect(() =>
      createLecture({
        title: "Không được",
        sections: [{ title: "P", description: "", files: [] }],
      }),
    ).toThrow("Bạn không có quyền thực hiện thao tác này.");
    expect(() =>
      updateLecture("lecture-travel-vocab", { title: "X", sections: [] }),
    ).toThrow("Bạn không có quyền thực hiện thao tác này.");
    expect(() => archiveLecture("lecture-travel-vocab")).toThrow(
      "Bạn không có quyền thực hiện thao tác này.",
    );
    expect(() => attachLecture("ielts-session-0", "lecture-travel-vocab")).toThrow(
      "Bạn không có quyền thực hiện thao tác này.",
    );
  });
});

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSaveAction } from "./useSaveAction";

type Props = { baseline: { name: string }; value: { name: string }; validate?: (v: { name: string }) => boolean | string; save: () => unknown };
const setup = (initial: Props) => renderHook((p: Props) => useSaveAction(p), { initialProps: initial });

describe("useSaveAction", () => {
  it("giống baseline: không dirty, không canSave", () => {
    const { result } = setup({ baseline: { name: "A" }, value: { name: "A" }, save: vi.fn() });
    expect(result.current.dirty).toBe(false);
    expect(result.current.canSave).toBe(false);
  });

  it("dirty + hợp lệ → canSave; không hợp lệ → valid=false, canSave=false", () => {
    const ok = setup({ baseline: { name: "A" }, value: { name: "B" }, save: vi.fn() });
    expect(ok.result.current).toMatchObject({ dirty: true, valid: true, canSave: true });
    const bad = setup({ baseline: { name: "A" }, value: { name: "" }, validate: (v) => v.name !== "", save: vi.fn() });
    expect(bad.result.current).toMatchObject({ dirty: true, valid: false, canSave: false });
    const msg = setup({ baseline: { name: "A" }, value: { name: "" }, validate: () => "Thiếu tên", save: vi.fn() });
    expect(msg.result.current.valid).toBe(false);
  });

  it("bấm hai lần trong cùng tick chỉ gọi save một lần, kể cả save đồng bộ", async () => {
    const save = vi.fn();
    const { result } = setup({ baseline: { name: "A" }, value: { name: "B" }, save });
    let results: boolean[] = [];
    await act(async () => {
      results = await Promise.all([result.current.submit(), result.current.submit()]);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(results).toEqual([true, false]);
  });

  it("saving = true trong lúc Promise chờ; xong thì baseline = value và về disabled", async () => {
    let resolve!: () => void;
    const save = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    const { result } = setup({ baseline: { name: "A" }, value: { name: "B" }, save });
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.submit(); });
    expect(result.current.saving).toBe(true);
    expect(result.current.canSave).toBe(false);
    await act(async () => { resolve(); await pending; });
    expect(result.current.saving).toBe(false);
    expect(result.current.dirty).toBe(false);
    expect(result.current.canSave).toBe(false);
  });

  it("lỗi (ném, reject hoặc trả false) giữ dirty để thử lại", async () => {
    for (const save of [vi.fn(() => { throw new Error("x"); }), vi.fn(() => Promise.reject(new Error("y"))), vi.fn(() => false)]) {
      const { result } = setup({ baseline: { name: "A" }, value: { name: "B" }, save });
      let ok = true;
      await act(async () => { ok = await result.current.submit(); });
      expect(ok).toBe(false);
      expect(result.current.dirty).toBe(true);
      expect(result.current.canSave).toBe(true);
      expect(result.current.error).not.toBeNull();
    }
  });

  it("baseline từ ngoài đổi theo giá trị vừa lưu thì vẫn không dirty; sửa tiếp thì dirty lại", async () => {
    const save = vi.fn();
    const { result, rerender } = setup({ baseline: { name: "A" }, value: { name: "B" }, save });
    await act(async () => { await result.current.submit(); });
    rerender({ baseline: { name: "B" }, value: { name: "B" }, save });
    await waitFor(() => expect(result.current.dirty).toBe(false));
    rerender({ baseline: { name: "B" }, value: { name: "C" }, save });
    expect(result.current.dirty).toBe(true);
  });

  it("so sâu mặc định cho mảng/object lồng nhau", () => {
    const { result } = renderHook(() => useSaveAction({ baseline: { rows: [{ id: 1, v: 5 }] }, value: { rows: [{ id: 1, v: 5 }] }, save: vi.fn() }));
    expect(result.current.dirty).toBe(false);
  });
});

describe("useSaveAction thời gian hiển thị", () => {
  const props = { baseline: { name: "A" }, value: { name: "B" }, save: vi.fn() };

  it("saving giữ tối thiểu 400 ms dù save xong ngay; justSaved đúng 1,6 s", async () => {
    vi.useFakeTimers();
    try {
      const { result } = setup({ ...props, save: vi.fn() });
      let pending!: Promise<boolean>;
      act(() => { pending = result.current.submit(); });
      await act(async () => { await vi.advanceTimersByTimeAsync(399); });
      expect(result.current.saving).toBe(true);
      expect(result.current.justSaved).toBe(false);
      // Mốc 400 ms tính từ khung hình đầu tiên có trạng thái đang lưu (rAF giả = 16 ms).
      await act(async () => { await vi.advanceTimersByTimeAsync(1 + 16); });
      await expect(pending).resolves.toBe(true);
      expect(result.current.saving).toBe(false);
      expect(result.current.justSaved).toBe(true);
      await act(async () => { await vi.advanceTimersByTimeAsync(1599); });
      expect(result.current.justSaved).toBe(true);
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      expect(result.current.justSaved).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("lỗi: hết loading tối thiểu rồi giữ dirty, không justSaved, thử lại được", async () => {
    vi.useFakeTimers();
    try {
      const { result } = setup({ ...props, save: vi.fn(() => { throw new Error("x"); }) });
      let pending!: Promise<boolean>;
      act(() => { pending = result.current.submit(); });
      await act(async () => { await vi.advanceTimersByTimeAsync(400 + 16); });
      await expect(pending).resolves.toBe(false);
      expect(result.current).toMatchObject({ saving: false, justSaved: false, dirty: true, canSave: true });
      expect(result.current.error).toBeInstanceOf(Error);
    } finally {
      vi.useRealTimers();
    }
  });

  it("unmount giữa chừng: submit vẫn resolve, không cập nhật state", async () => {
    vi.useFakeTimers();
    try {
      const { result, unmount } = setup({ ...props, save: vi.fn() });
      let pending!: Promise<boolean>;
      act(() => { pending = result.current.submit(); });
      unmount();
      await vi.advanceTimersByTimeAsync(400 + 16);
      await expect(pending).resolves.toBe(true);
      await vi.advanceTimersByTimeAsync(2000);
    } finally {
      vi.useRealTimers();
    }
  });
});

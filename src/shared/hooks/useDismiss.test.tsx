import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { useDismiss } from "./useDismiss";

function Menu({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);
  return (
    <div ref={ref}>
      <button onClick={() => setOpen((v) => !v)}>mở {id}</button>
      {open && (
        <div role="menu" aria-label={id}>
          <button role="menuitem" onClick={() => setOpen(false)}>chọn {id}</button>
        </div>
      )}
    </div>
  );
}

function Page() {
  return (
    <>
      <Menu id="a" />
      <Menu id="b" />
      <p>ngoài</p>
    </>
  );
}

describe("useDismiss", () => {
  it("đóng khi bấm ra ngoài", () => {
    render(<Page />);
    fireEvent.click(screen.getByText("mở a"));
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.pointerDown(screen.getByText("ngoài"));
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("không đóng khi bấm trong menu, đóng khi chọn mục", () => {
    render(<Page />);
    fireEvent.click(screen.getByText("mở a"));
    fireEvent.pointerDown(screen.getByRole("menu"));
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem"));
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("đóng bằng Esc và trả focus về nút mở", () => {
    render(<Page />);
    const trigger = screen.getByText("mở a");
    trigger.focus();
    fireEvent.click(trigger);
    screen.getByRole("menuitem").focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it("mở menu khác thì menu cũ đóng", () => {
    render(<Page />);
    fireEvent.click(screen.getByText("mở a"));
    fireEvent.pointerDown(screen.getByText("mở b"));
    fireEvent.click(screen.getByText("mở b"));
    expect(screen.getAllByRole("menu")).toHaveLength(1);
    expect(screen.getByRole("menu").getAttribute("aria-label")).toBe("b");
  });
});

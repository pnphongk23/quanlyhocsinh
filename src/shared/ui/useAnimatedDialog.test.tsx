import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";
import { useAnimatedDialog } from "./useAnimatedDialog";

function Harness({ open }: { open: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useAnimatedDialog(ref, open);
  return (
    <dialog ref={ref}>
      <span>content</span>
    </dialog>
  );
}

function animationEnd(name: string, pseudoElement = ""): Event {
  const event = new Event("animationend", { bubbles: true });
  Object.defineProperties(event, {
    animationName: { value: name },
    pseudoElement: { value: pseudoElement },
  });
  return event;
}

function ConditionallyMountedModal() {
  const [open, setOpen] = useState(true);
  const close = () => setOpen(false);
  return open ? (
    <Modal open onClose={close} title="Conditional modal">
      <form>
        <button type="button" onClick={close}>
          Huỷ
        </button>
      </form>
    </Modal>
  ) : null;
}

describe("useAnimatedDialog", () => {
  let dialog: HTMLDialogElement;

  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      }),
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function renderOpenDialog(
    name: string,
    duration = "200ms",
    reducedMotion = false,
  ) {
    vi.spyOn(window, "matchMedia").mockImplementation(
      () => ({ matches: reducedMotion }) as MediaQueryList,
    );
    const getStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) =>
      element instanceof HTMLDialogElement
        ? ({
            animationName: name,
            animationDuration: duration,
            animationDelay: "0s",
          }) as CSSStyleDeclaration
        : getStyle(element, pseudo),
    );
    const view = render(<Harness open />);
    dialog = view.container.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    return view;
  }

  it.each([
    ["dialogOut"],
    ["sheetOut"],
  ])("waits for the matching %s animationend", (exitName) => {
    const view = renderOpenDialog(exitName);
    view.rerender(<Harness open={false} />);

    act(() => dialog.dispatchEvent(animationEnd("backdropOut", "::backdrop")));
    act(() => dialog.dispatchEvent(animationEnd("dialogIn")));
    expect(dialog.open).toBe(true);
    expect(dialog).toHaveAttribute("data-closing");

    act(() => dialog.dispatchEvent(animationEnd(exitName)));
    expect(dialog.open).toBe(false);
  });

  it("defers a nested cancel action before a conditional Modal unmount", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      () => ({ matches: false }) as MediaQueryList,
    );
    const getStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) =>
      element instanceof HTMLDialogElement
        ? ({
            animationName: "dialogOut",
            animationDuration: "200ms",
            animationDelay: "0s",
          }) as CSSStyleDeclaration
        : getStyle(element, pseudo),
    );
    const view = render(<ConditionallyMountedModal />);
    const dialog = view.container.querySelector("dialog")!;

    fireEvent.click(screen.getByRole("button", { name: "Huỷ" }));

    expect(dialog.open).toBe(true);
    expect(dialog).toHaveAttribute("data-closing");
    expect(view.container.querySelector("dialog")).toBe(dialog);

    act(() => dialog.dispatchEvent(animationEnd("dialogOut")));

    expect(view.container.querySelector("dialog")).toBeNull();
  });

  it("cancels the pending close when reopened", () => {
    const view = renderOpenDialog("sheetOut");
    view.rerender(<Harness open={false} />);
    expect(dialog).toHaveAttribute("data-closing");

    view.rerender(<Harness open />);
    act(() => dialog.dispatchEvent(animationEnd("sheetOut")));
    expect(dialog.open).toBe(true);
    expect(dialog).not.toHaveAttribute("data-closing");
  });

  it("closes immediately for reduced motion", () => {
    const view = renderOpenDialog("dialogOut", "200ms", true);
    view.rerender(<Harness open={false} />);
    expect(dialog.open).toBe(false);
  });

  it("closes immediately when computed style has no animation", () => {
    const view = renderOpenDialog("none", "0s");
    view.rerender(<Harness open={false} />);
    expect(dialog.open).toBe(false);
  });

  it("uses the 400ms fallback if the exit animationend event is missing", () => {
    vi.useFakeTimers();
    const view = renderOpenDialog("dialogOut");
    view.rerender(<Harness open={false} />);
    act(() => vi.advanceTimersByTime(399));
    expect(dialog.open).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(dialog.open).toBe(false);
  });
});

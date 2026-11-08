import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CriteriaSetItem } from "../../data/api/types";
import { createCriteriaDraft } from "./customCriteriaModel";
import { CustomCriteriaFields } from "./CustomCriteriaFields";

const criteria = (count: number): CriteriaSetItem[] => Array.from({ length: count }, (_, index) => ({
  id: `c${index}`, name: `Tiêu chí ${index + 1}`,
  texts: { good: `Tốt ${index + 1}`, ok: `Đạt ${index + 1}`, needs_work: `Cố gắng ${index + 1}` },
  default_level: "good", homework: false,
}));

describe("CustomCriteriaFields", () => {
  it.each([1, 6, 8])("renders the actual x/N scale for N=%i", (count) => {
    const items = criteria(count);
    const draft = createCriteriaDraft(items, [], false);
    render(<CustomCriteriaFields draft={draft} homeworkGiven={false} sent={false} disabled={false} note="" onLevelChange={vi.fn()} onCommentChange={vi.fn()} onNoteChange={vi.fn()} />);
    expect(screen.getByTestId("custom-criteria-score")).toHaveTextContent(`/${count}`);
    expect(screen.getByRole("radiogroup", { name: "Tiêu chí 1" })).toBeInTheDocument();
  });

  it("labels the homework row and forwards level changes", () => {
    const items = criteria(1);
    items[0] = { ...items[0]!, homework: true, name: "Làm bài tập về nhà" };
    const onLevelChange = vi.fn();
    render(<CustomCriteriaFields draft={createCriteriaDraft(items, [], true)} homeworkGiven sent={false} disabled={false} note="" onLevelChange={onLevelChange} onCommentChange={vi.fn()} onNoteChange={vi.fn()} />);
    expect(screen.getByText("Theo chấm BTVN")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Làm bài tập về nhà: Cần cố gắng, 1 trên 3" }));
    expect(onLevelChange).toHaveBeenCalledWith("c0", "needs_work");
  });

  it("shows the approved only-homework fallback note when homework was not assigned", () => {
    const item = { ...criteria(1)[0]!, homework: true, name: "Bài tập" };
    const draft = createCriteriaDraft([item], [], false);
    render(<CustomCriteriaFields draft={draft} homeworkGiven={false} sent={true} disabled={false} note="" onLevelChange={vi.fn()} onCommentChange={vi.fn()} onNoteChange={vi.fn()} />);
    expect(screen.getByText("Buổi trước không giao BTVN")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Bài tập: Tốt, 3 trên 3" })).toBeEnabled();
    expect(screen.getByTestId("custom-criteria-score")).toHaveTextContent("1/1");
  });
});

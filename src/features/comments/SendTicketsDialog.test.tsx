import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SendTicketsDialog from "./SendTicketsDialog";

afterEach(cleanup);

describe("SendTicketsDialog", () => {
  it("nói phụ huynh nhận sao và nhận xét, không còn nhắc câu mẫu", () => {
    render(
      <SendTicketsDialog open sessionLabel="Buổi 3" sendCount={2} skipped={[]} ungraded={{ students: [], ungradedParts: 0 }} onConfirm={() => {}} onClose={() => {}} />,
    );
    expect(screen.getByText(/một thông báo/).parentElement?.textContent).toMatch(/gồm sao\s+và nhận xét\./);
    expect(screen.queryByText(/câu mẫu/)).toBeNull();
  });
});

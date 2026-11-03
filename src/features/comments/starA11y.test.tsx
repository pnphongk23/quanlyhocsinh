import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StarRow } from "./TicketEditor";

describe("nhãn truy cập của hàng sao", () => {
  it("hàng sao ở danh sách đọc được 'N sao'", () => {
    render(<StarRow level={4} />);
    expect(screen.getByRole("img", { name: "4 sao" })).toBeInTheDocument();
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Collapse } from "./Collapse";

describe("Collapse", () => {
  it("đóng: aria-hidden và inert để nội dung không focus/đọc được", () => {
    const html = renderToStaticMarkup(
      <Collapse open={false}>
        <button>Bên trong</button>
      </Collapse>,
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('inert=""');
    expect(html).toContain("Bên trong");
  });
  it("mở: không inert, aria-hidden=false", () => {
    const html = renderToStaticMarkup(
      <Collapse open>
        <button>Bên trong</button>
      </Collapse>,
    );
    expect(html).toContain('aria-hidden="false"');
    expect(html).not.toContain("inert");
  });
});

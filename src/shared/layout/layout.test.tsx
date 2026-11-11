import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormPage } from "./FormPage";
import { MasterDetailPage } from "./MasterDetailPage";
import { PageShell } from "./PageShell";
import { ResponsiveSlot } from "./ResponsiveSlot";
import { navItems } from "./navItems";

function setViewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("1024px") ? width >= 1024 : query.includes("640px") ? width >= 640 : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe("shared layout", () => {
  it("PageShell aligns route content with heading and exposes breadcrumb/back slots", () => {
    render(<MemoryRouter><PageShell breadcrumb="Cài đặt" backTo="/cai-dat" eyebrow="Quản lý" title="Tiêu chí" subtitle="Mô tả" actions={<button>Lưu</button>}><p>Nội dung</p></PageShell></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Tiêu chí" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Đường dẫn" })).toHaveTextContent("Cài đặt");
    expect(screen.getByRole("navigation", { name: "Đường dẫn" })).toHaveClass(/breadcrumb/);
    expect(screen.getByRole("link", { name: /Quay lại/ })).toHaveAttribute("href", "/cai-dat");
    expect(screen.getByText("Nội dung")).toBeInTheDocument();
  });

  it("FormPage provides a form column and optional action footer", () => {
    render(<MemoryRouter><FormPage title="Đổi mật khẩu" footer={<button>Lưu thay đổi</button>}><label>Mật khẩu mới <input /></label></FormPage></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Đổi mật khẩu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeInTheDocument();
  });

  it.each([[834, "tablet"], [390, "mobile"]] as const)("opens a viewport detail sheet at %ipx (%s)", (width, _size) => {
    setViewport(width);
    render(<MasterDetailPage master={<p>Danh sách</p>} detail={<p>Chi tiết</p>} detailOpen onCloseDetail={vi.fn()} detailTitle="Sửa tiêu chí" footer={<button>Lưu</button>} />);
    expect(screen.getByRole("dialog", { name: "Sửa tiêu chí" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đóng chi tiết" })).toHaveTextContent("×");
  });

  it("marks the master-detail layout when a desktop detail panel is open", () => {
    setViewport(1440);
    const { container } = render(<MasterDetailPage master={<p>Danh sách</p>} detail={<p>Chi tiết</p>} detailOpen onCloseDetail={vi.fn()} detailTitle="Sửa tiêu chí" />);
    expect(container.querySelector('[class*="hasDetail"]')).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Sửa tiêu chí" })).toBeInTheDocument();
  });

  it.each([[834, "Criteria table", "Criteria list"], [390, "Criteria list", "Criteria table"]] as const)("selects the %ipx master slot from layout", (width, visible, hidden) => {
    setViewport(width);
    const { container } = render(<MasterDetailPage master={<p>Criteria table</p>} mobileMaster={<p>Criteria list</p>} detailOpen={false} onCloseDetail={vi.fn()} detailTitle="Sửa tiêu chí" />);
    expect(screen.getByText(visible)).toBeInTheDocument();
    expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    expect(container.querySelector('[class*="masterDetail"]')).toBeInTheDocument();
  });

  it.each([[390, "Mobile content"], [834, "Tablet content"], [1440, "Desktop content"]] as const)("selects the %ipx responsive page slot", (width, content) => {
    setViewport(width);
    render(<ResponsiveSlot mobile={<p>Mobile content</p>} tablet={<p>Tablet content</p>} desktop={<p>Desktop content</p>} />);
    expect(screen.getByText(content)).toBeInTheDocument();
    expect(screen.getAllByText(/content/)).toHaveLength(1);
  });

  it("uses one navigation definition across its route groups", () => {
    expect(navItems.map(({ id }) => id)).toEqual(["classes", "attendance", "scores", "students", "reports", "calendar", "settings"]);
    expect(navItems.filter(({ child }) => child)).toHaveLength(4);
  });
});

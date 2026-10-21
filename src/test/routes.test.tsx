import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, matchRoutes } from "react-router-dom";
import { routes } from "../app/routes";
function open(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}
describe("foundation route integration", () => {
  it.each([
    ["/lop", "Lớp của tôi"], ["/lop/moi", "Tạo lớp mới"],
    ["/lop/class-a/buoi-hoc", "Buổi học"],
    ["/lop/class-a/buoi-hoc/session-a", "Chi tiết buổi học"],
    ["/lop/class-a/bai-kiem-tra", "Bài kiểm tra"],
    ["/lop/class-a/bai-kiem-tra/moi", "Tạo bài kiểm tra"],
    ["/lop/class-a/bai-kiem-tra/test-a", "Bảng điểm bài kiểm tra"],
    ["/lop/class-a/diem", "Điểm"], ["/lop/class-a/hoc-sinh", "Học sinh"],
    ["/lop/class-a/bao-cao", "Báo cáo"], ["/lich", "Lịch"],
  ])("staff %s renders inside its lazy shell", async (path, title) => {
    const router = open(path);
    expect(await screen.findByRole("heading", { name: title })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Điều hướng nhân sự" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Điều hướng phụ huynh" })).toBeNull();
    router.dispose();
  });
  it.each([
    ["/ph", "Tổng quan"], ["/ph/diem-danh", "Điểm danh"],
    ["/ph/diem-so", "Điểm số"], ["/ph/nhan-xet", "Nhận xét"],
    ["/ph/nhan-xet/session-a", "Phiếu buổi học"],
    ["/ph/btvn", "Bài tập về nhà"], ["/ph/btvn/session-a", "Bài tập về nhà"],
    ["/ph/bao-cao", "Báo cáo tháng"],
  ])("guardian %s renders inside its lazy shell", async (path, title) => {
    const router = open(path);
    expect(await screen.findByRole("heading", { name: title })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Điều hướng phụ huynh" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Điều hướng nhân sự" })).toBeNull();
    router.dispose();
  });
  it.each([
    ["/lop/class-a", "/lop/class-a/buoi-hoc", "Buổi học"],
    ["/lop/class-a/diem-danh", "/lop/class-a/buoi-hoc", "Buổi học"],
    ["/lop/class-a/nhan-xet", "/lop/class-a/buoi-hoc", "Buổi học"],
    ["/lop/class-a/diem/bai-moi", "/lop/class-a/bai-kiem-tra/moi", "Tạo bài kiểm tra"],
  ])("preserves prototype redirect %s", async (path, destination, title) => {
    const router = open(path);
    expect(await screen.findByRole("heading", { name: title })).toBeVisible();
    expect(router.state.location.pathname).toBe(destination);
    router.dispose();
  });
  it.each(["/dang-nhap", "/dang-ky", "/quen-mat-khau", "/doi-mat-khau-bat-buoc", "/chon-vai-tro", "/cai-dat", "/cai-dat/doi-mat-khau"])("reserves account route %s", (path) => {
    expect(matchRoutes(routes, path)?.at(-1)?.route.path).toBe(path);
  });
  it("opens staff and guardian shells from the foundation landing", async () => {
    const router = open("/");
    fireEvent.click(screen.getByRole("link", { name: "Khung nhân sự" }));
    expect(await screen.findByRole("heading", { name: "Lớp của tôi" })).toBeVisible();
    await router.navigate("/");
    fireEvent.click(await screen.findByRole("link", { name: "Khung phụ huynh" }));
    expect(await screen.findByRole("heading", { name: "Tổng quan" })).toBeVisible();
    router.dispose();
  });
  it.each(["/luong", "/hoc-phi", "/nhan-su", "/bai-giang", "/moi", "/otp", "/lop/class-a/bao-cao-diem"])("does not register non-MVP route %s", (path) => {
    expect(matchRoutes(routes, path)?.at(-1)?.route.path).toBe("*");
  });
});

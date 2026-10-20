import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router-dom";
import { MEMBER_IDS } from "../../data/defaults";
import { createSeed } from "../../data/seed";
import { replaceStore } from "../../data/store";
import { switchRole } from "../../data/repositories/access";
import { routes } from "../../app/routes";
import RolePickerPage from "../../features/auth/RolePickerPage";
import { landingPathFor, roleLandingPath } from "./roleLanding";

function seedGuardian(): void {
  replaceStore(createSeed());
  switchRole(MEMBER_IDS.lanGuardian);
}

function seedAdmin(): void {
  replaceStore(createSeed());
  switchRole(MEMBER_IDS.lanAdmin);
}

/** Đường dẫn cuối cùng sau khi router chạy xong loader chuyển hướng. */
async function finalPath(entry: string, expected: string): Promise<string> {
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  await vi.waitFor(() =>
    expect(router.state.location.pathname).toBe(expected),
  );
  return router.state.location.pathname;
}

describe("chuyển hướng theo vai trò đang dùng", () => {
  it("trang đầu theo loại vai trò: phụ huynh /ph, nhân sự /lop", () => {
    expect(landingPathFor("guardian")).toBe("/ph");
    expect(landingPathFor("staff")).toBe("/lop");
    seedGuardian();
    expect(roleLandingPath()).toBe("/ph");
    seedAdmin();
    expect(roleLandingPath()).toBe("/lop");
  });

  it("phụ huynh vào tuyến nhân sự thì về /ph", async () => {
    seedGuardian();
    expect(await finalPath("/lop", "/ph")).toBe("/ph");
    expect(await finalPath("/lop/6a/buoi-hoc/6a-session-7", "/ph")).toBe("/ph");
    expect(await finalPath("/lich", "/ph")).toBe("/ph");
    expect(await finalPath("/nhan-su", "/ph")).toBe("/ph");
    expect(await finalPath("/ph/diem-danh", "/ph/diem-danh")).toBe(
      "/ph/diem-danh",
    );
  });

  it("nhân sự vào /ph thì về /lop", async () => {
    seedAdmin();
    expect(await finalPath("/ph", "/lop")).toBe("/lop");
    expect(await finalPath("/ph/btvn/6a-session-7", "/lop")).toBe("/lop");
    expect(await finalPath("/ph/bao-cao", "/lop")).toBe("/lop");
  });

  it("đường dẫn không tồn tại về trang đầu của vai trò", async () => {
    seedGuardian();
    expect(await finalPath("/khong-co-trang-nay", "/ph")).toBe("/ph");
    seedAdmin();
    expect(await finalPath("/khong-co-trang-nay", "/lop")).toBe("/lop");
  });
});

describe("màn chọn vai trò", () => {
  it("hiện đủ nhãn ba vai trò của Cô Lan và tên con của vai trò phụ huynh", () => {
    seedAdmin();
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <RolePickerPage />
      </MemoryRouter>,
    );
    expect(html).toContain("Chọn vai trò");
    expect(html).toContain(">Admin<");
    expect(html).toContain(">Giáo viên<");
    expect(html).toContain(">Phụ huynh<");
    expect(html).toContain("Con: Trần Gia Bảo, Ngô Bảo Ngọc");
    expect(html).toContain("Đang dùng");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router-dom";
import { defaultRoles, MEMBER_IDS } from "../../data/defaults";
import type { WebSession } from "../../data/auth/session";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import { routes } from "../../app/routes";
import RolePickerPage from "../../features/auth/RolePickerPage";
import { landingPathFor, roleLandingPath } from "./roleLanding";

const authFixture = vi.hoisted(() => ({ session: null as WebSession | null }));
vi.mock("../../data/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../data/auth/session")>();
  return {
    ...actual,
    getSession: () => authFixture.session,
    initializeSession: async () => undefined,
    subscribeSession: () => () => undefined,
  };
});

function sessionFor(state: ReturnType<typeof createSeed>, memberIds: string[], activeMembershipId: string | null): WebSession {
  const user = { id: "fixture-user", phone: "+84900000001", display_name: "Nguyễn An", must_change_password: false };
  const memberships = memberIds.map((memberId) => {
    const member = state.members.find((item) => item.id === memberId)!;
    const role = state.roles.find((item) => item.id === member.roleId)!;
    const guardian = role.kind === "guardian";
    const students = guardian
      ? (member.studentIds ?? []).flatMap((studentId) => {
        const student = state.students.find((item) => item.id === studentId);
        const klass = student && state.classes.find((item) => item.id === student.classId);
        return student && klass ? [{ id: student.id, name: student.name, class_id: student.classId, class_name: klass.name, teacher_name: klass.teacherName ?? null }] : [];
      })
      : undefined;
    return {
      id: member.id,
      workspace: { id: "fixture-workspace", name: "Lớp của Fixture" },
      role: {
        id: role.id,
        name: role.name,
        system_key: role.system ? "admin" : guardian ? "guardian" : "teacher",
        scope_kind: guardian ? "linked_students" as const : "workspace" as const,
      },
      status: "active" as const,
      scope_epoch: 1,
      permissions: role.permissions,
      ...(students ? { students } : {}),
    };
  });
  return {
    token: "fixture-token",
    user,
    activeMembershipId,
    guardianAccount: memberships.some((membership) => membership.role.scope_kind === "linked_students"),
    me: { user, active_membership_id: activeMembershipId, memberships },
  };
}

function seedRole(memberId: string): void {
  const state = createSeed();
  replaceStore(state);
  authFixture.session = sessionFor(state, [memberId], memberId);
}

function clearRoleFixture(): void {
  authFixture.session = null;
}

afterEach(clearRoleFixture);

/** Đường dẫn cuối cùng sau khi router chạy xong loader chuyển hướng. */
async function finalPath(entry: string, expected: string): Promise<string> {
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  await vi.waitFor(() => expect(router.state.location.pathname).toBe(expected));
  const path = router.state.location.pathname;
  router.dispose();
  return path;
}

describe("chuyển hướng theo vai trò đang dùng", () => {
  it("trang đầu theo loại vai trò: phụ huynh /ph, nhân sự /lop", () => {
    expect(landingPathFor("guardian")).toBe("/ph");
    expect(landingPathFor("staff")).toBe("/lop");
    seedRole(MEMBER_IDS.lanGuardian);
    expect(roleLandingPath()).toBe("/ph");
    seedRole(MEMBER_IDS.lanAdmin);
    expect(roleLandingPath()).toBe("/lop");
  });

  it("phụ huynh vào tuyến nhân sự thì về /ph", async () => {
    seedRole(MEMBER_IDS.lanGuardian);
    expect(await finalPath("/lop", "/ph")).toBe("/ph");
    expect(await finalPath("/lop/6a/buoi-hoc/6a-session-7", "/ph")).toBe("/ph");
    expect(await finalPath("/lich", "/ph")).toBe("/ph");
    expect(await finalPath("/lop/6a/diem", "/ph")).toBe("/ph");
      expect(await finalPath("/ph/diem-danh", "/ph")).toBe("/ph");
      expect(await finalPath("/ph/lich", "/ph/lich")).toBe("/ph/lich");
    expect(await finalPath("/ph/diem-so", "/ph/diem")).toBe("/ph/diem");
    expect(await finalPath("/ph/btvn", "/ph")).toBe("/ph");
    expect(await finalPath("/ph/nhan-xet/6a-session-7", "/ph/buoi/6a-session-7")).toBe("/ph/buoi/6a-session-7");
    expect(await finalPath("/ph/btvn/6a-session-7", "/ph/buoi/6a-session-7")).toBe("/ph/buoi/6a-session-7");
  });

  it("nhân sự vào /ph thì về /lop", async () => {
    seedRole(MEMBER_IDS.lanAdmin);
    expect(await finalPath("/ph", "/lop")).toBe("/lop");
    expect(await finalPath("/ph/btvn/6a-session-7", "/lop")).toBe("/lop");
    expect(await finalPath("/ph/bao-cao", "/lop")).toBe("/lop");
  });

  it("đường dẫn không tồn tại hiện màn không tìm thấy", async () => {
    seedRole(MEMBER_IDS.lanGuardian);
    const router = createMemoryRouter(routes, { initialEntries: ["/khong-co-trang-nay"] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByRole("heading", { name: "Không tìm thấy màn hình" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/khong-co-trang-nay");
    router.dispose();
  });
});

describe("màn chọn vai trò", () => {
  it("hiện đúng membership active và tên con lấy từ students của membership", () => {
    const state = createSeed();
    replaceStore({ ...state, activeMemberId: null });
    authFixture.session = sessionFor(state, [MEMBER_IDS.lanTeacher, MEMBER_IDS.lanGuardian], null);
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <RolePickerPage />
      </MemoryRouter>,
    );
    expect(html).toContain("Chọn vai trò");
    expect(html).toContain(">Giáo viên<");
    expect(html).toContain(">Phụ huynh<");
    expect(html).toContain("Bé Gia Bảo");
    expect(html).not.toContain(">Admin<");
  });
});

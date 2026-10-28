import { redirect, type RouteObject } from "react-router-dom";
import { initializeSession, getSession } from "../../data/auth/session";
/** Auth/settings stay separate lazy chunks from the staff and guardian apps. */
export const accountRoutes: RouteObject[] = [
  { path: "/dang-nhap", lazy: async () => ({ Component: (await import("../../features/auth/LoginPage")).default }) },
  { path: "/dang-ky", lazy: async () => ({ Component: (await import("../../features/auth/RegisterPage")).default }) },
  { path: "/quen-mat-khau", lazy: async () => ({ Component: (await import("../../features/auth/ForgotPasswordPage")).default }) },
  { path: "/chon-vai-tro", lazy: async () => ({ Component: (await import("../../features/auth/RolePickerPage")).default }) },
  {
    lazy: () => import("./AccountShell"),
    loader: async () => {
      await initializeSession();
      const session = getSession();
      if (!session) throw redirect("/dang-nhap");
      const activeMembership = session.me.memberships.find(
        (membership) =>
          membership.id === session.activeMembershipId &&
          membership.status === "active",
      );
      if (
        !activeMembership &&
        !session.guardianAccount &&
        session.me.memberships.some((membership) => membership.status === "active")
      ) {
        throw redirect("/chon-vai-tro");
      }
      if (!activeMembership && !session.guardianAccount) {
        throw redirect("/dang-nhap");
      }
      return null;
    },
    children: [
      { path: "/cai-dat", lazy: async () => ({ Component: (await import("../../features/settings/SettingsPage")).default }) },
      { path: "/cai-dat/nhan-su", lazy: async () => ({ Component: (await import("../../features/staff/StaffPage")).default }) },
      { path: "/cai-dat/doi-mat-khau", lazy: async () => ({ Component: (await import("../../features/settings/ChangePasswordPage")).default }) },
    ],
  },
];

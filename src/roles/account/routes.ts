import type { RouteObject } from "react-router-dom";
/** Auth/settings stay separate lazy chunks from the staff and guardian apps. */
export const accountRoutes: RouteObject[] = [
  { path: "/dang-nhap", lazy: async () => ({ Component: (await import("../../features/auth/LoginPage")).default }) },
  { path: "/dang-ky", lazy: async () => ({ Component: (await import("../../features/auth/RegisterPage")).default }) },
  { path: "/quen-mat-khau", lazy: async () => ({ Component: (await import("../../features/auth/ForgotPasswordPage")).default }) },
  { path: "/chon-vai-tro", lazy: async () => ({ Component: (await import("../../features/auth/RolePickerPage")).default }) },
  {
    lazy: () => import("../staff/StaffShell"),
    children: [
      { path: "/cai-dat", lazy: async () => ({ Component: (await import("../../features/settings/SettingsPage")).default }) },
      { path: "/cai-dat/doi-mat-khau", lazy: async () => ({ Component: (await import("../../features/settings/ChangePasswordPage")).default }) },
    ],
  },
];

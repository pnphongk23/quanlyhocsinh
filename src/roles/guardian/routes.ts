import type { RouteObject } from "react-router-dom";

/** Màn phụ huynh được tải lười, tách khỏi chunk nhân sự. */
export const guardianRoutes: RouteObject[] = [
  {
    path: "/ph",
    lazy: () => import("./GuardianShell"),
    children: [
      { index: true, lazy: async () => ({ Component: (await import("./GuardianOverviewPage")).default }) },
      { path: "diem-danh", lazy: async () => ({ Component: (await import("./GuardianAttendancePage")).default }) },
      { path: "diem-so", lazy: async () => ({ Component: (await import("./GuardianScoresPage")).default }) },
      { path: "nhan-xet", lazy: async () => ({ Component: (await import("./GuardianCommentsPage")).default }) },
      { path: "nhan-xet/:sessionId", lazy: async () => ({ Component: (await import("./GuardianTicketPage")).default }), handle: { detail: true } },
      { path: "btvn", lazy: async () => ({ Component: (await import("./GuardianHomeworkPage")).default }) },
      { path: "btvn/:sessionId", lazy: async () => ({ Component: (await import("./GuardianHomeworkPage")).default }), handle: { detail: true } },
      { path: "bao-cao", lazy: async () => ({ Component: (await import("./GuardianReportPage")).default }) },
    ],
  },
];

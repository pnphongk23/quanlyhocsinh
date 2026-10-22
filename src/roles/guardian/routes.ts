import { redirect, type RouteObject } from "react-router-dom";

/** Màn phụ huynh được tải lười, tách khỏi chunk nhân sự. */
export const guardianRoutes: RouteObject[] = [
  {
    path: "/ph",
    lazy: async () => ({ Component: (await import("./GuardianShell")).default }),
    children: [
      { index: true, lazy: async () => ({ Component: (await import("./GuardianClassPage")).default }) },
      { path: "nhan-xet", lazy: async () => ({ Component: (await import("./GuardianCommentsPage")).default }) },
      { path: "buoi/:sessionId", lazy: async () => ({ Component: (await import("./GuardianSessionPage")).default }), handle: { detail: true } },
      { path: "diem", lazy: async () => ({ Component: (await import("./GuardianScoresPage")).default }) },
      { path: "bao-cao", lazy: async () => ({ Component: (await import("./GuardianReportPage")).default }) },
      { path: "diem-danh", Component: () => null, loader: () => redirect("/ph") },
      { path: "diem-so", Component: () => null, loader: () => redirect("/ph/diem") },
      { path: "btvn", Component: () => null, loader: () => redirect("/ph") },
      { path: "nhan-xet/:sessionId", Component: () => null, loader: ({ params }) => redirect(`/ph/buoi/${params.sessionId}`) },
      { path: "btvn/:sessionId", Component: () => null, loader: ({ params }) => redirect(`/ph/buoi/${params.sessionId}`) },
    ],
  },
];

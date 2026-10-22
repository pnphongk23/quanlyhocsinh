import type { RouteObject } from "react-router-dom";
import { redirect } from "react-router-dom";
/** Keep staff feature pages lazy, including desktop scores/reports. */
export const staffRoutes: RouteObject[] = [{
  lazy: () => import("./StaffShell"),
  children: [
      { path: "/lop", lazy: async () => ({ Component: (await import("../../features/classes/ClassListPage")).default }) },
      { path: "/lop/moi", lazy: async () => ({ Component: (await import("../../features/classes/NewClassPage")).default }) },
      { path: "/lop/:classId", lazy: async () => ({ Component: (await import("../../features/class-space/ClassSpaceLayout")).default }), children: [
        { index: true, loader: ({ params }) => redirect(`/lop/${params.classId}/buoi-hoc`) },
        { path: "buoi-hoc", lazy: async () => ({ Component: (await import("../../features/class-space/SessionsTab")).default }) },
        { path: "buoi-hoc/:sessionId", lazy: async () => ({ Component: (await import("../../features/class-space/SessionDetailPage")).default }), handle: { detail: true } },
        { path: "bai-kiem-tra", lazy: async () => ({ Component: (await import("../../features/class-space/TestsTab")).default }) },
        { path: "bai-kiem-tra/moi", lazy: async () => ({ Component: (await import("../../features/scores/NewTestPage")).default }), handle: { detail: true } },
        { path: "bai-kiem-tra/:testId", lazy: async () => ({ Component: (await import("../../features/scores/TestScoresPage")).default }), handle: { detail: true } },
        { path: "diem", lazy: async () => ({ Component: (await import("../../features/class-space/ScoreGridTab")).default }) },
        { path: "hoc-sinh", lazy: async () => ({ Component: (await import("../../features/students/StudentsPage")).default }) },
        { path: "bao-cao", lazy: async () => ({ Component: (await import("../../features/reports/ReportsPage")).default }) },
    ] },
    { path: "/lop/:classId/diem-danh", loader: ({ params }) => redirect(`/lop/${params.classId}/buoi-hoc`) },
    { path: "/lop/:classId/nhan-xet", loader: ({ params }) => redirect(`/lop/${params.classId}/buoi-hoc`) },
    { path: "/lop/:classId/diem/bai-moi", loader: ({ params }) => redirect(`/lop/${params.classId}/bai-kiem-tra/moi`) },
      { path: "/lich", lazy: async () => ({ Component: (await import("../../features/schedule/SchedulePage")).default }) },
  ],
}];

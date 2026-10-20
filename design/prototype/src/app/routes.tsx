import { lazy, Suspense, useEffect } from "react";
import {
  Navigate,
  Outlet,
  redirect,
  useRouteError,
  useLocation,
} from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { getAuthSession } from "../data/repositories/auth";
import { useStore } from "../data/store";
import TeacherShell from "./TeacherShell";
import { Spinner } from "../shared/ui";
import { features } from "../shared/features";
import RedirectTo from "./RedirectTo";
import {
  activeRoleIsGuardian,
  roleLandingPath,
} from "../roles/guardian/roleLanding";
const LoginPage = lazy(() => import("../features/auth/LoginPage"));
const RolePickerPage = lazy(() => import("../features/auth/RolePickerPage"));
const ClassListPage = lazy(() => import("../features/classes/ClassListPage"));
const NewClassPage = lazy(() => import("../features/classes/NewClassPage"));
const ClassSpaceLayout = lazy(
  () => import("../features/class-space/ClassSpaceLayout"),
);
const SessionsTab = lazy(
  () => import("../features/class-space/SessionsTab"),
);
const SessionDetailPage = lazy(
  () => import("../features/class-space/SessionDetailPage"),
);
const TestsTab = lazy(() => import("../features/class-space/TestsTab"));
const TestScoresPage = lazy(
  () => import("../features/scores/TestScoresPage"),
);
const ScoreGridTab = lazy(
  () => import("../features/class-space/ScoreGridTab"),
);
const StudentsPage = lazy(() => import("../features/students/StudentsPage"));
const ReportsPage = lazy(() => import("../features/reports/ReportsPage"));
const NewTestPage = lazy(() => import("../features/scores/NewTestPage"));
const SchedulePage = lazy(() => import("../features/schedule/SchedulePage"));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage"));
const LibraryPage = lazy(() => import("../features/lectures/LibraryPage"));
const LectureEditorPage = lazy(
  () => import("../features/lectures/LectureEditorPage"),
);
const LectureDetailPage = lazy(
  () => import("../features/lectures/LectureDetailPage"),
);
const MembersPage = lazy(() => import("../features/staff/MembersPage"));
const InvitePage = lazy(() => import("../features/staff/InvitePage"));
const MemberDetailPage = lazy(
  () => import("../features/staff/MemberDetailPage"),
);
const RolesPage = lazy(() => import("../features/staff/RolesPage"));
const RoleEditorPage = lazy(
  () => import("../features/staff/RoleEditorPage"),
);
const AssignmentsPage = lazy(
  () => import("../features/staffing/AssignmentsPage"),
);
const TeachingSchedulePage = lazy(
  () => import("../features/staffing/TeachingSchedulePage"),
);
const PayrollPage = lazy(() => import("../features/payroll/PayrollPage"));
const PayrollDetailPage = lazy(
  () => import("../features/payroll/PayrollDetailPage"),
);
const TuitionPage = lazy(() => import("../features/tuition/TuitionPage"));
const TuitionDetailPage = lazy(
  () => import("../features/tuition/TuitionDetailPage"),
);
const ScoreReportPage = lazy(
  () => import("../features/scores/ScoreReportPage"),
);
const StudentScoreReportPage = lazy(
  () => import("../features/scores/StudentScoreReportPage"),
);

/** Màn phụ huynh tách chunk riêng để phụ huynh không tải mã của nhân sự. */
const GuardianShell = lazy(
  () => import("../roles/guardian/GuardianShell"),
);
const GuardianOverviewPage = lazy(
  () => import("../roles/guardian/GuardianOverviewPage"),
);
const GuardianAttendancePage = lazy(
  () => import("../roles/guardian/GuardianAttendancePage"),
);
const GuardianScoresPage = lazy(
  () => import("../roles/guardian/GuardianScoresPage"),
);
const GuardianCommentsPage = lazy(
  () => import("../roles/guardian/GuardianCommentsPage"),
);
const GuardianTicketPage = lazy(
  () => import("../roles/guardian/GuardianTicketPage"),
);
const GuardianHomeworkPage = lazy(
  () => import("../roles/guardian/GuardianHomeworkPage"),
);
const GuardianReportPage = lazy(
  () => import("../roles/guardian/GuardianReportPage"),
);

/**
 * Chặn chéo hai khu vực bằng loader (chạy trước khi render nên kiểm chứng được
 * bằng createMemoryRouter): vai trò phụ huynh vào tuyến nhân sự thì về /ph,
 * vai trò nhân sự vào /ph thì về /lop.
 */
const staffOnlyLoader = () => (activeRoleIsGuardian() ? redirect("/ph") : null);
const guardianOnlyLoader = () =>
  activeRoleIsGuardian() ? null : redirect("/lop");
/** "*" và trang đầu: phụ huynh về /ph, nhân sự về /lop. */
const homeLoader = () => redirect(roleLandingPath());

/**
 * Lối vào Lương: cờ tắt thì mọi đường dẫn `/luong*` chuyển về trang chính.
 * Dùng loader (không dùng <Navigate>) để chuyển hướng xảy ra trước khi render,
 * nhờ vậy route được kiểm chứng bằng createMemoryRouter trong test.
 */
const payrollRoutes: RouteObject[] = features.payroll
  ? [
      { path: "/luong", element: <PayrollPage /> },
      { path: "/luong/:memberId", element: <PayrollDetailPage /> },
    ]
  : [
      { path: "/luong", loader: () => redirect("/lop") },
      { path: "/luong/*", loader: () => redirect("/lop") },
    ];

function Guard() {
  useStore();
  return getAuthSession() ? <Outlet /> : <Navigate to="/dang-nhap" replace />;
}

/**
 * Chặn khi vai trò đang dùng bị thu hồi (thành viên bị vô hiệu hoá hoặc không
 * còn). Người dùng buộc chọn lại vai trò trước khi xem bất kỳ dữ liệu nào.
 */
function RoleGuard() {
  const state = useStore();
  const memberIds = state.auth?.memberIds ?? [];
  const active = state.members.find(
    (member) =>
      memberIds.includes(member.id) && member.id === state.activeMemberId,
  );
  if (!active || active.status === "disabled")
    return <Navigate to="/chon-vai-tro" replace />;
  return <Outlet />;
}

function Loading() {
  const { pathname } = useLocation();
  useEffect(() => {
    const titles: Array<[RegExp, string]> = [
      [/^\/ph\/nhan-xet\/[^/]+$/, "Phiếu buổi học"],
      [/^\/ph\/nhan-xet$/, "Nhận xét"],
      [/^\/ph\/btvn\/[^/]+$/, "Bài tập về nhà"],
      [/^\/ph\/btvn$/, "Bài tập về nhà"],
      [/^\/ph\/diem-danh$/, "Điểm danh"],
      [/^\/ph\/diem-so$/, "Điểm số"],
      [/^\/ph\/bao-cao$/, "Báo cáo tháng"],
      [/^\/ph$/, "Tổng quan"],
      [/^\/dang-nhap$/, "Đăng nhập"],
      [/^\/chon-vai-tro$/, "Chọn vai trò"],
      [/^\/bai-giang\/moi$/, "Soạn bài giảng"],
      [/^\/bai-giang\/[^/]+\/sua$/, "Sửa bài giảng"],
      [/^\/bai-giang\/[^/]+$/, "Chi tiết bài giảng"],
      [/^\/bai-giang$/, "Bài giảng"],
      [/^\/nhan-su\/moi$/, "Mời nhân sự"],
      [/^\/nhan-su\/[^/]+$/, "Chi tiết nhân sự"],
      [/^\/nhan-su$/, "Nhân sự"],
      [/^\/phan-cong$/, "Phân công giảng dạy"],
      [/^\/luong\/[^/]+$/, "Chi tiết lương"],
      [/^\/luong$/, "Lương"],
      [/^\/hoc-phi\/[^/]+$/, "Phiếu học phí"],
      [/^\/hoc-phi$/, "Học phí"],
      [/^\/vai-tro\/moi$/, "Tạo vai trò"],
      [/^\/vai-tro\/[^/]+$/, "Sửa vai trò"],
      [/^\/vai-tro$/, "Vai trò"],
      [/^\/lop\/moi$/, "Tạo lớp mới"],
      [/^\/lop\/[^/]+\/buoi-hoc\/[^/]+$/, "Chi tiết buổi học"],
      [/^\/lop\/[^/]+\/buoi-hoc$/, "Buổi học"],
      [/^\/lop\/[^/]+\/bai-kiem-tra\/moi$/, "Tạo bài kiểm tra"],
      [/^\/lop\/[^/]+\/bai-kiem-tra\/[^/]+$/, "Bảng điểm bài kiểm tra"],
      [/^\/lop\/[^/]+\/bai-kiem-tra$/, "Bài kiểm tra"],
      [/^\/lop\/[^/]+\/diem$/, "Điểm"],
      [/^\/lop\/[^/]+\/hoc-sinh$/, "Học sinh"],
      [/^\/lop\/[^/]+\/bao-cao-diem\/[^/]+$/, "Báo cáo điểm học viên"],
      [/^\/lop\/[^/]+\/bao-cao-diem$/, "Báo cáo điểm"],
      [/^\/lop\/[^/]+\/bao-cao$/, "Báo cáo"],
      [/^\/lop$/, "Lớp của tôi"],
      [/^\/lich-day$/, "Lịch dạy"],
      [/^\/lich$/, "Lịch"],
      [/^\/cai-dat$/, "Cài đặt"],
    ];
    document.title =
      titles.find(([route]) => route.test(pathname))?.[1] ?? "Quản lý lớp";
  }, [pathname]);
  return (
    <Suspense fallback={<Spinner />}>
      <Outlet />
    </Suspense>
  );
}
function RouteError() {
  useRouteError();
  return (
    <main>
      <h1>Không thể mở màn hình</h1>
      <p>Vui lòng tải lại hoặc quay về lớp.</p>
      <a href="/lop">Về danh sách lớp</a>
    </main>
  );
}
export const routes: RouteObject[] = [
  {
    element: <Loading />,
    errorElement: <RouteError />,
    children: [
      { path: "/dang-nhap", element: <LoginPage /> },
      {
        element: <Guard />,
        children: [
          { path: "/chon-vai-tro", element: <RolePickerPage /> },
          {
            element: <RoleGuard />,
            children: [
              {
                loader: staffOnlyLoader,
                element: <TeacherShell />,
                children: [
                  { path: "/lop", element: <ClassListPage /> },
                  { path: "/lop/moi", element: <NewClassPage /> },
                  {
                    path: "/lop/:classId",
                    element: <ClassSpaceLayout />,
                    children: [
                      {
                        index: true,
                        element: <Navigate to="buoi-hoc" replace />,
                      },
                      { path: "buoi-hoc", element: <SessionsTab /> },
                      {
                        path: "buoi-hoc/:sessionId",
                        element: <SessionDetailPage />,
                        handle: { detail: true },
                      },
                      { path: "bai-kiem-tra", element: <TestsTab /> },
                      {
                        path: "bai-kiem-tra/moi",
                        element: <NewTestPage />,
                        handle: { detail: true },
                      },
                      {
                        path: "bai-kiem-tra/:testId",
                        element: <TestScoresPage />,
                        handle: { detail: true },
                      },
                      { path: "diem", element: <ScoreGridTab /> },
                      { path: "hoc-sinh", element: <StudentsPage /> },
                      { path: "bao-cao", element: <ReportsPage /> },
                      { path: "bao-cao-diem", element: <ScoreReportPage />, handle: { detail: true } },
                      {
                        path: "bao-cao-diem/:studentId",
                        element: <StudentScoreReportPage />,
                        handle: { detail: true },
                      },
                    ],
                  },
                  {
                    path: "/lop/:classId/diem-danh",
                    element: (
                      <RedirectTo
                        to={(params) => `/lop/${params.classId}/buoi-hoc`}
                      />
                    ),
                  },
                  {
                    path: "/lop/:classId/nhan-xet",
                    element: (
                      <RedirectTo
                        to={(params) => `/lop/${params.classId}/buoi-hoc`}
                      />
                    ),
                  },
                  {
                    path: "/lop/:classId/diem/bai-moi",
                    element: (
                      <RedirectTo
                        to={(params) => `/lop/${params.classId}/bai-kiem-tra/moi`}
                      />
                    ),
                  },
                  { path: "/bai-giang", element: <LibraryPage /> },
                  { path: "/bai-giang/moi", element: <LectureEditorPage /> },
                  {
                    path: "/bai-giang/:lectureId",
                    element: <LectureDetailPage />,
                  },
                  {
                    path: "/bai-giang/:lectureId/sua",
                    element: <LectureEditorPage />,
                  },
                  { path: "/nhan-su", element: <MembersPage /> },
                  { path: "/nhan-su/moi", element: <InvitePage /> },
                  { path: "/nhan-su/:memberId", element: <MemberDetailPage /> },
                  { path: "/phan-cong", element: <AssignmentsPage /> },
                  { path: "/lich-day", element: <TeachingSchedulePage /> },
                  ...payrollRoutes,
                  { path: "/hoc-phi", element: <TuitionPage /> },
                  { path: "/hoc-phi/:studentId", element: <TuitionDetailPage /> },
                  { path: "/vai-tro", element: <RolesPage /> },
                  { path: "/vai-tro/moi", element: <RoleEditorPage /> },
                  { path: "/vai-tro/:roleId", element: <RoleEditorPage /> },
                  { path: "/lich", element: <SchedulePage /> },
                  { path: "/cai-dat", element: <SettingsPage /> },
                ],
              },
              {
                path: "/ph",
                loader: guardianOnlyLoader,
                element: <GuardianShell />,
                children: [
                  { index: true, element: <GuardianOverviewPage /> },
                  {
                    path: "diem-danh",
                    element: <GuardianAttendancePage />,
                  },
                  { path: "diem-so", element: <GuardianScoresPage /> },
                  { path: "nhan-xet", element: <GuardianCommentsPage /> },
                  {
                    path: "nhan-xet/:sessionId",
                    element: <GuardianTicketPage />,
                    handle: { detail: true },
                  },
                  { path: "btvn", element: <GuardianHomeworkPage /> },
                  {
                    path: "btvn/:sessionId",
                    element: <GuardianHomeworkPage />,
                    handle: { detail: true },
                  },
                  { path: "bao-cao", element: <GuardianReportPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: "*", loader: homeLoader },
    ],
  },
];

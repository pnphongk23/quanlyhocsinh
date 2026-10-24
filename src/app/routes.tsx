import { Outlet, redirect, useRouteError } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { authRedirect } from "../data/auth";
import { getSession, initializeSession } from "../data/auth/session";
import { rootPathForSession } from "../features/auth/landingPath";
import { staffRoutes } from "../roles/staff/routes";
import { guardianRoutes } from "../roles/guardian/routes";
import { accountRoutes } from "../roles/account/routes";
import { PwaGuideGate } from "../features/pwa/PwaGuideGate";
import { StatusPage } from "./StatusPage";
function RootLayout() {
  return <PwaGuideGate><Outlet /></PwaGuideGate>;
}
function RouteError() {
  useRouteError();
  return <StatusPage title="Không thể mở màn hình" />;
}
export const routes: RouteObject[] = [{
      element: <RootLayout />, errorElement: <RouteError />, HydrateFallback: () => null,
  children: [
    { path: "/", loader: async () => {
      await initializeSession();
      const session = getSession();
      throw redirect(session ? rootPathForSession(session) : "/dang-nhap");
    } },
      ...guardRoutes(staffRoutes, "staff"), ...guardRoutes(guardianRoutes, "guardian"), ...accountRoutes,
    { path: "/dat-lai-mat-khau", lazy: async () => ({ Component: (await import("../features/auth/ResetPasswordPage")).default }) },
    { path: "*", element: <StatusPage title="Không tìm thấy màn hình" /> },
  ],
}];

function guardRoutes(routes: RouteObject[], role: "staff" | "guardian"): RouteObject[] {
  return routes.map((route) => ({ ...route, loader: async ({ request }) => {
    await initializeSession();
    const target = authRedirect(role);
    if (target) {
      const url = new URL(request.url);
      throw redirect(`${target}?next=${encodeURIComponent(url.pathname + url.search)}`);
    }
    return undefined;
  } }));
}

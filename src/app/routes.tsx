import { Outlet, redirect, useRouteError } from "react-router-dom";
import { useEffect } from "react";
import type { RouteObject } from "react-router-dom";
import { authRedirect } from "../data/auth";
import { getSession, initializeSession } from "../data/auth/session";
import { rootPathForSession } from "../features/auth/landingPath";
import { staffRoutes } from "../roles/staff/routes";
import { guardianRoutes } from "../roles/guardian/routes";
import { accountRoutes } from "../roles/account/routes";
import { PwaGuideGate } from "../features/pwa/PwaGuideGate";
import { StatusPage } from "./StatusPage";
import { clearChunkReloadAttempt, isChunkLoadError, reloadForChunkLoadError, CHUNK_RELOAD_KEY } from "./chunkRecovery";
function RootLayout() {
  useEffect(() => clearChunkReloadAttempt(sessionStorage), []);
  return <PwaGuideGate><Outlet /></PwaGuideGate>;
}
function RouteError() {
  const error = useRouteError();
  const chunkError = isChunkLoadError(error);
  const retryUsed = chunkError && sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
  useEffect(() => {
    console.error(error);
    if (!chunkError) return;
    void reloadForChunkLoadError(error, {
      storage: sessionStorage,
      updateServiceWorker: async () => {
        const registration = await navigator.serviceWorker?.getRegistration();
        if (!registration) return;
        const activeBeforeUpdate = registration.active;
        const controllerBeforeUpdate = navigator.serviceWorker.controller;
        const controllerChanged = new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
        });
        await registration.update();
        const updateStarted = Boolean(registration.installing || registration.waiting || registration.active !== activeBeforeUpdate);
        if (updateStarted && navigator.serviceWorker.controller === controllerBeforeUpdate) {
          await Promise.race([controllerChanged, new Promise<void>((resolve) => window.setTimeout(resolve, 1500))]);
        }
      },
      reload: () => window.location.reload(),
    });
  }, [chunkError, error]);
  return <StatusPage title="Không thể mở màn hình" onReload={retryUsed ? () => window.location.reload() : undefined} />;
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

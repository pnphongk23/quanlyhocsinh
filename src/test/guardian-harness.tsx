import React from "react";
import "../shared/styles/tokens.css";
import "../shared/styles/reset.css";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import RegisterPage from "../features/auth/RegisterPage";
import SettingsPage from "../features/settings/SettingsPage";
import { createSeed } from "./fixtures/seed";
import { replaceStore } from "../data/store";
import type { StoreState } from "../data/types";
import GuardianAttendancePage from "../roles/guardian/GuardianAttendancePage";
import GuardianCommentsPage from "../roles/guardian/GuardianCommentsPage";
import GuardianHomeworkPage from "../roles/guardian/GuardianHomeworkPage";
import GuardianOverviewPage from "../roles/guardian/GuardianOverviewPage";
import GuardianReportPage from "../roles/guardian/GuardianReportPage";
import GuardianScoresPage from "../roles/guardian/GuardianScoresPage";
import GuardianTicketPage from "../roles/guardian/GuardianTicketPage";
import { Component as GuardianShell } from "../roles/guardian/GuardianShell";

const seed = createSeed() as StoreState;
replaceStore({ ...seed, reportPublications: [] });

const routes = [
  {
    path: "/ph",
    Component: GuardianShell,
    children: [
      { index: true, Component: GuardianOverviewPage },
      { path: "diem-danh", Component: GuardianAttendancePage },
      { path: "diem-so", Component: GuardianScoresPage },
      { path: "nhan-xet", Component: GuardianCommentsPage },
      { path: "nhan-xet/:sessionId", Component: GuardianTicketPage },
      { path: "btvn", Component: GuardianHomeworkPage },
      { path: "btvn/:sessionId", Component: GuardianHomeworkPage },
      { path: "bao-cao", Component: GuardianReportPage },
    ],
  },
  { path: "/cai-dat", Component: SettingsPage },
  { path: "/dang-ky", Component: RegisterPage },
];

const path = new URLSearchParams(window.location.search).get("route") ?? "/ph";
const router = createMemoryRouter(routes, { initialEntries: [path] });
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
